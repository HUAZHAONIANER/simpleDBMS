import { Index, PageId, PageType, RowId } from "../core/types";
import { PageManager } from "../page/PageManager";

enum NodeType {
  INTERNAL = "INTERNAL", // 内部节点
  LEAF = "LEAF", // 叶子节点
}

const DEGREE = 128; // B+树的度，每个节点最多有 2*DEGREE 个键
const MAX_KEYS = 2 * DEGREE - 1;
const MIN_KEYS = DEGREE - 1;

class BPlusNode {
  public pageId: PageId;
  public nodeType: NodeType;
  public keys: any[] = [];
  public children: PageId[] = [];
  public rowIds: RowId[][] = [];
  public nextLeaf: PageId | undefined;
  public prevLeaf: PageId | undefined;
  public parent: PageId | undefined;
  public keyCount: number = 0;

  constructor(pageId: PageId, nodeType: NodeType) {
    this.pageId = pageId;
    this.nodeType = nodeType;
  }

  isLeaf(): boolean {
    return this.nodeType === NodeType.LEAF;
  }

  isFull(): boolean {
    return this.keyCount >= MAX_KEYS;
  }

  isUnderflow(): boolean {
    return this.keyCount < MIN_KEYS;
  }
}

export class BPlusTree implements Index {
  private rootPageId: PageId;
  private pageManager: PageManager;
  private nodeStore: Map<PageId, BPlusNode>;

  constructor(
    pageManager: PageManager,
    _tableName: string,
    _indexName: string,
    _columns: string[]
  ) {
    this.pageManager = pageManager;
    this.rootPageId = 0; // 初始化为0，后续会设置
    this.nodeStore = new Map();
  }

  async initialize(): Promise<void> {
    if (this.rootPageId === 0) {
      const rootPage = await this.pageManager.allocatePage(PageType.INDEX_PAGE);
      const rootNode = new BPlusNode(rootPage.header.pageId, NodeType.LEAF);
      await this.saveNode(rootNode);
      this.rootPageId = rootPage.header.pageId;
      this.nodeStore.set(this.rootPageId, rootNode);
    }
  }

  async insert(key: any, rowId: RowId): Promise<void> {
    if (this.rootPageId === 0) {
      await this.initialize();
    }
    const rootNode = await this.loadNode(this.rootPageId);

    if (rootNode.isFull()) {
      // 根节点分裂，创建新的根节点
      const newRootPage = await this.pageManager.allocatePage(
        PageType.INDEX_PAGE
      );
      const newRoot = new BPlusNode(
        newRootPage.header.pageId,
        NodeType.INTERNAL
      );

      // 分裂旧根节点
      const [leftNode, rightNode, separatorKey] =
        await this.splitNode(rootNode);

      // 设置新根节点
      newRoot.keys = [separatorKey];
      newRoot.children = [leftNode.pageId, rightNode.pageId];
      newRoot.keyCount = 1;

      leftNode.parent = newRoot.pageId;
      rightNode.parent = newRoot.pageId;

      await this.saveNode(leftNode);
      await this.saveNode(rightNode);
      await this.saveNode(newRoot);

      this.rootPageId = newRoot.pageId;

      // 递归插入到新根节点
      await this.insertNonFull(newRoot, key, rowId);
    } else {
      await this.insertNonFull(rootNode, key, rowId);
    }
  }

