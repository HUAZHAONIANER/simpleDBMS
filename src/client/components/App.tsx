import {
  BarChart3,
  Code,
  Database,
  FileText,
  Menu,
  Settings,
  X,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import { Dashboard } from "./Dashboard";
import { DatabaseTree, TreeNode } from "./DatabaseTree";
import { ResultTable } from "./ResultTable";
import { SQLEditor } from "./SQLEditor";

interface AppState {
  currentView: "query" | "dashboard" | "settings";
  sidebarCollapsed: boolean;
  activeDatabase: string;
  activeTab: string;
  tabs: Array<{
    id: string;
    name: string;
    content: string;
    type: "sql" | "result" | "dashboard";
  }>;
  databases: TreeNode[];
  queryResult?: {
    columns: string[];
    rows: any[][];
    executionTime?: number;
    error?: string;
  };
  isLoading: boolean;
}

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentView: "query",
    sidebarCollapsed: false,
    activeDatabase: "default",
    activeTab: "query-1",
    tabs: [
      {
        id: "query-1",
        name: "查询1",
        content: "",
        type: "sql",
      },
    ],
    databases: [],
    isLoading: false,
  });

  const loadDatabases = useCallback(async () => {
    try {
      const response = await fetch("/api/database/list");
      const data = await response.json();

      if (response.ok) {
        // 转换为树节点格式
        const databases: TreeNode[] = data.databases.map(
          (db: string, index: number) => ({
            id: `db-${index}`,
            name: db,
            type: "database",
            expanded: true,
            children: [
              {
                id: `${db}-tables`,
                name: "表",
                type: "folder",
                expanded: false,
                children: [],
                parentId: `db-${index}`,
              },
              {
                id: `${db}-views`,
                name: "视图",
                type: "folder",
                expanded: false,
                children: [],
                parentId: `db-${index}`,
              },
              {
                id: `${db}-indexes`,
                name: "索引",
                type: "folder",
                expanded: false,
                children: [],
                parentId: `db-${index}`,
              },
            ],
          })
        );

        setState((prev) => ({
          ...prev,
          databases,
        }));
      }
    } catch (error) {
      console.error("加载数据库失败:", error);
    }
  }, []);

  const loadTables = useCallback(async (database: string, nodeId: string) => {
    try {
      const response = await fetch(
        `/api/table/list?database=${database}`
      );
      const data = await response.json();

      if (response.ok) {
        // 更新树节点
        setState((prev) => {
          const updateNode = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map((node) => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  children: data.tables.map((table: string) => ({
                    id: `${database}-table-${table}`,
                    name: table,
                    type: "table",
                    children: [],
                    parentId: nodeId,
                  })),
                  expanded: true,
                };
              }
              if (node.children) {
                return {
                  ...node,
                  children: updateNode(node.children),
                };
              }
              return node;
            });
          };

          return {
            ...prev,
            databases: updateNode(prev.databases),
          };
        });
      }
    } catch (error) {
      console.error("加载表失败:", error);
    }
  }, []);

  React.useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const switchView = useCallback((view: "query" | "dashboard" | "settings") => {
    setState((prev) => ({
      ...prev,
      currentView: view,
    }));
  }, []);

  const addTab = useCallback(
    (type: "sql" | "result" | "dashboard") => {
      const newTabId = `${type}-${Date.now()}`;
      const newTab = {
        id: newTabId,
        name:
          type === "sql"
            ? `查询${state.tabs.filter((t) => t.type === "sql").length + 1}`
            : type === "result"
              ? `结果${state.tabs.filter((t) => t.type === "result").length + 1}`
              : "仪表板",
        content: "",
        type,
      };

      setState((prev) => ({
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTab: newTabId,
      }));
    },
    [state.tabs]
  );

  const closeTab = useCallback((tabId: string) => {
    setState((prev) => {
      const newTabs = prev.tabs.filter((tab) => tab.id !== tabId);
      let newActiveTab = prev.activeTab;

      if (prev.activeTab === tabId && newTabs.length > 0) {
        const currentIndex = prev.tabs.findIndex((tab) => tab.id === tabId);
        const newIndex = Math.max(
          0,
          Math.min(currentIndex - 1, newTabs.length - 1)
        );
        const tab = newTabs[newIndex];
        newActiveTab = tab ? tab.id : newTabs[0] ? newTabs[0].id : "";
      }

      return {
        ...prev,
        tabs: newTabs,
        activeTab: newActiveTab,
      };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTab: tabId,
    }));
  }, []);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, content } : tab
      ),
    }));
  }, []);

  const executeQuery = useCallback(
    async (sql: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // 调用真实API执行SQL查询
        const response = await fetch(
          "/api/query/execute",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sql,
              database: state.activeDatabase,
            }),
          }
        );

        const apiResult = await response.json();

        if (apiResult.success) {
          setState((prev) => ({
            ...prev,
            queryResult: {
              columns: apiResult.result?.columns || [],
              rows: apiResult.result?.rows || [],
              executionTime: apiResult.executionTime || 0,
              error: apiResult.result?.error || "",
            },
            isLoading: false,
          }));

          // 添加结果标签页
          const resultTabId = `result-${Date.now()}`;
          setState((prev) => ({
            ...prev,
            tabs: [
              ...prev.tabs,
              {
                id: resultTabId,
                name: `结果${prev.tabs.filter((t) => t.type === "result").length + 1}`,
                content: "",
                type: "result",
              },
            ],
            activeTab: resultTabId,
          }));
        } else {
          // 处理API返回的错误
          setState((prev) => ({
            ...prev,
            queryResult: {
              columns: [],
              rows: [],
              error: apiResult.error?.message || "查询执行失败",
            },
            isLoading: false,
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          queryResult: {
            columns: [],
            rows: [],
            error: error instanceof Error ? error.message : "查询执行失败",
          },
          isLoading: false,
        }));
      }
    },
    [state.activeDatabase]
  );

  const handleNodeExpand = useCallback(
    (nodeId: string) => {
      // 查找节点
      const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
        for (const node of nodes) {
          if (node.id === nodeId) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      const node = findNode(state.databases);
      if (node && node.parentId) {
        const parentNode = findNode(state.databases);
        if (parentNode && parentNode.type === "database") {
          // 加载表列表
          loadTables(parentNode.name, nodeId);
        }
      }

      // 更新展开状态
      setState((prev) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((n) => {
            if (n.id === nodeId) {
              return { ...n, expanded: true };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        };

        return {
          ...prev,
          databases: updateNode(prev.databases),
        };
      });
    },
    [state.databases, loadTables]
  );

  const handleNodeCollapse = useCallback((nodeId: string) => {
    setState((prev) => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((n) => {
          if (n.id === nodeId) {
            return { ...n, expanded: false };
          }
          if (n.children) {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });
      };

      return {
        ...prev,
        databases: updateNode(prev.databases),
      };
    });
  }, []);

  const handleNodeSelect = useCallback(
    (node: TreeNode) => {
      if (node.type === "table") {
        const query = `SELECT * FROM ${node.name} LIMIT 100;`;
        updateTabContent(state.activeTab, query);
      }
    },
    [state.activeTab, updateTabContent]
  );

  const handleNodeRefresh = useCallback(
    (nodeId?: string) => {
      if (nodeId) {
        // 刷新特定节点
        const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
          for (const node of nodes) {
            if (node.id === nodeId) return node;
            if (node.children) {
              const found = findNode(node.children);
              if (found) return found;
            }
          }
          return undefined;
        };

        const node = findNode(state.databases);
        if (node && node.parentId) {
          const parentNode = findNode(state.databases);
          if (parentNode && parentNode.type === "database") {
            loadTables(parentNode.name, nodeId);
          }
        }
      } else {
        // 刷新所有数据库
        loadDatabases();
      }
    },
    [state.databases, loadDatabases, loadTables]
  );

  const renderSidebar = () => {
    return (
      <div className={`sidebar ${state.sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          {!state.sidebarCollapsed && <h3 className="sidebar-title">YCSQL</h3>}
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {state.sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${state.currentView === "query" ? "active" : ""}`}
            onClick={() => switchView("query")}
          >
            <FileText size={18} />
            {!state.sidebarCollapsed && <span>查询</span>}
          </button>

          <button
            className={`nav-item ${state.currentView === "dashboard" ? "active" : ""}`}
            onClick={() => switchView("dashboard")}
          >
            <BarChart3 size={18} />
            {!state.sidebarCollapsed && <span>监控</span>}
          </button>

          <button
            className={`nav-item ${state.currentView === "settings" ? "active" : ""}`}
            onClick={() => switchView("settings")}
          >
            <Settings size={18} />
            {!state.sidebarCollapsed && <span>设置</span>}
          </button>
        </nav>

        {!state.sidebarCollapsed && (
          <div className="sidebar-content">
            <div className="database-tree-container">
              <DatabaseTree
                databases={state.databases}
                selectedNode={state.activeDatabase}
                onNodeSelect={handleNodeSelect}
                onNodeExpand={handleNodeExpand}
                onNodeCollapse={handleNodeCollapse}
                onRefresh={handleNodeRefresh}
              />
            </div>
          </div>
        )}

        {!state.sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="connection-status">
              <div className="status-indicator connected"></div>
              <span>已连接</span>
            </div>
            <div className="database-info">
              <Database size={14} />
              <span>{state.activeDatabase}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabBar = () => {
    if (state.currentView !== "query") return null;

    return (
      <div className="tab-bar">
        <div className="tab-list">
          {state.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-item ${tab.id === state.activeTab ? "active" : ""}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="tab-name">{tab.name}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="tab-actions">
          <button
            className="tab-action-btn"
            onClick={() => addTab("sql")}
            data-tooltip="新建查询"
          >
            <Code size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTab);

    switch (state.currentView) {
      case "query":
        if (activeTab?.type === "sql") {
          return (
            <div className="query-view">
              <SQLEditor
                value={activeTab.content}
                onChange={(content) => updateTabContent(activeTab.id, content)}
                onExecute={executeQuery}
                height="400px"
              />

              {state.queryResult && (
                <div className="query-result">
                  <ResultTable
                    columns={state.queryResult.columns}
                    rows={state.queryResult.rows}
                    executionTime={state.queryResult.executionTime || 0}
                    error={state.queryResult.error || ""}
                    loading={state.isLoading}
                  />
                </div>
              )}
            </div>
          );
        } else if (activeTab?.type === "result") {
          return (
            <div className="result-view">
              {state.queryResult && (
                <ResultTable
                  columns={state.queryResult.columns}
                  rows={state.queryResult.rows}
                  executionTime={state.queryResult.executionTime || 0}
                  error={state.queryResult.error || ""}
                  loading={state.isLoading}
                />
              )}
            </div>
          );
        }
        break;

      case "dashboard":
        return <Dashboard />;

      case "settings":
        return (
          <div className="settings-view">
            <h2>设置</h2>
            <p>设置功能正在开发中...</p>
          </div>
        );
    }

    return null;
  };

  return (
    <div className="app-container">
      {renderSidebar()}

      <div
        className={`main-content ${state.sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {renderTabBar()}

        <div className="content-area">{renderMainContent()}</div>
      </div>
    </div>
  );
};

export default App;
