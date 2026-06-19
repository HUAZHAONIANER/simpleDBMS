import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    buffers: number;
    cached: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    iops: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    bytesSent: number;
    bytesReceived: number;
    packetsSent: number;
    packetsReceived: number;
  };
  connections: {
    active: number;
    idle: number;
    total: number;
    maxActive: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    slowQueries: number;
    avgResponseTime: number;
  };
  uptime: number;
}

/**
 * 查询统计接口
 */
interface QueryStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
}

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("1h");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [currentQueryStats, setCurrentQueryStats] = useState<QueryStats>({
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageExecutionTime: 0,
    slowQueries: 0,
  });

  const generateMockData = useCallback((count: number = 60) => {
    const data: SystemMetrics[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000);

      data.push({
        timestamp,
        cpu: {
          usage: Math.random() * 50 + 20, // 20-70%
          cores: 8,
          loadAverage: [
            Math.random() * 2 + 0.5,
            Math.random() * 1.5 + 0.3,
            Math.random() * 1 + 0.2,
          ],
        },
        memory: {
          total: 16 * 1024 * 1024 * 1024,
          used: Math.random() * 8 * 1024 * 1024 * 1024 + 4 * 1024 * 1024 * 1024,
          free:
            16 * 1024 * 1024 * 1024 -
            (Math.random() * 8 * 1024 * 1024 * 1024 + 4 * 1024 * 1024 * 1024),
          usage: Math.random() * 40 + 30, // 30-70%
          buffers: Math.random() * 512 * 1024 * 1024,
          cached: Math.random() * 2 * 1024 * 1024 * 1024,
        },
        disk: {
          total: 1000 * 1024 * 1024 * 1024,
          used:
            Math.random() * 400 * 1024 * 1024 * 1024 + 300 * 1024 * 1024 * 1024,
          free:
            1000 * 1024 * 1024 * 1024 -
            (Math.random() * 400 * 1024 * 1024 * 1024 +
              300 * 1024 * 1024 * 1024),
          usage: Math.random() * 30 + 40, // 40-70%
          iops: Math.random() * 200 + 50,
          readSpeed: Math.random() * 100 + 50,
          writeSpeed: Math.random() * 80 + 30,
        },
        network: {
          bytesSent: Math.random() * 1000000 + 500000,
          bytesReceived: Math.random() * 2000000 + 1000000,
          packetsSent: Math.random() * 1000 + 500,
          packetsReceived: Math.random() * 2000 + 1000,
        },
        connections: {
          active: Math.floor(Math.random() * 50 + 10),
          idle: Math.floor(Math.random() * 100 + 50),
          total: Math.floor(Math.random() * 150 + 60),
          maxActive: 200,
        },
        queries: {
          total: Math.floor(Math.random() * 100 + 50),
          successful: Math.floor(Math.random() * 90 + 50),
          failed: Math.floor(Math.random() * 10),
          slowQueries: Math.floor(Math.random() * 5),
          avgResponseTime: Math.random() * 50 + 10,
        },
        uptime: Math.random() * 86400 + 3600,
      });
    }

    return data;
  }, []);

  const generateMockQueryStats = useCallback(() => {
    return {
      totalQueries: Math.floor(Math.random() * 10000 + 5000),
      successfulQueries: Math.floor(Math.random() * 9500 + 4800),
      failedQueries: Math.floor(Math.random() * 500),
      averageExecutionTime: Math.random() * 50 + 20,
      slowQueries: Math.floor(Math.random() * 100 + 20),
    };
  }, []);

  const refreshData = useCallback(() => {
    setIsRefreshing(true);

    // 模拟API请求延迟
    setTimeout(() => {
      const newData = generateMockData();
      setSystemMetrics(newData);
      setCurrentQueryStats(generateMockQueryStats());
      setIsRefreshing(false);
    }, 1000);
  }, [generateMockData, generateMockQueryStats]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    const initialData = generateMockData();
    setSystemMetrics(initialData);
    setCurrentQueryStats(generateMockQueryStats());
  }, [generateMockData, generateMockQueryStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [refreshData]);

  const getCPUChartData = () => {
    return {
      labels: systemMetrics.map((metric) => metric.timestamp),
      datasets: [
        {
          label: "CPU使用率 (%)",
          data: systemMetrics.map((metric) => metric.cpu.usage),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const getMemoryChartData = () => {
    const currentMemory = systemMetrics[systemMetrics.length - 1]?.memory;
    if (!currentMemory) return { labels: [], datasets: [] };

    const used = currentMemory.used;
    const free = currentMemory.free;
    const buffers = currentMemory.buffers;
    const cached = currentMemory.cached;

    return {
      labels: ["已使用", "空闲", "缓冲区", "缓存"],
      datasets: [
        {
          label: "内存使用 (GB)",
          data: [used, free, buffers, cached].map(
            (val) => val / (1024 * 1024 * 1024)
          ),
          backgroundColor: [
            "rgb(255, 99, 132)",
            "rgb(54, 162, 235)",
            "rgb(255, 205, 86)",
            "rgb(75, 192, 192)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 205, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getQueryStatsChartData = () => {
    const popularTables = [
      { table: "users", queries: 2847, rows: 125000 },
      { table: "orders", queries: 2156, rows: 89000 },
      { table: "products", queries: 1834, rows: 56000 },
      { table: "sessions", queries: 1234, rows: 45000 },
      { table: "logs", queries: 876, rows: 2340000 },
    ];

    return {
      labels: popularTables.map((table) => table.table),
      datasets: [
        {
          label: "查询次数",
          data: popularTables.map((table) => table.queries),
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const timeSeriesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "minute" as const,
        },
        title: {
          display: true,
          text: "时间",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "值",
        },
      },
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  const currentMetrics = systemMetrics[systemMetrics.length - 1];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <Activity size={24} />
          <h1>系统监控</h1>
        </div>
        <div className="header-right">
          <select
            className="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="1h">最近1小时</option>
            <option value="6h">最近6小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
          </select>
          <button
            className={`btn btn-secondary ${isRefreshing ? "refreshing" : ""}`}
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
            {isRefreshing ? "刷新中..." : "刷新数据"}
          </button>
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="status-cards">
        <div className="status-card">
          <div className="card-icon cpu">
            <Cpu size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {(currentMetrics?.cpu.usage || 0).toFixed(1)}%
            </div>
            <div className="card-label">CPU使用率</div>
            <div className="card-subtitle">
              {currentMetrics?.cpu.cores || 0} 核心 | 负载{" "}
              {(currentMetrics?.cpu.loadAverage || [0]).join(", ")}
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon memory">
            <MemoryStick size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {(
                (currentMetrics?.memory.used || 0) /
                (1024 * 1024 * 1024)
              ).toFixed(1)}{" "}
              GB
            </div>
            <div className="card-label">内存使用</div>
            <div className="card-subtitle">
              {(currentMetrics?.memory.usage || 0).toFixed(1)}% 使用率
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon disk">
            <HardDrive size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {(
                (currentMetrics?.disk.used || 0) /
                (1024 * 1024 * 1024)
              ).toFixed(1)}{" "}
              GB
            </div>
            <div className="card-label">磁盘使用</div>
            <div className="card-subtitle">
              {(currentMetrics?.disk.usage || 0).toFixed(1)}% 使用率
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon connections">
            <Users size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {currentMetrics?.connections?.active || 0}
            </div>
            <div className="card-label">活跃连接</div>
            <div className="card-subtitle">
              总计 {currentMetrics?.connections?.total || 0} /{" "}
              {currentMetrics?.connections?.maxActive || 0}
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon queries">
            <Database size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {currentMetrics?.queries?.total || 0}
            </div>
            <div className="card-label">查询次数</div>
            <div className="card-subtitle">
              慢查询 {currentMetrics?.queries?.slowQueries || 0}
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon uptime">
            <Clock size={24} />
          </div>
          <div className="card-content">
            <div className="card-value">
              {Math.floor((currentMetrics?.uptime || 0) / 3600)}h{" "}
              {Math.floor(((currentMetrics?.uptime || 0) % 3600) / 60)}m
            </div>
            <div className="card-label">系统运行时间</div>
            <div className="card-subtitle">
              上次更新:{" "}
              {(currentMetrics?.timestamp || new Date()).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="charts-grid">
        {/* CPU使用率趋势 */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">CPU使用率趋势</h3>
            <div className="chart-status">
              {(currentMetrics?.cpu.usage || 0) > 80 ? (
                <AlertCircle size={16} className="status-warning" />
              ) : (
                <CheckCircle size={16} className="status-ok" />
              )}
            </div>
          </div>
          <div className="chart-content">
            <Line data={getCPUChartData()} options={timeSeriesOptions} />
          </div>
        </div>

        {/* 内存使用分布 */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">内存使用分布</h3>
            <div className="chart-status">
              {(currentMetrics?.memory.usage || 0) > 90 ? (
                <AlertCircle size={16} className="status-error" />
              ) : (currentMetrics?.memory.usage || 0) > 70 ? (
                <AlertCircle size={16} className="status-warning" />
              ) : (
                <CheckCircle size={16} className="status-ok" />
              )}
            </div>
          </div>
          <div className="chart-content">
            <Pie data={getMemoryChartData()} options={chartOptions} />
          </div>
        </div>

        {/* 查询统计 */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">热门表查询统计</h3>
            <div className="chart-status">
              {currentQueryStats.slowQueries > 10 ? (
                <AlertCircle size={16} className="status-warning" />
              ) : (
                <CheckCircle size={16} className="status-ok" />
              )}
            </div>
          </div>
          <div className="chart-content">
            <Bar data={getQueryStatsChartData()} options={chartOptions} />
          </div>
        </div>

        {/* 查询统计信息 */}
        <div className="stats-container">
          <div className="chart-header">
            <h3 className="chart-title">查询统计</h3>
          </div>
          <div className="stats-content">
            <div className="stat-item">
              <span className="stat-label">总查询数</span>
              <span className="stat-value">
                {currentQueryStats.totalQueries.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">成功查询</span>
              <span className="stat-value success">
                {currentQueryStats.successfulQueries.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">失败查询</span>
              <span className="stat-value error">
                {currentQueryStats.failedQueries}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均执行时间</span>
              <span className="stat-value">
                {currentQueryStats.averageExecutionTime.toFixed(1)}ms
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">慢查询</span>
              <span className="stat-value warning">
                {currentQueryStats.slowQueries}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
}> = ({ title, value, icon, color = "#0891b2", subtitle, trend }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp size={16} className="trend-up" />;
      case "down":
        return (
          <TrendingUp
            size={16}
            className="trend-down"
            style={{ transform: "rotate(180deg)" }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="metric-card">
      <div className="metric-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value">
          {value}
          {getTrendIcon()}
        </div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};
