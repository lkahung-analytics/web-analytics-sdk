(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // 浏览器全局变量
    root.Analytics = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Web Analytics SDK
  const Analytics = {
    // SDK配置
    config: {
      endpoint: "",
      appId: "",
      debug: false,
      isSPA: true,
      routerMode: "history",
      uploadType: "batch",
      batchSize: 20,
      uploadInterval: 5000,
      autoTrackRouter: true,
    },

    // 会话数据
    session: {
      startTime: null,
      sessionId: null,
      pageStartTime: null, // 添加页面开始时间戳
      visibleStartTime: null, // 页面变为可见时的时间戳
      totalVisibleTime: 0, // 累积的可见时间（毫秒）
      isVisible: true, // 当前页面是否可见
    },

    // 当前页面地址（在 init 中赋值，避免 SSR 顶层访问 window 崩溃）
    fullUrl: "",
    // 来源页面
    pageReferrer: "",

    // 事件队列
    eventQueue: [],

    // 初始化SDK
    init: function (options) {
      // SSR 安全：服务端无 window，init 变 no-op，等到客户端再执行
      if (typeof window === "undefined") {
        return this;
      }
      if (!options.appId) {
        throw new Error("appId is required");
      }
      if (typeof options.isSPA !== "boolean") {
        throw new Error("isSPA parameter is required and must be a boolean");
      }

      this.config = {
        endpoint: options.endpoint || "http://localhost:8080/collect",
        appId: options.appId,
        debug: !!options.debug,
        isSPA: options.isSPA,
        routerMode: options.routerMode || "history",
        uploadType: options.uploadType || "batch",
        batchSize: options.batchSize || 20,
        uploadInterval: options.uploadInterval || 5000,
        autoTrackRouter: options.autoTrackRouter !== false,
      };

      // 生成访客ID
      this.visitorId = this.generateVisitorId();
      this.session.startTime = Date.now();
      this.session.sessionId = this.generateSessionId();
      // 初始化页面开始时间
      this.session.pageStartTime = Date.now();
      // 初始化可见时间追踪
      this.session.visibleStartTime = Date.now();
      this.session.totalVisibleTime = 0;
      this.session.isVisible = !document.hidden;

      // 当前/来源页面地址（此处 window 已存在）
      this.fullUrl = window.location.href;
      this.pageReferrer = document.referrer;

      // 设置页面追踪
      this.setupPageTracking();

      if (this.config.debug) {
        console.log("startTime:", this.session.startTime);
        console.log("sessionId:", this.session.sessionId);
        console.log("pageStartTime:", this.session.pageStartTime);
        console.log("Analytics initialized with config:", this.config);
      }

      return this;
    },

    // 生成唯一访客ID
    generateVisitorId: function () {
      let visitorId = null;
      try {
        visitorId = localStorage.getItem("wa_visitor_id");
      } catch (e) {
        // localStorage 被禁用/隐私模式：降级为本次内存 ID
      }
      if (!visitorId) {
        visitorId =
          "v_" +
          Math.random().toString(36).substring(2) +
          Date.now().toString(36);
        try {
          localStorage.setItem("wa_visitor_id", visitorId);
        } catch (e) {}
      }
      return visitorId;
    },

    // 生成唯一会话ID
    generateSessionId: function () {
      let sessionId = null;
      try {
        sessionId = localStorage.getItem("session_id");
      } catch (e) {}
      if (!sessionId) {
        sessionId = Date.now() + "-" + Math.random().toString(36).slice(2);
        try {
          localStorage.setItem("session_id", sessionId);
        } catch (e) {}
      }
      return sessionId;
    },

    // 获取基础数据
    getBaseData: function () {
      return {
        app_id: this.config.appId,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: document.documentElement.clientWidth,
        viewport_height: document.documentElement.clientHeight,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        // timezone_offset: new Date().getTimezoneOffset(), // 添加时区偏移信息（分钟）
        session_id: this.session.sessionId,
        visitor_id: this.visitorId,
      };
    },

    // 添加事件到队列
    addToQueue: function (event) {
      this.eventQueue.push({
        ...this.getBaseData(),
        ...event,
      });

      if (this.config.debug) {
        console.log("[Analytics] Event added to queue:", event);
        console.log("[Analytics] Queue:", this.eventQueue);
      }

      if (
        this.config.uploadType === "batch" &&
        this.eventQueue.length >= this.config.batchSize
      ) {
        this.flushQueue();
      }
    },

    // 上报队列数据
    flushQueue: async function () {
      if (!this.eventQueue.length) return;

      const events = [...this.eventQueue];
      this.eventQueue = [];
      const payload = JSON.stringify(events);

      try {
        if (navigator.sendBeacon) {
          this.logDebugInfo(`Events sendBeacon: ${payload}`);
          const sent = navigator.sendBeacon(this.config.endpoint, payload);
          if (!sent) {
            // 浏览器拒绝排队（payload 超限/队列满）→ 重新入队，等下次
            this.eventQueue.unshift(...events);
          }
          this.logDebugInfo(
            `Collect sendBeacon result: endpoint=${this.config.endpoint}, success=${sent}, events=${events.length}`,
          );
        } else {
          this.logDebugInfo(`Events fetch: ${payload}`);
          const response = await fetch(this.config.endpoint, {
            method: "POST",
            body: payload,
          });
          const responseText = await response.text();
          this.logDebugInfo(
            `Collect fetch response: endpoint=${this.config.endpoint}, status=${response.status}, ok=${response.ok}, events=${events.length}, body=${responseText}`,
          );
        }
      } catch (err) {
        if (this.config.debug) {
          console.error("Analytics upload failed:", err);
        }
        // 失败重新入队
        this.eventQueue.unshift(...events);
      }
    },

    // 页面离开追踪
    trackPageLeave: function () {
      const currentTime = Date.now();
      let actualVisibleTime = this.session.totalVisibleTime;

      // 如果页面当前可见，加上当前可见时段的时间
      if (!document.hidden && this.session.visibleStartTime) {
        const currentVisibleDuration =
          currentTime - this.session.visibleStartTime;
        actualVisibleTime += currentVisibleDuration;
      }

      // 确保duration为正数且合理（不超过24小时）
      const validDuration = Math.max(
        0,
        Math.min(actualVisibleTime, 24 * 60 * 60 * 1000),
      );

      this.logDebugInfo(
        `trackPageLeave - actualVisibleTime:${actualVisibleTime}ms - totalVisibleTime:${this.session.totalVisibleTime}ms - isVisible:${!document.hidden} - currentTime:${currentTime}`,
      );

      this.addToQueue({
        event_type: "pageview",
        session_duration: validDuration,
        page_url: this.fullUrl,
        page_title: document.title,
        page_referrer: this.pageReferrer,
      });

      // 重置可见时间追踪
      this.session.pageStartTime = currentTime;
      this.session.visibleStartTime = currentTime;
      this.session.totalVisibleTime = 0;

      // 确保数据发送
      this.flushQueue();
    },

    // 追踪自定义事件
    trackEvent: function (category, action, label = null, value = null) {
      this.addToQueue({
        event_type: "event",
        category: category,
        action: action,
        label: label,
        value: value,
      });
    },
    // 添加防抖计时器
    lastTrackTime: 0,
    minTrackInterval: 100, // 最小追踪间隔（毫秒）
    isRefreshing: false, // 添加刷新标志位
    refreshDebounceTime: 500, // 刷新防抖时间（毫秒）

    // 添加防抖检查方法
    shouldTrack: function () {
      const now = Date.now();

      this.logDebugInfo(
        "shouldTrack:",
        now,
        this.lastTrackTime,
        this.minTrackInterval,
        "isRefreshing:",
        this.isRefreshing,
      );

      // 如果正在刷新中，不再触发追踪
      if (this.isRefreshing) {
        return false;
      }

      if (now - this.lastTrackTime >= this.minTrackInterval) {
        this.lastTrackTime = now;

        // 设置刷新标志，防止短时间内重复触发
        this.isRefreshing = true;
        setTimeout(() => {
          this.isRefreshing = false;
        }, this.refreshDebounceTime);

        return true;
      }
      return false;
    },
    // 设置页面追踪
    setupPageTracking: function () {
      // 监听页面可见性变化 - 核心改进
      document.addEventListener("visibilitychange", () => {
        const currentTime = Date.now();

        if (document.hidden) {
          // 页面隐藏：累积当前的可见时间
          if (this.session.isVisible && this.session.visibleStartTime) {
            const visibleDuration = currentTime - this.session.visibleStartTime;
            this.session.totalVisibleTime += visibleDuration;

            this.logDebugInfo(
              `Page hidden - visibleDuration: ${visibleDuration}ms, totalVisibleTime: ${this.session.totalVisibleTime}ms`,
            );
          }
          this.session.isVisible = false;
          this.session.visibleStartTime = null;
        } else {
          // 页面重新可见：重新开始计时
          this.session.visibleStartTime = currentTime;
          this.session.isVisible = true;

          this.logDebugInfo(
            `Page visible - starting new visible session at ${currentTime}`,
          );
        }
      });

      // 判断是否为移动设备
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      this.logDebugInfo(
        `isMobile: ${isMobile} - navigator.userAgent: ${navigator.userAgent}`,
      );

      if (isMobile) {
        // 使用 pagehide 事件
        window.addEventListener("pagehide", () => {
          this.logDebugInfo("pagehide event triggered");
          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
        });
      } else {
        // 原生 HTML 页面监听
        window.addEventListener("beforeunload", () => {
          this.logDebugInfo("beforeunload");
          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
        });
      }

      // History API 监听
      if (this.config.autoTrackRouter && this.config.routerMode === "history") {
        const originalPushState = history.pushState;

        history.pushState = (...args) => {
          this.logDebugInfo("pushState event triggered");

          // 先上报离开旧页（此时 this.fullUrl 仍是旧页 URL）
          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
          // 执行真正的跳转，URL 此刻才变为新页
          originalPushState.apply(history, args);
          // 跳转后更新来源页与当前页
          this.pageReferrer = this.fullUrl;
          this.fullUrl = window.location.href;
        };

        window.addEventListener("popstate", () => {
          this.logDebugInfo("popstate event triggered");
          // 上报离开旧页（this.fullUrl 仍是旧页）
          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
          // popstate 触发时 URL 已变，同步当前页/来源页
          this.pageReferrer = this.fullUrl;
          this.fullUrl = window.location.href;
        });
      }

      // Hash 模式监听
      if (this.config.routerMode === "hash") {
        window.addEventListener("hashchange", () => {
          this.logDebugInfo("hashchange event triggered");
          this.trackPageLeave();
          // hash 已变，同步当前页/来源页
          this.pageReferrer = this.fullUrl;
          this.fullUrl = window.location.href;
        });
      }
    },

    logDebugInfo: function (...messages) {
      // 检查是否开启调试模式
      if (this.config.debug) {
        console.log("[DEBUG]", ...messages);
      }
    },
  };

  // 为了兼容性，同时支持 window.Analytics 和 window.analytics
  if (typeof window !== "undefined") {
    window.Analytics = Analytics;
    window.analytics = Analytics;
  }

  return Analytics;
});
