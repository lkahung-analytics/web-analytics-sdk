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
    },

    // 当前页面地址
    fullUrl: window.location.href,
    // 来源页面
    pageReferrer: document.referrer,

    // 事件队列
    eventQueue: [],

    // 初始化SDK
    init: function (options) {
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
      let visitorId = localStorage.getItem("wa_visitor_id");
      if (!visitorId) {
        visitorId =
          "v_" +
          Math.random().toString(36).substring(2) +
          Date.now().toString(36);
        localStorage.setItem("wa_visitor_id", visitorId);
      }
      return visitorId;
    },

    // 生成唯一会话ID
    generateSessionId: function () {
      let sessionId = localStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = Date.now() + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem("session_id", sessionId);
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

      try {
        if (navigator.sendBeacon) {
          this.logDebugInfo(`Events sendBeacon: ${JSON.stringify(events)}`);
          navigator.sendBeacon(this.config.endpoint, JSON.stringify(events));
        } else {
          this.logDebugInfo(`Events fetch: ${JSON.stringify(events)}`);
          await fetch(this.config.endpoint, {
            method: "POST",
            body: JSON.stringify(events),
          });
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
      const duration =
        Date.now() - (this.session.pageStartTime || this.session.startTime); // 计算页面停留时间，毫秒

      this.logDebugInfo(
        `trackPageLeave - duration:${duration} - pageStartTime:${this.session.pageStartTime} - startTime:${this.session.startTime}`
      );

      this.addToQueue({
        event_type: "pageview",
        session_duration: duration,
        page_url: this.fullUrl,
        page_title: document.title,
        page_referrer: this.pageReferrer,
      });

      // 更新页面开始时间
      this.session.pageStartTime = Date.now();

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
        this.isRefreshing
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
      // 判断是否为移动设备
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      this.logDebugInfo(
        `isMobile: ${isMobile} - navigator.userAgent: ${navigator.userAgent}`
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

          this.pageReferrer = this.fullUrl;
          this.fullUrl = window.location.href;

          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
          originalPushState.apply(history, args);
        };

        window.addEventListener("popstate", () => {
          this.logDebugInfo("popstate event triggered");
          if (this.shouldTrack()) {
            this.trackPageLeave();
          }
        });
      }

      // Hash 模式监听
      if (this.config.routerMode === "hash") {
        window.addEventListener("hashchange", () => {
          this.logDebugInfo("hashchange event triggered");
          this.trackPageLeave();
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
