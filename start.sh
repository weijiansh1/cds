#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║        蓝天智评 BlueSky AI-Eval             ║"
echo "  ║  大气污染治理政策智能评估与实时监测平台      ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

# 检查 Python
python3 --version >/dev/null 2>&1 || { echo "[错误] 未找到 Python3"; exit 1; }
echo "[✓] Python 环境: 就绪"

# 安装依赖
pip install -q fastapi uvicorn 2>/dev/null
echo "[✓] Python 依赖: 就绪"

# 构建前端
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[ ] 首次运行，正在构建前端..."
    cd frontend
    npm install --silent 2>/dev/null
    npx vite build 2>/dev/null
    cd ..
    echo "[✓] 前端构建: 完成"
else
    echo "[✓] 前端: 已构建"
fi

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  服务启动中...                              ║"
echo "  ║  打开浏览器访问: http://127.0.0.1:8000       ║"
echo "  ║  API 文档: http://127.0.0.1:8000/docs        ║"
echo "  ║  按 Ctrl+C 停止服务                         ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
