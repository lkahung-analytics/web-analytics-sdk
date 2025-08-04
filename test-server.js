#!/usr/bin/env node

/**
 * SDK测试服务器
 * 用于托管测试页面，解决file://协议跨域问题
 */

const express = require('express');
const path = require('path');
const open = require('open');

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

// 静态文件服务
app.use(express.static(__dirname));

// 禁用缓存（测试时需要实时更新）
app.use((req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// 测试页面路由
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SDK测试服务器</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    background: #f9f9f9;
                }
                .btn {
                    display: inline-block;
                    background: #007cba;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 5px;
                }
                .btn:hover { background: #005a87; }
                .status {
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .status-success { background: #d4edda; color: #155724; }
                .status-warning { background: #fff3cd; color: #856404; }
                .code {
                    background: #f1f1f1;
                    padding: 15px;
                    border-radius: 5px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <h1>🚀 SDK测试服务器</h1>
            
            <div class="status status-success">
                ✅ 服务器运行中 - ${HOST}:${PORT}
            </div>

            <div class="card">
                <h2>📋 可用测试页面</h2>
                <a href="/test-comprehensive.html" class="btn">综合功能测试</a>
                <a href="/dwell-time-test.html" class="btn">停留时间测试</a>
                <a href="/test.html" class="btn">基础测试</a>
            </div>

            <div class="card">
                <h2>⚙️ 后端配置</h2>
                <p>为了通过CORS验证，请在后端的 <code>ALLOWED_ORIGINS</code> 环境变量中添加：</p>
                <div class="code">http://${HOST}:${PORT}</div>
                
                <div class="status status-warning">
                    ⚠️ 确保后端服务已启动在 http://localhost:8080
                </div>
            </div>

            <div class="card">
                <h2>🔧 调试工具</h2>
                <p>测试页面包含以下调试功能：</p>
                <ul>
                    <li><strong>实时日志</strong>: 查看SDK事件和网络请求</li>
                    <li><strong>时区验证</strong>: 检查时区处理一致性</li>
                    <li><strong>停留时间精度测试</strong>: 验证计时准确性</li>
                    <li><strong>边界情况测试</strong>: 测试异常情况处理</li>
                </ul>
                
                <p><strong>快捷键:</strong></p>
                <ul>
                    <li><code>Ctrl+Shift+D</code>: 开启/关闭调试器</li>
                    <li><code>Ctrl+Shift+T</code>: 触发测试事件</li>
                    <li><code>Ctrl+Shift+V</code>: 验证时区</li>
                </ul>
            </div>

            <div class="card">
                <h2>📖 使用指南</h2>
                <ol>
                    <li>确保后端服务运行在 http://localhost:8080</li>
                    <li>在后端添加 CORS 配置：<code>ALLOWED_ORIGINS=http://${HOST}:${PORT}</code></li>
                    <li>选择测试页面开始测试</li>
                    <li>使用浏览器开发者工具查看详细日志</li>
                    <li>导出测试数据进行分析</li>
                </ol>
            </div>

            <script>
                // 检查后端连通性
                fetch('http://localhost:8080/health')
                    .then(response => {
                        if (response.ok) {
                            console.log('✅ 后端服务连接正常');
                        } else {
                            console.warn('⚠️ 后端服务响应异常');
                        }
                    })
                    .catch(error => {
                        console.error('❌ 无法连接到后端服务:', error);
                        const warning = document.createElement('div');
                        warning.className = 'status status-warning';
                        warning.innerHTML = '⚠️ 无法连接到后端服务 http://localhost:8080<br>请确保后端服务已启动';
                        document.body.appendChild(warning);
                    });
            </script>
        </body>
        </html>
    `);
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'SDK Test Server'
    });
});

// 启动服务器
app.listen(PORT, HOST, () => {
    console.log('🚀 SDK测试服务器已启动');
    console.log(`📍 服务地址: http://${HOST}:${PORT}`);
    console.log('');
    console.log('📋 可用的测试页面:');
    console.log(`   • 主页: http://${HOST}:${PORT}/`);
    console.log(`   • 综合测试: http://${HOST}:${PORT}/test-comprehensive.html`);
    console.log(`   • 停留时间测试: http://${HOST}:${PORT}/dwell-time-test.html`);
    console.log(`   • 基础测试: http://${HOST}:${PORT}/test.html`);
    console.log('');
    console.log('💡 重要提示:');
    console.log('   1. 确保后端服务已启动 (http://localhost:8080)');
    console.log(`   2. 在后端的 ALLOWED_ORIGINS 中添加: http://${HOST}:${PORT}`);
    console.log('   3. 按 Ctrl+C 停止服务器');
    console.log('');
    console.log('=' * 60);

    // 如果传入 --open 参数，自动打开浏览器
    if (process.argv.includes('--open')) {
        open(`http://${HOST}:${PORT}/`);
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\\n👋 服务器已停止');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\n👋 服务器已停止');
    process.exit(0);
});