  private async insertNonFull(
    node: BPlusNode,
    key: any,
    rowId: RowId
  ): Promise<void> {
    if (node.isLeaf()) {
      // 在叶子节点中插入
      const insertPos = this.findInsertPosition(node.keys, key);

      if (
        insertPos < node.keyCount &&
        this.compareKeys(node.keys[insertPos], key) === 0
      ) {
        // 键已存在，添加rowId到列表
        if (!node.rowIds[insertPos]) {
          node.rowIds[insertPos] = [];
        }
        node.rowIds[insertPos].push(rowId);
      } else {
        // 插入新键
        node.keys.splice(insertPos, 0, key);
        node.rowIds.splice(insertPos, 0, [rowId]);
        node.keyCount++;
      }

      await this.saveNode(node);
    } else {
      // 找到合适的子节点
      const childIndex = this.findChildIndex(node.keys, key);
      const childPageId = node.children[childIndex];
      if (childPageId === undefined) {
        throw new Error(`Child node not found at index ${childIndex}`);
      }
      const childNode = await this.loadNode(childPageId);

      if (childNode.isFull()) {
        // 子节点需要分裂
        const [leftNode, rightNode, separatorKey] =
          await this.splitNode(childNode);

        // 更新父节点
        node.keys.splice(childIndex, 0, separatorKey);
        node.children.splice(childIndex + 1, 0, rightNode.pageId);
        node.keyCount++;

        leftNode.parent = node.pageId;
        rightNode.parent = node.pageId;

        await this.saveNode(leftNode);
        await this.saveNode(rightNode);
        await this.saveNode(node);

        // 确定插入到哪个子节点
        const targetChildIndex =
          this.compareKeys(key, separatorKey) >= 0
            ? childIndex + 1
            : childIndex;
        const targetChildPageId = node.children[targetChildIndex];
        if (targetChildPageId === undefined) {
          throw new Error(
            `Target child node not found at index ${targetChildIndex}`
          );
        }
        const targetChild = await this.loadNode(targetChildPageId);
        await this.insertNonFull(targetChild, key, rowId);
      } else {
        await this.insertNonFull(childNode, key, rowId);
      }
    }
  }

  private async splitNode(
    node: BPlusNode
  ): Promise<[BPlusNode, BPlusNode, any]> {
    const midIndex = Math.floor(node.keyCount / 2);

    // 创建右兄弟节点
    const rightPage = await this.pageManager.allocatePage(PageType.INDEX_PAGE);
    const rightNode = new BPlusNode(rightPage.header.pageId, node.nodeType);

    if (node.isLeaf()) {
      // 分裂叶子节点
      rightNode.keys = node.keys.splice(midIndex);
      rightNode.rowIds = node.rowIds.splice(midIndex);
      rightNode.keyCount = rightNode.keys.length;
      node.keyCount = node.keys.length;

      // 更新链表指针
      rightNode.nextLeaf = node.nextLeaf;
      rightNode.prevLeaf = node.pageId;
      node.nextLeaf = rightNode.pageId;

      const separatorKey = rightNode.keys[0];
      return [node, rightNode, separatorKey];
    } else {
      // 分裂内部节点
      rightNode.keys = node.keys.splice(midIndex + 1);
      rightNode.children = node.children.splice(midIndex + 1);
      rightNode.keyCount = rightNode.keys.length;
      node.keyCount = node.keys.length;

      const separatorKey = node.keys.splice(midIndex, 1)[0];

      // 更新子节点的父指针
      for (const childId of rightNode.children) {
        const child = await this.loadNode(childId);
        child.parent = rightNode.pageId;
        await this.saveNode(child);
      }

      return [node, rightNode, separatorKey];
    }
  }

  async delete(key: any, rowId: RowId): Promise<void> {
    const rootNode = await this.loadNode(this.rootPageId);
    await this.deleteFromNode(rootNode, key, rowId);
  }

  private async deleteFromNode(
    node: BPlusNode,
    key: any,
    rowId: RowId
  ): Promise<boolean> {
    if (node.isLeaf()) {
      const keyIndex = this.findKeyIndex(node.keys, key);
      if (keyIndex >= 0) {
        const rowIdsArray = node.rowIds[keyIndex] || [];
        const rowIdIndex = rowIdsArray.indexOf(rowId);
        if (rowIdIndex >= 0) {
          rowIdsArray.splice(rowIdIndex, 1);

          if (rowIdsArray.length === 0) {
            // 删除整个键
            node.keys.splice(keyIndex, 1);
            node.rowIds.splice(keyIndex, 1);
            node.keyCount--;
          }

          await this.saveNode(node);
          return true;
        }
      }
      return false;
    } else {
      const childIndex = this.findChildIndex(node.keys, key);
      const childPageId = node.children[childIndex];
      if (childPageId === undefined) {
        throw new Error(`Child node not found at index ${childIndex}`);
      }
      const childNode = await this.loadNode(childPageId);
      const deleted = await this.deleteFromNode(childNode, key, rowId);

      if (deleted && childNode.isUnderflow()) {
        await this.handleUnderflow(node, childNode, childIndex);
      }

      return deleted;
    }
  }

