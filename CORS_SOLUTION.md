# 🔧 SDK测试跨域解决方案

## ✅ 解决方案

### 方案1: 使用本地HTTP服务器（推荐）

#### Node.js服务器
```bash
# 安装依赖
npm install

# 启动服务器
npm run test-server

# 或自动打开浏览器
npm run test-server:open

# 或使用启动脚本
./start-test.sh --open
```

#### Python服务器（备用）
```bash
# Python 3
python3 test-server.py

# 或自动打开浏览器
python3 test-server.py --open
```

### 方案2: 配置后端CORS

在后端的 `.env` 文件中添加测试服务器地址：

```env
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

### 方案3: 临时开发配置

如果只是临时测试，可以在后端CORS中间件中临时添加：

```go
// 临时允许所有来源（仅用于开发测试）
ALLOWED_ORIGINS=*
```

**⚠️ 注意**: 生产环境中绝对不要使用 `*` 通配符！

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd backend-go
go run main.go
```

### 2. 配置CORS
在 `backend-go/.env` 中添加：
```env
ALLOWED_ORIGINS=http://127.0.0.1:3000
```

### 3. 启动测试服务器
```bash
cd sdk
./start-test.sh --open
```

### 4. 访问测试页面
- 主页: http://127.0.0.1:3000/
- 综合测试: http://127.0.0.1:3000/test-comprehensive.html
- 停留时间测试: http://127.0.0.1:3000/dwell-time-test.html

## 🔍 验证步骤

### 1. 检查服务器状态
```bash
# 检查后端
curl http://localhost:8080/health

# 检查测试服务器
curl http://127.0.0.1:3000/health
```

### 2. 验证CORS配置
在浏览器控制台中运行：
```javascript
fetch('http://localhost:8080/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
        app_id: 'test',
        event_type: 'test',
        timestamp: new Date().toISOString()
    }])
}).then(r => console.log('CORS OK:', r.status))
  .catch(e => console.error('CORS Error:', e));
```

### 3. 测试SDK功能
```javascript
// 初始化SDK
Analytics.init({
    appId: 'test-app',
    endpoint: 'http://localhost:8080/collect',
    debug: true
});

// 发送测试事件
Analytics.trackEvent('测试', '跨域测试', '成功', 1);
```

## 🛠️ 故障排除

### 问题1: CORS错误
```
Access to fetch at 'http://localhost:8080/collect' from origin 'http://127.0.0.1:3000' has been blocked by CORS policy
```

**解决方案**:
1. 检查后端 `.env` 中的 `ALLOWED_ORIGINS` 配置
2. 确保地址完全匹配（包括端口号）
3. 重启后端服务以加载新配置

### 问题2: 端口占用
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**:
1. 查找占用端口的进程: `lsof -i :3000`
2. 杀死进程: `kill -9 <PID>`
3. 或修改测试服务器端口

### 问题3: 依赖缺失
```
Error: Cannot find module 'express'
```

**解决方案**:
```bash
npm install express open
```

### 问题4: Python服务器问题
```
ModuleNotFoundError: No module named 'http.server'
```

**解决方案**:
- 确保使用Python 3: `python3 test-server.py`
- 或使用Node.js服务器

## 🎯 最佳实践

### 开发环境配置
```env
# backend-go/.env
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000,http://localhost:3001
```

### 生产环境配置
```env
# 只允许指定域名
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 测试自动化
```bash
# 创建测试脚本
#!/bin/bash
# 启动后端
cd backend-go && go run main.go &
BACKEND_PID=$!

# 启动测试服务器
cd sdk && npm run test-server:open &
TEST_PID=$!

# 等待用户操作
read -p "按回车键停止服务..."

# 清理进程
kill $BACKEND_PID $TEST_PID
```

## 📚 相关文档

- [CORS详解](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)
- [Same-Origin Policy](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)
- [Express.js文档](https://expressjs.com/)

## 🆘 需要帮助？

如果仍然遇到问题，请：

1. 检查浏览器控制台的错误信息
2. 查看后端服务器日志
3. 确认网络连接和防火墙设置
4. 尝试不同的浏览器或无痕模式

---

💡 **提示**: 建议使用Chrome DevTools的Network标签页监控请求，确保CORS请求正常发送和接收。