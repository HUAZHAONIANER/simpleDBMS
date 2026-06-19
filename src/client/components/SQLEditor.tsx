import { Copy, Download, FolderOpen, Play, Save, Settings } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

// 声明monaco类型
interface Monaco {
  editor: any;
  languages: any;
}

let monaco: Monaco | null = null;

interface SQLEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onExecute?: (sql: string) => void;
  onSave?: (sql: string) => void;
  onLoad?: (content: string) => void;
  height?: string | number;
  readOnly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

interface SQLEditorState {
  isExecuting: boolean;
  hasErrors: boolean;
  currentFile?: string;
  autoSaveEnabled: boolean;
  wordWrap: boolean;
  minimapEnabled: boolean;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  value = "",
  onChange,
  onExecute,
  onSave,
  onLoad,
  height = "400px",
  readOnly = false,

  placeholder,
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any | null>(null);
  const [state, setState] = useState<SQLEditorState>({
    isExecuting: false,
    hasErrors: false,
    currentFile: "",
    autoSaveEnabled: true,
    wordWrap: false,
    minimapEnabled: true,
  });

  useEffect(() => {
    if (!editorRef.current) return;

    let editor: any = null;
    let contentChangeListener: any = null;

    const initMonaco = async () => {
      try {
        // 动态导入Monaco Editor
        if (!monaco) {
          const monacoModule = await import("monaco-editor");
          // 处理默认导出和命名导出两种情况
          monaco = monacoModule.default || monacoModule;
        }

        // 配置Monaco编辑器
        editor = monaco.editor.create(editorRef.current, {
          value: value || placeholder || "",
          language: "sql",
          theme: "vs-dark",
          readOnly,
          automaticLayout: true,
          minimap: { enabled: state.minimapEnabled },
          wordWrap: state.wordWrap ? "on" : "off",
          fontSize: 14,
          fontFamily: "JetBrains Mono, Consolas, monospace",
          lineNumbers: "on",
          renderLineHighlight: "line",
          scrollBeyondLastLine: false,
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "always",
          unfoldOnClickAfterEndOfLine: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          trimAutoWhitespace: true,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: { enabled: true },
          hover: { enabled: true },
          contextmenu: true,
          mouseWheelZoom: false,
          multiCursorModifier: "ctrlCmd",
          selectionHighlight: true,
          occurrencesHighlight: true,
        });

        monacoEditorRef.current = editor;

        // 监听内容变化
        contentChangeListener = editor.onDidChangeModelContent(() => {
          const newValue = editor.getValue();
          onChange?.(newValue);

          // 自动保存
          if (state.autoSaveEnabled && onSave) {
            debounce(() => onSave(newValue), 1000)();
          }
        });
      } catch (error) {
        console.error("Failed to initialize Monaco Editor:", error);
      }
    };

    initMonaco();

    return () => {
      if (contentChangeListener) {
        contentChangeListener.dispose();
      }
      if (editor) {
        editor.dispose();
      }
    };
  }, [
    readOnly,
    state.minimapEnabled,
    state.wordWrap,
    onChange,
    onSave,
    placeholder,
    value,
  ]);

  const handleExecute = useCallback(() => {
    if (!monacoEditorRef.current || state.isExecuting) return;

    const sql = monacoEditorRef.current.getValue().trim();
    if (!sql) return;

    setState((prev) => ({ ...prev, isExecuting: true }));
    onExecute?.(sql);

    // 模拟执行完成
    setTimeout(() => {
      setState((prev) => ({ ...prev, isExecuting: false }));
    }, 1000);
  }, [onExecute, state.isExecuting]);