  private async handleUnderflow(
    parent: BPlusNode,
    node: BPlusNode,
    nodeIndex: number
  ): Promise<void> {
    const leftSibling =
      nodeIndex > 0
        ? await this.loadNode(parent.children[nodeIndex - 1]!)
        : null;
    const rightSibling =
      nodeIndex < parent.children.length - 1
        ? await this.loadNode(parent.children[nodeIndex + 1]!)
        : null;

    if (leftSibling && leftSibling.keyCount > MIN_KEYS) {
      // 从左兄弟借
      await this.borrowFromLeft(parent, node, leftSibling, nodeIndex);
    } else if (rightSibling && rightSibling.keyCount > MIN_KEYS) {
      // 从右兄弟借
      await this.borrowFromRight(parent, node, rightSibling, nodeIndex);
    } else if (leftSibling) {
      // 与左兄弟合并
      await this.mergeWithLeft(parent, leftSibling, node, nodeIndex);
    } else if (rightSibling) {
      // 与右兄弟合并
      await this.mergeWithRight(parent, node, rightSibling, nodeIndex);
    }
  }

  private async borrowFromLeft(
    parent: BPlusNode,
    node: BPlusNode,
    leftSibling: BPlusNode,
    nodeIndex: number
  ): Promise<void> {
    // 实现借用逻辑
    const separatorKey = parent.keys[nodeIndex - 1];

    if (node.isLeaf()) {
      node.keys.unshift(leftSibling.keys.pop()!);
      node.rowIds.unshift(leftSibling.rowIds.pop()!);
      parent.keys[nodeIndex - 1] = node.keys[0];
    } else {
      node.keys.unshift(separatorKey);
      node.children.unshift(leftSibling.children.pop()!);
      parent.keys[nodeIndex - 1] = leftSibling.keys.pop()!;
    }

    node.keyCount++;
    leftSibling.keyCount--;

    await this.saveNode(leftSibling);
    await this.saveNode(node);
    await this.saveNode(parent);
  }

  private async borrowFromRight(
    parent: BPlusNode,
    node: BPlusNode,
    rightSibling: BPlusNode,
    nodeIndex: number
  ): Promise<void> {
    // 实现借用逻辑
    const separatorKey = parent.keys[nodeIndex];

    if (node.isLeaf()) {
      node.keys.push(rightSibling.keys.shift()!);
      node.rowIds.push(rightSibling.rowIds.shift()!);
      parent.keys[nodeIndex] = rightSibling.keys[0];
    } else {
      node.keys.push(separatorKey);
      node.children.push(rightSibling.children.shift()!);
      parent.keys[nodeIndex] = rightSibling.keys.shift()!;
    }

    node.keyCount++;
    rightSibling.keyCount--;

    await this.saveNode(rightSibling);
    await this.saveNode(node);
    await this.saveNode(parent);
  }

  private async mergeWithLeft(
    parent: BPlusNode,
    leftNode: BPlusNode,
    rightNode: BPlusNode,
    rightIndex: number
  ): Promise<void> {
    // 实现合并逻辑
    if (leftNode.isLeaf()) {
      leftNode.keys.push(...rightNode.keys);
      leftNode.rowIds.push(...rightNode.rowIds);
      leftNode.nextLeaf = rightNode.nextLeaf;
    } else {
      leftNode.keys.push(parent.keys[rightIndex - 1], ...rightNode.keys);
      leftNode.children.push(...rightNode.children);
    }

    leftNode.keyCount = leftNode.keys.length;

    // 更新父节点
    parent.keys.splice(rightIndex - 1, 1);
    parent.children.splice(rightIndex, 1);
    parent.keyCount--;

    // 释放右节点页面
    await this.pageManager.freePage(rightNode.pageId);

    await this.saveNode(leftNode);
    await this.saveNode(parent);
  }

