#!/usr/bin/env python3
"""
简单的HTTP服务器，用于托管SDK测试页面
解决file://协议的跨域问题
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加CORS头，但实际的CORS验证会在后端进行
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # 自定义日志格式
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    # 确保在sdk目录中运行
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # 配置服务器
    PORT = 3000
    HOST = '127.0.0.1'
    
    try:
        with socketserver.TCPServer((HOST, PORT), CORSHTTPRequestHandler) as httpd:
            print("🚀 SDK测试服务器已启动")
            print(f"📍 服务地址: http://{HOST}:{PORT}")
            print("\n📋 可用的测试页面:")
            print(f"   • 综合测试: http://{HOST}:{PORT}/test-comprehensive.html")
            print(f"   • 停留时间测试: http://{HOST}:{PORT}/dwell-time-test.html")
            print(f"   • 基础测试: http://{HOST}:{PORT}/test.html")
            print("\n💡 提示:")
            print("   1. 确保后端服务已启动 (http://localhost:8080)")
            print(f"   2. 在后端的 ALLOWED_ORIGINS 中添加: http://{HOST}:{PORT}")
            print("   3. 按 Ctrl+C 停止服务器")
            print("\n" + "="*60)
            
            # 自动打开浏览器（可选）
            if len(sys.argv) > 1 and sys.argv[1] == '--open':
                webbrowser.open(f'http://{HOST}:{PORT}/test-comprehensive.html')
            
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {PORT} 已被占用")
            print(f"💡 请尝试关闭占用端口的程序，或修改脚本中的PORT变量")
        else:
            print(f"❌ 启动服务器失败: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
        sys.exit(0)

if __name__ == "__main__":
    main()