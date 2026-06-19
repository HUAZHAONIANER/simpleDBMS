import * as fs from "fs/promises";
import * as path from "path";
import { Page, PAGE_SIZE, PageHeader, PageId, PageType } from "../core/types";

export class PageManager {
  private dataFilePath: string;
  private freeListPath: string;
  private nextPageId: PageId = 1;
  private freePages: Set<PageId> = new Set();
  private initialized: boolean = false;

  constructor(dataDirectory: string, databaseName: string) {
    this.dataFilePath = path.join(dataDirectory, `${databaseName}.db`);
    this.freeListPath = path.join(dataDirectory, `${databaseName}.freelist`);
  }
  async initialize(): Promise<void> {
    try {
      // 检查数据目录是否存在
      const dir = path.dirname(this.dataFilePath);
      await fs.mkdir(dir, { recursive: true });

      // 检查数据文件是否存在
      try {
        await fs.access(this.dataFilePath);
        await this.loadFreeList();
        await this.loadNextPageId();
      } catch {
        // 文件不存在，创建新文件
        await this.createNewDatabase();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize PageManager: ${error}`);
    }
  }

  private async createNewDatabase(): Promise<void> {
    // 创建空的数据文件
    await fs.writeFile(this.dataFilePath, Buffer.alloc(0));

    // 初始化空闲列表
    await this.saveFreeList();

    this.nextPageId = 1;
  }

  private async loadFreeList(): Promise<void> {
    try {
      const data = await fs.readFile(this.freeListPath, "utf8");
      const pageIds = data
        .split(",")
        .filter((id) => id.trim())
        .map((id) => parseInt(id.trim()));
      this.freePages = new Set(pageIds);
    } catch {
      this.freePages = new Set();
    }
  }

  private async saveFreeList(): Promise<void> {
    const data = Array.from(this.freePages).join(",");
    await fs.writeFile(this.freeListPath, data);
  }

  private async loadNextPageId(): Promise<void> {
    try {
      const stats = await fs.stat(this.dataFilePath);
      this.nextPageId = Math.floor(stats.size / PAGE_SIZE) + 1;
    } catch {
      this.nextPageId = 1;
    }
  }

  async allocatePage(type: PageType): Promise<Page> {
    if (!this.initialized) {
      await this.initialize();
    }

    let pageId: PageId;

    // 优先使用空闲页面
    if (this.freePages.size > 0) {
      const freePageId = this.freePages.values().next().value;
      if (freePageId !== undefined) {
        pageId = freePageId;
        this.freePages.delete(pageId);
      } else {
        // 如果没有空闲页面，分配新页面ID
        pageId = this.nextPageId++;
      }
    } else {
      // 分配新页面ID
      pageId = this.nextPageId++;
    }

    // 创建页面头
    const header: PageHeader = {
      pageId,
      pageType: type,
      freeSpace: PAGE_SIZE - 32, // 减去头部大小
      recordCount: 0,
    };

    // 创建页面数据缓冲区
    const data = Buffer.alloc(PAGE_SIZE);

    // 写入页面头
    this.writePageHeader(data, header);

    const page: Page = { header, data };

    // 立即写入磁盘
    await this.writePage(page);

    return page;
  }

  /**
   * 读取页面
   */
  async readPage(pageId: PageId): Promise<Page> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const offset = (pageId - 1) * PAGE_SIZE;
      const buffer = Buffer.alloc(PAGE_SIZE);

      const fd = await fs.open(this.dataFilePath, "r");
      await fd.read(buffer, 0, PAGE_SIZE, offset);
      await fd.close();

      // 解析页面头
      const header = this.readPageHeader(buffer);

      return { header, data: buffer };
    } catch (error) {
      throw new Error(`Failed to read page ${pageId}: ${error}`);
    }
  }

  async writePage(page: Page): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 更新页面头
      this.writePageHeader(page.data, page.header);

      const offset = (page.header.pageId - 1) * PAGE_SIZE;

      // 确保文件足够大
      await this.ensureFileSize(offset + PAGE_SIZE);

      const fd = await fs.open(this.dataFilePath, "r+");
      await fd.write(page.data, 0, PAGE_SIZE, offset);
      await fd.close();
    } catch (error) {
      throw new Error(`Failed to write page ${page.header.pageId}: ${error}`);
    }
  }

  async freePage(pageId: PageId): Promise<void> {
    this.freePages.add(pageId);
    await this.saveFreeList();
  }

  private async ensureFileSize(size: number): Promise<void> {
    try {
      const stats = await fs.stat(this.dataFilePath);
      if (stats.size < size) {
        // 扩展文件
        const fd = await fs.open(this.dataFilePath, "r+");
        await fd.write(
          Buffer.alloc(size - stats.size),
          0,
          size - stats.size,
          stats.size
        );
        await fd.close();
      }
    } catch (error) {
      throw new Error(`Failed to ensure file size: ${error}`);
    }
  }

  private writePageHeader(buffer: Buffer, header: PageHeader): void {
    let offset = 0;

    // Page ID (4 bytes)
    buffer.writeUInt32LE(header.pageId, offset);
    offset += 4;

    // Page Type (1 byte)
    buffer.writeUInt8(this.encodePageType(header.pageType), offset);
    offset += 1;

    // Free Space (2 bytes)
    buffer.writeUInt16LE(header.freeSpace, offset);
    offset += 2;

    // Record Count (2 bytes)
    buffer.writeUInt16LE(header.recordCount, offset);
    offset += 2;

    // Next Page ID (4 bytes, 0 if none)
    buffer.writeUInt32LE(header.nextPage || 0, offset);
    offset += 4;

    // Previous Page ID (4 bytes, 0 if none)
    buffer.writeUInt32LE(header.prevPage || 0, offset);
    offset += 4;

    // Reserved (15 bytes for future use)
    buffer.fill(0, offset, offset + 15);
  }

  private readPageHeader(buffer: Buffer): PageHeader {
    let offset = 0;

    const pageId = buffer.readUInt32LE(offset);
    offset += 4;

    const pageType = this.decodePageType(buffer.readUInt8(offset));
    offset += 1;

    const freeSpace = buffer.readUInt16LE(offset);
    offset += 2;

    const recordCount = buffer.readUInt16LE(offset);
    offset += 2;

    const nextPage = buffer.readUInt32LE(offset);
    offset += 4;

    const prevPage = buffer.readUInt32LE(offset);
    offset += 4;

    return {
      pageId,
      pageType,
      freeSpace,
      recordCount,
      nextPage,
      prevPage,
    };
  }

  private encodePageType(type: PageType): number {
    switch (type) {
      case PageType.DATA_PAGE:
        return 1;
      case PageType.INDEX_PAGE:
        return 2;
      case PageType.OVERFLOW_PAGE:
        return 3;
      case PageType.FREE_PAGE:
        return 4;
      default:
        return 0;
    }
  }

  private decodePageType(code: number): PageType {
    switch (code) {
      case 1:
        return PageType.DATA_PAGE;
      case 2:
        return PageType.INDEX_PAGE;
      case 3:
        return PageType.OVERFLOW_PAGE;
      case 4:
        return PageType.FREE_PAGE;
      default:
        return PageType.DATA_PAGE;
    }
  }

  async getStats(): Promise<{
    totalPages: number;
    freePages: number;
    nextPageId: PageId;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stats = await fs.stat(this.dataFilePath);
      const totalPages = Math.ceil(stats.size / PAGE_SIZE);

      return {
        totalPages,
        freePages: this.freePages.size,
        nextPageId: this.nextPageId,
      };
    } catch {
      return {
        totalPages: 0,
        freePages: 0,
        nextPageId: 1,
      };
    }
  }

  async close(): Promise<void> {
    await this.saveFreeList();
  }
}