  private async mergeWithRight(
    parent: BPlusNode,
    leftNode: BPlusNode,
    rightNode: BPlusNode,
    leftIndex: number
  ): Promise<void> {
    // 实现合并逻辑
    if (leftNode.isLeaf()) {
      leftNode.keys.push(...rightNode.keys);
      leftNode.rowIds.push(...rightNode.rowIds);
      leftNode.nextLeaf = rightNode.nextLeaf;
    } else {
      leftNode.keys.push(parent.keys[leftIndex], ...rightNode.keys);
      leftNode.children.push(...rightNode.children);
    }

    leftNode.keyCount = leftNode.keys.length;

    // 更新父节点
    parent.keys.splice(leftIndex, 1);
    parent.children.splice(leftIndex + 1, 1);
    parent.keyCount--;

    // 释放右节点页面
    await this.pageManager.freePage(rightNode.pageId);

    await this.saveNode(leftNode);
    await this.saveNode(parent);
  }

  async rangeScan(start: any, end: any): Promise<RowId[]> {
    const result: RowId[] = [];
    const startNode = await this.findLeafNode(start);

    let currentNode = startNode;
    let keyIndex = this.findKeyIndex(currentNode.keys, start);

    while (currentNode) {
      for (let i = keyIndex; i < currentNode.keyCount; i++) {
        const key = currentNode.keys[i];
        if (this.compareKeys(key, end) > 0) {
          return result;
        }

        const rowIdsArray = currentNode.rowIds[i] || [];
        result.push(...rowIdsArray);
      }

      if (currentNode.nextLeaf) {
        currentNode = await this.loadNode(currentNode.nextLeaf);
        keyIndex = 0;
      } else {
        break;
      }
    }

    return result;
  }

  async pointQuery(key: any): Promise<RowId[]> {
    const leafNode = await this.findLeafNode(key);
    const keyIndex = this.findKeyIndex(leafNode.keys, key);

    if (keyIndex >= 0) {
      return leafNode.rowIds[keyIndex] || [];
    }

    return [];
  }

  private async findLeafNode(key: any): Promise<BPlusNode> {
    let currentNode = await this.loadNode(this.rootPageId);

    while (!currentNode.isLeaf()) {
      const childIndex = this.findChildIndex(currentNode.keys, key);
      const nextChildPageId = currentNode.children[childIndex];
      if (nextChildPageId === undefined) {
        throw new Error(`Child node not found at index ${childIndex}`);
      }
      currentNode = await this.loadNode(nextChildPageId);
    }

    return currentNode;
  }

  private findInsertPosition(keys: any[], key: any): number {
    let left = 0;
    let right = keys.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.compareKeys(keys[mid], key) < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  private findKeyIndex(keys: any[], key: any): number {
    let left = 0;
    let right = keys.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = this.compareKeys(keys[mid], key);

      if (cmp === 0) {
        return mid;
      } else if (cmp < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return -1;
  }

  private findChildIndex(keys: any[], key: any): number {
    let left = 0;
    let right = keys.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.compareKeys(keys[mid], key) <= 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  private compareKeys(a: any, b: any): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  private async loadNode(pageId: PageId): Promise<BPlusNode> {
    const cached = this.nodeStore.get(pageId);
    if (cached) {
      return cached;
    }

    // 读取页面保持与PageManager的交互
    await this.pageManager.readPage(pageId);

    const node = new BPlusNode(pageId, NodeType.LEAF);
    this.nodeStore.set(pageId, node);
    return node;
  }

  private async saveNode(node: BPlusNode): Promise<void> {
    this.nodeStore.set(node.pageId, node);
    const page = await this.pageManager.readPage(node.pageId);
    await this.pageManager.writePage(page);
  }
}