  const handleSave = useCallback(() => {
    if (!monacoEditorRef.current) return;

    const sql = monacoEditorRef.current.getValue();
    onSave?.(sql);
  }, [onSave]);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql,.txt";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onLoad?.(content);
          if (monacoEditorRef.current) {
            monacoEditorRef.current.setValue(content);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }, [onLoad]);

  const handleCopy = useCallback(() => {
    if (!monacoEditorRef.current) return;

    const sql = monacoEditorRef.current.getValue();
    navigator.clipboard.writeText(sql).then(() => {
      // 显示复制成功提示
      console.log("SQL copied to clipboard");
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (!monacoEditorRef.current) return;

    const sql = monacoEditorRef.current.getValue();
    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `query_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.sql`;
    a.click();

    URL.revokeObjectURL(url);
  }, []);

  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const formatSQL = useCallback(() => {
    if (!monacoEditorRef.current) return;

    const sql = monacoEditorRef.current.getValue();
    const formatted = formatSQLString(sql);
    monacoEditorRef.current.setValue(formatted);
  }, []);

  const formatSQLString = (sql: string): string => {
    return sql
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ",\n    ")
      .replace(/\bFROM\b/gi, "\nFROM")
      .replace(/\bWHERE\b/gi, "\nWHERE")
      .replace(/\bORDER BY\b/gi, "\nORDER BY")
      .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
      .replace(/\bHAVING\b/gi, "\nHAVING")
      .replace(/\bJOIN\b/gi, "\nJOIN")
      .trim();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter 执行查询
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }

      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Ctrl/Cmd + Shift + F 格式化
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        formatSQL();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExecute, handleSave, formatSQL]);

  return (
    <div className={`sql-editor-container ${className}`}>
      {/* 工具栏 */}
      <div className="sql-editor-toolbar">
        <div className="toolbar-left">
          <button
            className={`btn btn-primary ${state.isExecuting ? "pulse" : ""}`}
            onClick={handleExecute}
            disabled={state.isExecuting}
            data-tooltip="执行查询 (Ctrl+Enter)"
          >
            <Play size={16} />
            {state.isExecuting ? "执行中..." : "执行"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={formatSQL}
            data-tooltip="格式化SQL (Ctrl+Shift+F)"
          >
            格式化
          </button>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            data-tooltip="保存 (Ctrl+S)"
          >
            <Save size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleLoad}
            data-tooltip="加载文件"
          >
            <FolderOpen size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            data-tooltip="复制到剪贴板"
          >
            <Copy size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDownload}
            data-tooltip="下载SQL文件"
          >
            <Download size={16} />
          </button>

          <div className="toolbar-separator"></div>

          <button
            className="btn btn-secondary"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                wordWrap: !prev.wordWrap,
              }))
            }
            data-tooltip="切换自动换行"
          >
            {state.wordWrap ? "换行" : "不换行"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                minimapEnabled: !prev.minimapEnabled,
              }))
            }
            data-tooltip="切换迷你地图"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="sql-editor-statusbar">
        <div className="status-left">
          {state.currentFile && (
            <span className="file-name">{state.currentFile}</span>
          )}
          {state.hasErrors && (
            <span className="error-indicator">⚠️ 语法错误</span>
          )}
        </div>

        <div className="status-right">
          <span className="cursor-position">行 1, 列 1</span>
          <span className="encoding">UTF-8</span>
          <span className="language">SQL</span>
        </div>
      </div>

      {/* 编辑器 */}
      <div ref={editorRef} className="sql-editor" style={{ height }} />
    </div>
  );
};

/**
 * SQL编辑器工具栏组件
 */
export const SQLEditorToolbar: React.FC<{
  onExecute?: () => void;
  onFormat?: () => void;
  onSave?: () => void;
  isExecuting?: boolean;
}> = ({ onExecute, onFormat, onSave, isExecuting }) => {
  return (
    <div className="sql-editor-toolbar">
      <button
        className={`btn btn-primary ${isExecuting ? "pulse" : ""}`}
        onClick={onExecute}
        disabled={isExecuting}
      >
        <Play size={16} />
        {isExecuting ? "执行中..." : "执行"}
      </button>

      <button className="btn btn-secondary" onClick={onFormat}>
        格式化
      </button>

      <button className="btn btn-secondary" onClick={onSave}>
        <Save size={16} />
      </button>
    </div>
  );
};
