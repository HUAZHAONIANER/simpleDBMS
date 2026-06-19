import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Columns,
  Download,
  Settings,
  Trash2,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

export interface TableColumn {
  name: string;
  key: string;
  type?: "string" | "number" | "boolean" | "date" | "datetime";
  width?: number | string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
  format?: (value: any) => React.ReactNode;
  render?: (value: any, row: any[]) => React.ReactNode;
  hidden?: boolean;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount?: number;
  executionTime?: number;
  error?: string;
  warning?: string;
}

export interface ResultTableProps {
  columns: string[];
  rows: any[][];
  rowCount?: number;
  executionTime?: number;
  error?: string;
  loading?: boolean;
  onExport?: (format: "csv" | "json") => void;
  className?: string;
  pageSize?: number;
  maxHeight?: string | number;
  showToolbar?: boolean;
  showPagination?: boolean;
}

interface ResultTableState {
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  searchTerm: string;
  filters: Record<string, string>;
  selectedRows: Set<number>;
  columnFilters: Record<string, string>;
  columnVisibility: Record<string, boolean>;
  wordWrap: boolean;
  showColumnSelector: boolean;
  showSettings: boolean;
}

export const ResultTable: React.FC<ResultTableProps> = ({
  columns,
  rows,

  executionTime,
  error,
  loading = false,
  onExport,
  className = "",
  pageSize = 20,
  maxHeight,
  showToolbar = true,
  showPagination = true,
}) => {
  const [state, setState] = useState<ResultTableState>({
    currentPage: 1,
    pageSize,
    sortColumn: null,
    sortDirection: "asc",
    searchTerm: "",
    filters: {},
    selectedRows: new Set(),
    columnFilters: {},
    columnVisibility: columns.reduce(
      (acc, col) => {
        acc[col] = true;
        return acc;
      },
      {} as Record<string, boolean>
    ),
    wordWrap: false,
    showColumnSelector: false,
    showSettings: false,
  });

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const tableColumns: TableColumn[] = useMemo(() => {
    return columns.map((col) => ({
      name: col,
      key: col,
      sortable: true,
      filterable: true,
      align: "left",
      render: (value: any, _row: any[]) => {
        if (value === null || value === undefined) {
          return <span className="null-value">NULL</span>;
        }
        if (typeof value === "boolean") {
          return <span className="boolean-value">{value ? "是" : "否"}</span>;
        }
        if (typeof value === "number") {
          return <span className="number-value">{value.toLocaleString()}</span>;
        }
        if (value instanceof Date) {
          return <span>{value.toLocaleString()}</span>;
        }
        return <span>{String(value)}</span>;
      },
    }));
  }, [columns]);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    // 搜索过滤
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      result = result.filter((row) => {
        return row.some((cell) => {
          const cellValue = String(cell).toLowerCase();
          return cellValue.includes(term);
        });
      });
    }

    // 列过滤
    for (const [column, filterValue] of Object.entries(state.columnFilters)) {
      if (filterValue) {
        const columnIndex = columns.indexOf(column);
        if (columnIndex !== -1) {
          result = result.filter((row) => {
            const cellValue = String(row[columnIndex]).toLowerCase();
            return cellValue.includes(filterValue.toLowerCase());
          });
        }
      }
    }

    // 排序
    if (state.sortColumn) {
      const columnIndex = columns.indexOf(state.sortColumn);
      if (columnIndex !== -1) {
        result.sort((a, b) => {
          const aVal = a[columnIndex];
          const bVal = b[columnIndex];

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();

          if (aStr < bStr) {
            return state.sortDirection === "asc" ? -1 : 1;
          }
          if (aStr > bStr) {
            return state.sortDirection === "asc" ? 1 : -1;
          }
          return 0;
        });
      }
    }

    return result;
  }, [
    rows,
    columns,
    state.searchTerm,
    state.filters,
    state.sortColumn,
    state.sortDirection,
    state.columnFilters,
  ]);

  const paginatedRows = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    return filteredRows.slice(startIndex, startIndex + state.pageSize);
  }, [filteredRows, state.currentPage, state.pageSize]);

  const totalPages = Math.ceil(filteredRows.length / state.pageSize);

  const handleSort = useCallback((column: string) => {
    setState((prev) => {
      if (prev.sortColumn === column) {
        // 如果已经按该列排序，切换排序方向
        return {
          ...prev,
          sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
        };
      } else {
        // 如果是新列，按升序排序
        return {
          ...prev,
          sortColumn: column,
          sortDirection: "asc",
        };
      }
    });
  }, []);

  const handleSearch = useCallback((term: string) => {
    setState((prev) => ({
      ...prev,
      searchTerm: term,
      currentPage: 1,
    }));
  }, []);

  const handleColumnFilter = useCallback((column: string, value: string) => {
    setState((prev) => ({
      ...prev,
      columnFilters: {
        ...prev.columnFilters,
        [column]: value,
      },
      currentPage: 1,
    }));
  }, []);

  const handleRowSelect = useCallback((rowIndex: number) => {
    setState((prev) => {
      const newSelectedRows = new Set(prev.selectedRows);
      if (newSelectedRows.has(rowIndex)) {
        newSelectedRows.delete(rowIndex);
      } else {
        newSelectedRows.add(rowIndex);
      }
      return { ...prev, selectedRows: newSelectedRows };
    });
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setState((prev) => ({
        ...prev,
        selectedRows: selected
          ? new Set(filteredRows.map((_, i) => i))
          : new Set(),
      }));
    },
    [filteredRows]
  );

  const handlePageChange = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: page,
    }));
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      pageSize: size,
      currentPage: 1,
    }));
  }, []);

  const toggleColumnVisibility = useCallback((column: string) => {
    setState((prev) => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [column]: !prev.columnVisibility[column],
      },
    }));
  }, []);

  /**
   * 导出数据
   */
  const exportData = useCallback(
    (format: "csv" | "json") => {
      if (onExport) {
        onExport(format);
        return;
      }

      let data: string;
      let mimeType: string;
      let filename: string;

      if (format === "csv") {
        // 生成CSV数据
        const csvRows = [
          columns.join(","),
          ...filteredRows.map((row) =>
            row
              .map((cell) => {
                // 转义CSV特殊字符
                const str = String(cell);
                if (
                  str.includes(",") ||
                  str.includes('"') ||
                  str.includes("\n")
                ) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              })
              .join(",")
          ),
        ];
        data = csvRows.join("\n");
        mimeType = "text/csv";
        filename = `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
      } else {
        // 生成JSON数据
        const jsonData = filteredRows.map((row) => {
          const obj: any = {};
          columns.forEach((col, index) => {
            obj[col] = row[index];
          });
          return obj;
        });
        data = JSON.stringify(jsonData, null, 2);
        mimeType = "application/json";
        filename = `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
      }

      // 创建下载链接
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [columns, filteredRows, onExport]
  );

  /**
   * 处理设置变化
   */
  const handleSettingChange = useCallback((setting: string, value: any) => {
    setState((prev) => ({
      ...prev,
      [setting]: value,
    }));
  }, []);

  /**
   * 切换全选
   */
  const toggleSelectAll = useCallback(() => {
    handleSelectAll(state.selectedRows.size < filteredRows.length);
  }, [state.selectedRows.size, filteredRows.length, handleSelectAll]);

  /**
   * 可见的列
   */
  const visibleColumns = useMemo(() => {
    return tableColumns.filter((col) => state.columnVisibility[col.name]);
  }, [tableColumns, state.columnVisibility]);

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <div className="result-table-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索..."
              value={state.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <span className="result-info">
            {filteredRows.length} 行 {executionTime && `(${executionTime}ms)`}
          </span>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-secondary"
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            data-tooltip="选择列"
          >
            <Columns size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip="设置"
          >
            <Settings size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => exportData("csv")}
            data-tooltip="导出CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    );
  };

  /**
   * 渲染列选择器
   */
  const renderColumnSelector = () => {
    if (!showColumnSelector) return null;

    return (
      <div className="column-selector">
        <div className="column-selector-header">
          <h4>选择列</h4>
          <button
            className="btn-close"
            onClick={() => setShowColumnSelector(false)}
          >
            ×
          </button>
        </div>

        <div className="column-selector-body">
          {tableColumns.map((col) => (
            <div key={col.key} className="column-option">
              <input
                type="checkbox"
                checked={state.columnVisibility[col.name]}
                onChange={() => toggleColumnVisibility(col.name)}
              />
              <span>{col.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 渲染设置面板
   */
  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="settings-panel">
        <div className="settings-header">
          <h4>表格设置</h4>
          <button className="btn-close" onClick={() => setShowSettings(false)}>
            ×
          </button>
        </div>

        <div className="settings-body">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={state.wordWrap}
                onChange={(e) =>
                  handleSettingChange("wordWrap", e.target.checked)
                }
              />
              自动换行
            </label>
          </div>

          <div className="setting-item">
            <label>每页显示:</label>
            <select
              value={state.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value={10}>10 行</option>
              <option value={20}>20 行</option>
              <option value={50}>50 行</option>
              <option value={100}>100 行</option>
            </select>
          </div>

          <div className="setting-item">
            <button
              className="btn btn-danger"
              onClick={() =>
                setState((prev) => ({ ...prev, selectedRows: new Set() }))
              }
            >
              <Trash2 size={16} />
              清空选择
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染分页
   */
  const renderPagination = () => {
    if (!showPagination || totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => handlePageChange(Math.max(1, state.currentPage - 1))}
          disabled={state.currentPage === 1}
        >
          上一页
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          // 只显示当前页附近的页码
          if (
            totalPages > 10 &&
            (page < state.currentPage - 2 || page > state.currentPage + 2)
          ) {
            // 显示省略号
            if (
              (page === state.currentPage - 3 &&
                totalPages > state.currentPage + 2) ||
              (page === state.currentPage + 3 &&
                totalPages > state.currentPage + 2)
            ) {
              return (
                <span key={page} className="page-ellipsis">
                  ...
                </span>
              );
            }
            return null;
          }
          return (
            <button
              key={page}
              className={`page-btn ${page === state.currentPage ? "active" : ""}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          );
        })}

        <button
          className="page-btn"
          onClick={() =>
            handlePageChange(Math.min(totalPages, state.currentPage + 1))
          }
          disabled={state.currentPage === totalPages}
        >
          下一页
        </button>

        <div className="page-size-selector">
          <select
            value={state.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          行/页
        </div>
      </div>
    );
  };

  /**
   * 渲染表格
   */
  const renderTable = () => {
    if (error) {
      // 确保错误信息是字符串，处理对象类型的错误
      const errorMessage =
        typeof error === "string"
          ? error
          : (error as any).message || JSON.stringify(error, null, 2);

      return (
        <div className="result-table-error">
          <div className="error-message">{errorMessage}</div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="result-table-loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="result-table-empty">
          <span>没有查询结果</span>
        </div>
      );
    }

    return (
      <div className="result-table-wrapper">
        <table className="result-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <button className="select-all-btn" onClick={toggleSelectAll}>
                  {state.selectedRows.size === filteredRows.length &&
                  filteredRows.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="column-header"
                  style={{
                    width: col.width,
                    textAlign: col.align,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                  }}
                >
                  <div className="column-header-content">
                    <span className="column-name">{col.name}</span>
                    {col.sortable && (
                      <button
                        className={`sort-btn ${state.sortColumn === col.name ? state.sortDirection : ""}`}
                        onClick={() => handleSort(col.name)}
                      >
                        {state.sortColumn === col.name &&
                        state.sortDirection === "asc" ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  {col.filterable && (
                    <div className="filter-container">
                      <input
                        type="text"
                        className="filter-input"
                        placeholder={`过滤 ${col.name}`}
                        value={state.columnFilters[col.name] || ""}
                        onChange={(e) =>
                          handleColumnFilter(col.name, e.target.value)
                        }
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIndex) => {
              const globalIndex =
                (state.currentPage - 1) * state.pageSize + rowIndex;
              return (
                <tr
                  key={globalIndex}
                  className={
                    state.selectedRows.has(globalIndex) ? "selected" : ""
                  }
                >
                  <td className="checkbox-cell">
                    <button
                      className="row-select-btn"
                      onClick={() => handleRowSelect(globalIndex)}
                    >
                      {state.selectedRows.has(globalIndex) ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                  </td>
                  {visibleColumns.map((col) => {
                    const colIndex = columns.indexOf(col.name);
                    const value = row[colIndex];
                    return (
                      <td
                        key={col.key}
                        className="data-cell"
                        style={{
                          textAlign: col.align,
                          width: col.width,
                          minWidth: col.minWidth,
                          maxWidth: col.maxWidth,
                          whiteSpace: state.wordWrap ? "normal" : "nowrap",
                        }}
                      >
                        <div className="cell-content">
                          {col.render ? col.render(value, row) : value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className={`result-table-container ${className}`}
      style={{ maxHeight }}
    >
      {renderToolbar()}

      {renderColumnSelector()}
      {renderSettings()}

      {renderTable()}

      {showPagination && (
        <div className="result-table-footer">
          <div className="selected-info">
            已选择 {state.selectedRows.size} 行
          </div>
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

/**
 * 结果表格工具栏组件
 */
export const ResultTableToolbar: React.FC<{
  onSearch?: (term: string) => void;
  onExport?: (format: "csv" | "json") => void;
  resultCount?: number;
  executionTime?: number;
}> = ({ onSearch, onExport, resultCount, executionTime }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  return (
    <div className="result-table-toolbar">
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="result-info">
        {resultCount && `${resultCount} 行`}
        {executionTime && ` (${executionTime}ms)`}
      </div>

      <div className="toolbar-actions">
        <button className="btn btn-secondary" onClick={() => onExport?.("csv")}>
          <Download size={16} />
          导出CSV
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => onExport?.("json")}
        >
          <Download size={16} />
          导出JSON
        </button>
      </div>
    </div>
  );
};
