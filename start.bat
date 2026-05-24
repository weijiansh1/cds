@echo off
chcp 65001 >nul
title 蓝天智评 - 大气污染治理政策智能评估与实时监测一体化平台

echo.
echo   ╔══════════════════════════════════════════════╗
echo   ║        蓝天智评 BlueSky AI-Eval             ║
echo   ║  大气污染治理政策智能评估与实时监测平台      ║
echo   ╚══════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 1. 检查 Python 环境
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)
echo [✓] Python 环境: 就绪

:: 2. 安装 Python 依赖
echo [ ] 检查 Python 依赖...
pip install -q fastapi uvicorn 2>nul
echo [✓] Python 依赖: 就绪

:: 3. 构建前端（如果还没构建过）
if not exist "frontend\dist\index.html" (
    echo [ ] 首次运行，正在构建前端...
    cd frontend
    call npm install --silent 2>nul
    call npx vite build 2>nul
    cd ..
    if exist "frontend\dist\index.html" (
        echo [✓] 前端构建: 完成
    ) else (
        echo [!] 前端构建失败，将使用 API-only 模式
        echo     开发模式请手动运行: cd frontend ^&^& npm run dev
    )
) else (
    echo [✓] 前端: 已构建
)

:: 4. 启动服务
echo.
echo   ╔══════════════════════════════════════════════╗
echo   ║  服务启动中...                              ║
echo   ║  打开浏览器访问: http://127.0.0.1:8000       ║
echo   ║  API 文档: http://127.0.0.1:8000/docs        ║
echo   ║  按 Ctrl+C 停止服务                         ║
echo   ╚══════════════════════════════════════════════╝
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

pause
