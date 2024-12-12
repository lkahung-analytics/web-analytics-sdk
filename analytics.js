// Web Analytics SDK
(function(window) {
    'use strict';

    const Analytics = {
        // SDK配置
        config: {
            endpoint: '',
            appId: '',
            debug: false,
            isSPA: true,
        },

        // 会话数据
        session: {
            startTime: null
        },

        // 初始化SDK
        init: function(options) {
            if (!options.appId) {
                throw new Error('appId is required');
            }
            if (typeof options.isSPA !== 'boolean') {
                throw new Error('isSPA parameter is required and must be a boolean');
            }

            this.config = {
                endpoint: options.endpoint || 'http://localhost:8080/collect',
                appId: options.appId,
                debug: !!options.debug,
                isSPA: options.isSPA
            };

            // 生成访客ID
            this.visitorId = this.generateVisitorId();

            // 设置页面追踪
            this.setupPageTracking();

            if (this.config.debug) {
                console.log('Analytics initialized with config:', this.config);
            }
            this.session.startTime = new Date();
            return this;
        },

        // 生成唯一访客ID
        generateVisitorId: function() {
            let visitorId = localStorage.getItem('wa_visitor_id');
            if (!visitorId) {
                visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem('wa_visitor_id', visitorId);
            }
            return visitorId;
        },

        // 获取基础数据
        getBaseData: function() {
            return {
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_title: document.title,
                page_referrer: document.referrer,
                app_id: this.config.appId,
                visitor_id: this.generateVisitorId(),
                user_agent: navigator.userAgent,
                screen_width: window.screen.width,
                screen_height: window.screen.height,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                language: navigator.language
            };
        },

        // 发送数据到服务器
        send: function(eventData) {
            const data = {
                ...this.getBaseData(),
                ...eventData
            };

            if (this.config.debug) {
                console.log('[Analytics] Sending:', data);
            }

            fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            }).catch(err => {
                if (this.config.debug) {
                    console.error('[Analytics] Error:', err);
                }
            });
        },

        // 追踪页面访问
        trackPageView: function() {
            const sessionDuration = new Date() - this.session.startTime;

            // 使用 sendBeacon 确保数据在页面卸载时能够发送
            const data = {
                ...this.getBaseData(),
                event_type: 'pageview',
                session_duration: sessionDuration
            };

            if (this.config.debug) {
                console.log('[Analytics] Sending pageview:', data);
            }

            // 使用 sendBeacon 来确保数据发送
            navigator.sendBeacon(this.config.endpoint, JSON.stringify(data));
        },

        // 追踪自定义事件
        trackEvent: function(category, action, label = null, value = null) {
            this.send({
                event_type: 'event',
                category: category,
                action: action,
                label: label,
                value: value
            });
        },

        // 设置页面追踪
        setupPageTracking: function() {
            // 只在非 SPA 模式下添加 beforeunload 监听
            if (!this.config.isSPA) {
                window.addEventListener('beforeunload', () => {
                    this.trackPageView();
                });
            }
        }
    };

    // 如果是 Node.js 环境，使用 module.exports
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Analytics;
    }

    // 如果是浏览器环境，挂载到 window
    if (typeof window !== 'undefined') {
        window.Analytics = Analytics;
    }
})(window);
