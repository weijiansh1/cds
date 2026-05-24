"""
蓝天智评 — 一键启动脚本
用法: python run.py

服务地址: http://127.0.0.1:8000
API 文档: http://127.0.0.1:8000/docs
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# 检查前端是否已构建
frontend_dist = ROOT / "frontend" / "dist" / "index.html"
if not frontend_dist.exists():
    print("=" * 50)
    print("  提示: 前端尚未构建")
    print("  系统将以 API 模式运行")
    print("  构建前端: cd frontend && npm run build")
    print("  或直接双击 start.bat (Windows)")
    print("=" * 50)
    print()

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
