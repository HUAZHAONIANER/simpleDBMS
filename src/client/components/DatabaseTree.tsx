import {
  ChevronDown,
  ChevronRight,
  Database,
  Edit,
  Eye,
  Folder,
  FolderOpen,
  Key,
  RefreshCw,
  Search,
  Table,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

export type TreeNodeType =
  | "database"
  | "table"
  | "view"
  | "index"
  | "column"
  | "folder";

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  children?: TreeNode[];
  parentId?: string;
  expanded?: boolean;
  icon?: React.ReactNode;
  metadata?: any;
}

interface DatabaseTreeProps {
  databases: TreeNode[];
  selectedNode?: string;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeExpand?: (nodeId: string) => void;
  onNodeCollapse?: (nodeId: string) => void;
  onRefresh?: (nodeId?: string) => void;
  onCreate?: (parentId: string, type: TreeNodeType) => void;
  onDelete?: (nodeId: string) => void;
  onRename?: (nodeId: string, newName: string) => void;
  className?: string;
}

export const DatabaseTree: React.FC<DatabaseTreeProps> = ({
  databases,
  selectedNode,
  onNodeSelect,
  onNodeExpand,
  onNodeCollapse,
  onRefresh,
  onCreate,
  onDelete,
  onRename,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string;
  }>({ visible: false, x: 0, y: 0, nodeId: "" });

  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const getNodeIcon = (
    type: TreeNodeType,
    expanded?: boolean
  ): React.ReactNode => {
    switch (type) {
      case "database":
        return <Database size={16} className="icon-database" />;
      case "table":
        return <Table size={16} className="icon-table" />;
      case "view":
        return <Eye size={16} className="icon-view" />;
      case "index":
        return <Key size={16} className="icon-index" />;
      case "column":
        return <div className="icon-column" />;
      case "folder":
        return expanded ? (
          <FolderOpen size={16} className="icon-folder" />
        ) : (
          <Folder size={16} className="icon-folder" />
        );
      default:
        return null;
    }
  };

  const handleNodeClick = useCallback(
    (node: TreeNode, event: React.MouseEvent) => {
      event.stopPropagation();

      if (node.children && node.children.length > 0) {
        // 展开/折叠节点
        if (node.expanded) {
          onNodeCollapse?.(node.id);
        } else {
          onNodeExpand?.(node.id);
        }
      }

      onNodeSelect?.(node);
    },
    [onNodeSelect, onNodeExpand, onNodeCollapse]
  );

  const handleContextMenu = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId,
      });
    },
    []
  );

  const handleRename = useCallback(
    (nodeId: string) => {
      const node = findNodeById(databases, nodeId);
      if (node) {
        setEditingNode(nodeId);
        setEditingValue(node.name);
      }
    },
    [databases]
  );

  const completeRename = useCallback(() => {
    if (editingNode && editingValue.trim()) {
      onRename?.(editingNode, editingValue.trim());
    }
    setEditingNode(null);
    setEditingValue("");
  }, [editingNode, editingValue, onRename]);

  const findNodeById = (
    nodes: TreeNode[],
    id: string
  ): TreeNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const filterNodes = useCallback(
    (nodes: TreeNode[], term: string): TreeNode[] => {
      if (!term.trim()) return nodes;

      const lowerTerm = term.toLowerCase();

      return nodes
        .filter((node) => {
          const matchesName = node.name.toLowerCase().includes(lowerTerm);
          const hasMatchingChildren =
            node.children && filterNodes(node.children, term).length > 0;

          return matchesName || hasMatchingChildren;
        })
        .map((node) => ({
          ...node,
          children: filterNodes(node.children || [], term),
          expanded: true,
        }));
    },
    []
  );

  const renderTreeNode = (
    node: TreeNode,
    level: number = 0
  ): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.expanded || false;
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;

    return (
      <div key={node.id} className="tree-node-container">
        <div
          className={`tree-node ${isSelected ? "selected" : ""} ${node.type}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleContextMenu(node.id, e)}
        >
          {/* 展开/折叠图标 */}
          <div className="tree-node-expander">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <div className="tree-node-spacer"></div>
            )}
          </div>

          {/* 节点图标 */}
          <div className="tree-node-icon">
            {getNodeIcon(node.type, isExpanded)}
          </div>

          {/* 节点名称 */}
          <div className="tree-node-content">
            {isEditing ? (
              <input
                type="text"
                className="tree-node-editor"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={completeRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") completeRename();
                  if (e.key === "Escape") {
                    setEditingNode(null);
                    setEditingValue("");
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-node-name" title={node.name}>
                {node.name}
              </span>
            )}
          </div>
        </div>

        {/* 渲染子节点 */}
        {hasChildren && isExpanded && (
          <div className="tree-node-children">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    const node = findNodeById(databases, contextMenu.nodeId);
    if (!node) return null;

    const menuItems = getContextMenuItems(node);

    return (
      <div
        className="context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
      >
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`context-menu-item ${item.disabled ? "disabled" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!item.disabled && item.onClick) {
                item.onClick();
              }
            }}
          >
            {item.icon && <span className="menu-item-icon">{item.icon}</span>}
            <span className="menu-item-text">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const getContextMenuItems = (node: TreeNode) => {
    const items: Array<{
      label: string;
      icon?: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }> = [];

    // 通用操作
    items.push(
      {
        label: "刷新",
        icon: <RefreshCw size={14} />,
        onClick: () => onRefresh?.(node.id),
      },
      {
        label: "重命名",
        icon: <Edit size={14} />,
        onClick: () => handleRename(node.id),
      }
    );

    // 类型特定操作
    switch (node.type) {
      case "database":
        items.push(
          {
            label: "新建表",
            icon: <Table size={14} />,
            onClick: () => onCreate?.(node.id, "table"),
          },
          {
            label: "新建视图",
            icon: <Eye size={14} />,
            onClick: () => onCreate?.(node.id, "view"),
          }
        );
        break;

      case "table":
        items.push(
          {
            label: "查看数据",
            icon: <Search size={14} />,
            onClick: () => onNodeSelect?.(node),
          },
          {
            label: "新建索引",
            icon: <Key size={14} />,
            onClick: () => onCreate?.(node.id, "index"),
          }
        );
        break;
    }

    // 删除操作
    if (node.type !== "database") {
      items.push({
        label: "删除",
        icon: <Trash2 size={14} />,
        onClick: () => {
          if (confirm(`确定要删除 ${node.name} 吗？`)) {
            onDelete?.(node.id);
          }
        },
      });
    }

    return items;
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredDatabases = filterNodes(databases, searchTerm);

  return (
    <div className={`database-tree-container ${className}`}>
      {/* 搜索框 */}
      <div className="tree-search-box">
        <Search size={16} />
        <input
          type="text"
          placeholder="搜索数据库对象..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="search-clear" onClick={() => setSearchTerm("")}>
            ×
          </button>
        )}
      </div>

      {/* 树内容 */}
      <div className="tree-content">
        {filteredDatabases.length === 0 ? (
          <div className="tree-empty">
            {searchTerm ? "未找到匹配的对象" : "暂无数据库对象"}
          </div>
        ) : (
          filteredDatabases.map((node) => renderTreeNode(node))
        )}
      </div>

      {/* 右键菜单 */}
      {renderContextMenu()}
    </div>
  );
};
