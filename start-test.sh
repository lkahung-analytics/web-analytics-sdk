#!/bin/bash

# SDK测试环境启动脚本

echo "🚀 准备启动SDK测试环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查Python是否安装（备用方案）
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

echo -e "${BLUE}🔍 检查环境...${NC}"

# 检查依赖
if [ ! -d "node_modules" ] && [ -f "package.json" ]; then
    echo -e "${YELLOW}📦 正在安装依赖...${NC}"
    npm install
fi

# 检查后端是否运行
echo -e "${BLUE}🔍 检查后端服务...${NC}"
if curl -s http://localhost:8080/health &> /dev/null; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${YELLOW}⚠️  后端服务未运行${NC}"
    echo "请启动后端服务:"
    echo "  cd ../backend-go"
    echo "  go run main.go"
    echo ""
    echo "是否继续启动测试服务器? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查CORS配置
echo -e "${BLUE}🔍 检查CORS配置...${NC}"
if [ -f "../backend-go/.env" ]; then
    if grep -q "ALLOWED_ORIGINS.*127.0.0.1:3000" "../backend-go/.env"; then
        echo -e "${GREEN}✅ CORS配置正确${NC}"
    else
        echo -e "${YELLOW}⚠️  需要添加CORS配置${NC}"
        echo "请在 backend-go/.env 文件中添加或修改:"
        echo "ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000"
    fi
else
    echo -e "${YELLOW}⚠️  backend-go/.env 文件不存在${NC}"
    echo "请创建 backend-go/.env 文件并添加:"
    echo "ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000"
fi

echo ""
echo -e "${BLUE}🎯 选择启动方式:${NC}"
echo "1. Node.js 服务器 (推荐)"
echo "2. Python 服务器 (备用)"
echo "3. 显示配置信息"

read -p "请选择 (1-3): " choice

case $choice in
    1)
        echo -e "${GREEN}🚀 启动 Node.js 测试服务器...${NC}"
        if [ -f "test-server.js" ]; then
            # 检查是否需要自动打开浏览器
            if [[ "$1" == "--open" || "$1" == "-o" ]]; then
                node test-server.js --open
            else
                node test-server.js
            fi
        else
            echo -e "${RED}❌ test-server.js 不存在${NC}"
            exit 1
        fi
        ;;
    2)
        if [ -n "$PYTHON_CMD" ]; then
            echo -e "${GREEN}🚀 启动 Python 测试服务器...${NC}"
            if [ -f "test-server.py" ]; then
                $PYTHON_CMD test-server.py
            else
                echo -e "${RED}❌ test-server.py 不存在${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Python 未安装${NC}"
            exit 1
        fi
        ;;
    3)
        echo -e "${BLUE}📋 配置信息:${NC}"
        echo "测试服务器地址: http://127.0.0.1:3000"
        echo "后端服务地址: http://localhost:8080"
        echo ""
        echo -e "${BLUE}📁 测试页面:${NC}"
        echo "• 综合测试: http://127.0.0.1:3000/test-comprehensive.html"
        echo "• 停留时间测试: http://127.0.0.1:3000/dwell-time-test.html"
        echo "• 基础测试: http://127.0.0.1:3000/test.html"
        echo ""
        echo -e "${BLUE}⚙️  后端CORS配置:${NC}"
        echo "在 backend-go/.env 中添加:"
        echo "ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000"
        echo ""
        echo -e "${BLUE}🔧 启动命令:${NC}"
        echo "Node.js: npm run test-server"
        echo "Python: python3 test-server.py"
        echo "自动打开: ./start-test.sh --open"
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac