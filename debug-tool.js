// Analytics SDK 调试工具
class AnalyticsDebugger {
    constructor() {
        this.analytics = null;
        this.interceptedEvents = [];
        this.originalMethods = {};
        this.debugPanel = null;
        this.isEnabled = false;
    }

    // 初始化调试器
    init() {
        if (typeof Analytics !== 'undefined') {
            this.analytics = Analytics;
            this.interceptMethods();
            this.createDebugPanel();
            this.isEnabled = true;
            console.log('🔧 Analytics调试器已启用');
        } else {
            console.error('❌ Analytics SDK未找到');
        }
    }

    // 拦截SDK方法
    interceptMethods() {
        // 拦截addToQueue方法
        this.originalMethods.addToQueue = this.analytics.addToQueue;
        this.analytics.addToQueue = (event) => {
            this.interceptedEvents.push({
                timestamp: Date.now(),
                event: JSON.parse(JSON.stringify(event)),
                type: 'queue_add'
            });
            this.updateDebugPanel();
            return this.originalMethods.addToQueue.call(this.analytics, event);
        };

        // 拦截flushQueue方法
        this.originalMethods.flushQueue = this.analytics.flushQueue;
        this.analytics.flushQueue = async () => {
            const queueLength = this.analytics.eventQueue.length;
            this.interceptedEvents.push({
                timestamp: Date.now(),
                event: { type: 'queue_flush', count: queueLength },
                type: 'queue_flush'
            });
            this.updateDebugPanel();
            return await this.originalMethods.flushQueue.call(this.analytics);
        };

        // 拦截trackPageLeave方法
        this.originalMethods.trackPageLeave = this.analytics.trackPageLeave;
        this.analytics.trackPageLeave = () => {
            const startTime = this.analytics.session.pageStartTime || this.analytics.session.startTime;
            const duration = Date.now() - startTime;
            
            this.interceptedEvents.push({
                timestamp: Date.now(),
                event: { 
                    type: 'page_leave', 
                    duration: duration,
                    pageStartTime: startTime,
                    currentTime: Date.now()
                },
                type: 'page_leave'
            });
            this.updateDebugPanel();
            return this.originalMethods.trackPageLeave.call(this.analytics);
        };
    }

    // 创建调试面板
    createDebugPanel() {
        // 创建调试面板HTML
        const panelHTML = `
            <div id="analytics-debug-panel" style="
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 500px;
                background: #1e1e1e;
                color: #00ff00;
                border: 2px solid #333;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                <div style="
                    background: #333;
                    padding: 8px 12px;
                    border-bottom: 1px solid #555;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>🔧 Analytics调试器</span>
                    <div>
                        <button onclick="analyticsDebugger.togglePanel()" style="
                            background: none;
                            border: none;
                            color: #00ff00;
                            cursor: pointer;
                            padding: 2px 6px;
                        ">_</button>
                        <button onclick="analyticsDebugger.closePanel()" style="
                            background: none;
                            border: none;
                            color: #ff6b6b;
                            cursor: pointer;
                            padding: 2px 6px;
                        ">×</button>
                    </div>
                </div>
                <div id="debug-content" style="padding: 12px; max-height: 400px; overflow-y: auto;">
                    <div id="debug-info">调试器已启动...</div>
                </div>
                <div style="
                    background: #333;
                    padding: 6px 12px;
                    border-top: 1px solid #555;
                    display: flex;
                    gap: 8px;
                ">
                    <button onclick="analyticsDebugger.clearLog()" style="
                        background: #555;
                        border: none;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                    ">清空</button>
                    <button onclick="analyticsDebugger.exportLog()" style="
                        background: #555;
                        border: none;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                    ">导出</button>
                    <button onclick="analyticsDebugger.showStats()" style="
                        background: #555;
                        border: none;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                    ">统计</button>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.debugPanel = document.getElementById('analytics-debug-panel');
        
        // 添加拖拽功能
        this.makeDraggable();
    }

    // 使调试面板可拖拽
    makeDraggable() {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        const header = this.debugPanel.querySelector('div');
        header.style.cursor = 'move';

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = this.debugPanel.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.debugPanel.style.left = (e.clientX - dragOffset.x) + 'px';
                this.debugPanel.style.top = (e.clientY - dragOffset.y) + 'px';
                this.debugPanel.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // 更新调试面板
    updateDebugPanel() {
        if (!this.debugPanel) return;

        const debugInfo = document.getElementById('debug-info');
        if (!debugInfo) return;

        const recentEvents = this.interceptedEvents.slice(-10);
        let html = `
            <div style="margin-bottom: 10px;">
                <strong>队列状态:</strong> ${this.analytics.eventQueue.length} 个事件<br>
                <strong>拦截事件:</strong> ${this.interceptedEvents.length} 个<br>
                <strong>页面开始:</strong> ${new Date(this.analytics.session.pageStartTime || 0).toLocaleTimeString()}<br>
                <strong>当前时长:</strong> ${Math.floor((Date.now() - (this.analytics.session.pageStartTime || Date.now())) / 1000)}s
            </div>
            <div style="border-top: 1px solid #555; padding-top: 8px;">
                <strong>最近事件:</strong>
            </div>
        `;

        recentEvents.reverse().forEach(item => {
            const time = new Date(item.timestamp).toLocaleTimeString();
            const typeColor = {
                'queue_add': '#00ff00',
                'queue_flush': '#ffaa00',
                'page_leave': '#ff6b6b'
            }[item.type] || '#ffffff';

            html += `
                <div style="margin: 4px 0; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                    <span style="color: ${typeColor};">[${time}]</span>
                    ${this.formatEventForDisplay(item)}
                </div>
            `;
        });

        debugInfo.innerHTML = html;
    }

    // 格式化事件显示
    formatEventForDisplay(item) {
        switch (item.type) {
            case 'queue_add':
                return `📝 事件入队: ${item.event.event_type || '未知'} (时长: ${item.event.session_duration || 0}ms)`;
            case 'queue_flush':
                return `🚀 队列发送: ${item.event.count} 个事件`;
            case 'page_leave':
                return `👋 页面离开: ${Math.floor(item.event.duration / 1000)}s`;
            default:
                return `📊 ${item.type}: ${JSON.stringify(item.event).substring(0, 50)}...`;
        }
    }

    // 切换面板显示
    togglePanel() {
        const content = document.getElementById('debug-content');
        if (content.style.display === 'none') {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    }

    // 关闭面板
    closePanel() {
        if (this.debugPanel) {
            this.debugPanel.remove();
            this.debugPanel = null;
        }
    }

    // 清空日志
    clearLog() {
        this.interceptedEvents = [];
        this.updateDebugPanel();
        console.log('🧹 调试日志已清空');
    }

    // 导出日志
    exportLog() {
        const data = {
            timestamp: new Date().toISOString(),
            sdkConfig: this.analytics.config,
            sessionInfo: this.analytics.session,
            queueState: this.analytics.eventQueue,
            interceptedEvents: this.interceptedEvents,
            environment: {
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                url: window.location.href
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📤 调试数据已导出');
    }

    // 显示统计信息
    showStats() {
        const eventTypes = {};
        const errors = [];
        let totalDuration = 0;
        let dwellTimeEvents = 0;

        this.interceptedEvents.forEach(item => {
            eventTypes[item.type] = (eventTypes[item.type] || 0) + 1;
            
            if (item.type === 'page_leave' && item.event.duration) {
                totalDuration += item.event.duration;
                dwellTimeEvents++;
            }
        });

        const avgDuration = dwellTimeEvents > 0 ? totalDuration / dwellTimeEvents : 0;

        const stats = `
📊 调试统计信息:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总拦截事件: ${this.interceptedEvents.length}
事件类型分布:
${Object.entries(eventTypes).map(([type, count]) => `  • ${type}: ${count}`).join('\n')}

当前队列长度: ${this.analytics.eventQueue.length}
平均停留时间: ${Math.floor(avgDuration / 1000)}秒
页面总停留: ${Math.floor((Date.now() - (this.analytics.session.startTime || Date.now())) / 1000)}秒

SDK配置:
  • App ID: ${this.analytics.config.appId}
  • 调试模式: ${this.analytics.config.debug}
  • 批量大小: ${this.analytics.config.batchSize}
  • 上传间隔: ${this.analytics.config.uploadInterval}ms

环境信息:
  • 时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
  • 时区偏移: ${new Date().getTimezoneOffset()}分钟
  • 用户代理: ${navigator.userAgent.substring(0, 50)}...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;

        console.log(stats);
        alert('统计信息已输出到控制台');
    }

