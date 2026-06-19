import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
// 导入Tailwind CSS样式
// @ts-ignore
import "./styles/main.css";

// 客户端日志记录器
class ClientLogger {
  private category: string;

  constructor(category: string) {
    this.category = category;
  }

  info(message: string, meta?: any) {
    console.info(`[${this.category}] INFO: ${message}`, meta || "");
  }

  error(message: string, meta?: any) {
    console.error(`[${this.category}] ERROR: ${message}`, meta || "");
  }

  warn(message: string, meta?: any) {
    console.warn(`[${this.category}] WARN: ${message}`, meta || "");
  }

  debug(message: string, meta?: any) {
    console.debug(`[${this.category}] DEBUG: ${message}`, meta || "");
  }
}

// 初始化日志记录器
const logger = new ClientLogger("ClientApp");

/**
 * 应用初始化函数
 */
function initializeApp() {
  try {
    // 获取根元素
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // 创建React根
    const root = createRoot(rootElement);

    // 渲染应用
    root.render(React.createElement(App));

    // 隐藏加载动画
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
      loadingElement.style.opacity = "0";
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 300);
    }

    logger.info("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application", { error });

    // 显示错误信息
    const errorElement = document.createElement("div");
    errorElement.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #0f172a;
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        z-index: 9999;
      ">
        <div style="text-align: center;">
          <h2>应用初始化失败</h2>
          <p>${error instanceof Error ? error.message : "未知错误"}</p>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 16px;">
            请检查控制台获取详细信息
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(errorElement);
  }
}

function initializeParticles() {
  try {
    const canvas = document.getElementById(
      "particles-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置画布大小
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 粒子系统
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // 创建粒子
    function createParticles() {
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    }

    // 更新和绘制粒子
    function animateParticles() {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // 更新位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 边界检查
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(8, 145, 178, ${particle.opacity})`;
        ctx.fill();
      });

      // 绘制连接线
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(8, 145, 178, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animateParticles);
    }

    createParticles();
    animateParticles();

    logger.info("Particles initialized");
  } catch (error) {
    logger.warn("Failed to initialize particles", { error });
  }
}

/**
 * 设置全局错误处理
 */
function setupErrorHandling() {
  // 处理未捕获的错误
  window.addEventListener("error", (event) => {
    logger.error("Global error", {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  // 处理未处理的Promise拒绝
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", {
      reason: event.reason,
    });
  });

  // 处理Vue错误（如果使用了Vue）
  (window as any).onVueError = (error: Error, instance: any, info: string) => {
    logger.error("Vue error", { error, instance, info });
  };
}

/**
 * 设置性能监控
 */
function setupPerformanceMonitoring() {
  if ("performance" in window) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;

        logger.info("Performance metrics", {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          domContentLoaded:
            perfData.domContentLoadedEventEnd -
            perfData.domContentLoadedEventStart,
          firstPaint: performance
            .getEntriesByType("paint")
            .find((entry) => entry.name === "first-paint")?.startTime,
          firstContentfulPaint: performance
            .getEntriesByType("paint")
            .find((entry) => entry.name === "first-contentful-paint")
            ?.startTime,
        });
      }, 0);
    });
  }
}

/**
 * 主初始化流程
 */
document.addEventListener("DOMContentLoaded", () => {
  try {
    setupErrorHandling();
    setupPerformanceMonitoring();
    initializeParticles();
    initializeApp();
  } catch (error) {
    logger.error("Initialization failed", { error });
  }
});

// 导出日志工具供其他模块使用
export { logger };
