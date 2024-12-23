(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // 浏览器全局变量
    root.Analytics = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
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
    },

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

      this.session.startTime = new Date();
      this.session.sessionId = this.generateSessionId();

      // 设置页面追踪
      this.setupPageTracking();

      if (this.config.debug) {
        console.log("startTime:", this.session.startTime);
        console.log("sessionId:", this.session.sessionId);
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
          navigator.sendBeacon(this.config.endpoint, JSON.stringify(events));
        } else {
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
      const duration = Math.floor((new Date() - this.session.startTime) / 1000);

      this.addToQueue({
        event_type: "pageview",
        session_duration: duration,
        page_url: window.location.href,
        page_title: document.title,
        page_referrer: document.referrer,
      });

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

    // 设置页面追踪
    setupPageTracking: function () {
      // 原生 HTML 页面监听
      window.addEventListener("beforeunload", () => {
        this.trackPageLeave();
      });

      // History API 监听
      if (this.config.autoTrackRouter && this.config.routerMode === "history") {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
          this.trackPageLeave();
          originalPushState.apply(history, args);
        };

        history.replaceState = (...args) => {
          this.trackPageLeave();
          originalReplaceState.apply(history, args);
        };

        window.addEventListener("popstate", () => {
          this.trackPageLeave();
        });
      }

      // Hash 模式监听
      if (this.config.routerMode === "hash") {
        window.addEventListener("hashchange", () => {
          this.trackPageLeave();
        });
      }
    },
  };

  // 为了兼容性，同时支持 window.Analytics 和 window.analytics
  if (typeof window !== 'undefined') {
    window.Analytics = Analytics;
    window.analytics = Analytics;
  }

  return Analytics;
}));