    // 手动触发事件测试
    triggerTestEvent(type = 'test') {
        if (!this.analytics) return;

        switch (type) {
            case 'pageview':
                this.analytics.trackPageLeave();
                break;
            case 'custom':
                this.analytics.trackEvent('调试器', '测试事件', '手动触发', Date.now());
                break;
            case 'flush':
                this.analytics.flushQueue();
                break;
            default:
                this.analytics.trackEvent('调试器', type, '测试', 1);
        }
        
        console.log(`🎯 已触发 ${type} 事件`);
    }

    // 验证时区一致性
    validateTimezone() {
        const jsOffset = new Date().getTimezoneOffset();
        const baseData = this.analytics.getBaseData();
        const sdkOffset = baseData.timezone_offset;
        
        const result = {
            jsOffset,
            sdkOffset,
            consistent: jsOffset === sdkOffset,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        console.log('🌍 时区验证结果:', result);
        
        if (!result.consistent) {
            console.warn('⚠️ 时区不一致！可能影响时间计算准确性');
        }

        return result;
    }

    // 监控页面停留时间准确性
    startDwellTimeMonitor(intervalMs = 5000) {
        setInterval(() => {
            const currentTime = Date.now();
            const pageStartTime = this.analytics.session.pageStartTime || this.analytics.session.startTime;
            const calculatedDuration = currentTime - pageStartTime;
            
            console.log(`⏱️ 停留时间监控: ${Math.floor(calculatedDuration / 1000)}秒`);
            
            // 检查是否有异常
            if (calculatedDuration < 0) {
                console.warn('⚠️ 检测到负数停留时间！');
            } else if (calculatedDuration > 24 * 60 * 60 * 1000) {
                console.warn('⚠️ 停留时间超过24小时！');
            }
        }, intervalMs);

        console.log(`🔍 已启动停留时间监控，间隔：${intervalMs}ms`);
    }

    // 恢复原始方法
    restore() {
        if (this.analytics && this.originalMethods) {
            Object.keys(this.originalMethods).forEach(method => {
                this.analytics[method] = this.originalMethods[method];
            });
        }
        
        this.closePanel();
        this.isEnabled = false;
        console.log('🔧 调试器已禁用，原始方法已恢复');
    }
}

// 创建全局调试器实例
window.analyticsDebugger = new AnalyticsDebugger();

// 自动初始化（如果Analytics已加载）
if (typeof Analytics !== 'undefined') {
    window.analyticsDebugger.init();
} else {
    // 等待Analytics加载
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (typeof Analytics !== 'undefined') {
                window.analyticsDebugger.init();
            }
        }, 1000);
    });
}

// 快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+D 开启/关闭调试器
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (window.analyticsDebugger.isEnabled) {
            window.analyticsDebugger.restore();
        } else {
            window.analyticsDebugger.init();
        }
    }
    
    // Ctrl+Shift+T 触发测试事件
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        window.analyticsDebugger.triggerTestEvent('custom');
    }
    
    // Ctrl+Shift+V 验证时区
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        window.analyticsDebugger.validateTimezone();
    }
});

console.log('🔧 Analytics调试器已加载');
console.log('💡 快捷键: Ctrl+Shift+D (开关调试器), Ctrl+Shift+T (测试事件), Ctrl+Shift+V (验证时区)');
console.log('💡 使用: analyticsDebugger.init() 启动调试器');