// Web Analytics SDK
(function(window) {
    'use strict';

    const Analytics = {
        // SDK配置
        config: {
            endpoint: 'http://localhost:8080/collect',
            siteId: '',
            debug: false,
            heartbeatInterval: 10000 // 心跳间隔，用于追踪活跃状态
        },

        // 会话数据
        session: {
            startTime: null,
            lastActiveTime: null,
            heartbeatTimer: null,
            isActive: true
        },

        // 初始化SDK
        init: function(options) {
            this.config = { ...this.config, ...options };
            this.session.startTime = new Date();
            this.session.lastActiveTime = new Date();
            this.setupPageView();
            this.setupEventListeners();
            this.setupSessionTracking();
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
                url: window.location.href,
                referrer: document.referrer,
                app_id: this.config.siteId,
                visitor_id: this.generateVisitorId(),
                user_agent: navigator.userAgent,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
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
            const sessionDuration = this.session.lastActiveTime
                ? new Date() - this.session.startTime
                : 0;

            this.send({
                event_type: 'pageview',
                title: document.title,
                path: window.location.pathname,
                session_duration: sessionDuration,
                is_active: this.session.isActive
            });
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

        // 设置页面访问追踪
        setupPageView: function() {
            this.trackPageView();
            // 处理单页应用的路由变化
            window.addEventListener('popstate', () => this.trackPageView());
        },

        // 设置会话追踪
        setupSessionTracking: function() {
            // 更新活跃状态
            const updateActivity = () => {
                this.session.lastActiveTime = new Date();
                this.session.isActive = true;
                this.sendHeartbeat();
            };

            // 发送心跳
            const sendHeartbeat = () => {
                if (this.session.isActive) {
                    this.send({
                        event_type: 'heartbeat',
                        session_duration: new Date() - this.session.startTime,
                        last_active: this.session.lastActiveTime.toISOString()
                    });
                }
            };

            // 设置心跳定时器
            this.session.heartbeatTimer = setInterval(sendHeartbeat, this.config.heartbeatInterval);

            // 监听用户活动
            const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
            activityEvents.forEach(event => {
                document.addEventListener(event, updateActivity);
            });

            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                this.session.isActive = !document.hidden;
                if (!document.hidden) {
                    updateActivity();
                }
            });

            // 页面卸载时发送最终统计
            window.addEventListener('beforeunload', () => {
                this.send({
                    event_type: 'session_end',
                    session_duration: new Date() - this.session.startTime,
                    last_active: this.session.lastActiveTime.toISOString()
                });
            });
        },

        // 设置自动事件追踪
        setupEventListeners: function() {
            // 点击事件追踪
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.tagName === 'A') {
                    this.trackEvent('link', 'click', target.href);
                } else if (target.tagName === 'BUTTON') {
                    this.trackEvent('button', 'click', target.textContent);
                }
            });

            // 表单提交追踪
            document.addEventListener('submit', (e) => {
                if (e.target.tagName === 'FORM') {
                    this.trackEvent('form', 'submit', e.target.id || e.target.action);
                }
            });
        }
    };

    // 暴露给全局
    window.Analytics = Analytics;
})(window);
