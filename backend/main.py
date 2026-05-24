"""
蓝天智评 — 大气污染治理政策智能评估与实时监测一体化平台
FastAPI 后端（含前端静态文件服务）
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .db import ensure_database
from .realtime_service import (
    get_network_data,
    get_policy_timeline,
    get_realtime_all,
    get_realtime_forecast,
    get_realtime_history,
    get_time_comparison,
    warmup_realtime_cache,
)
from .service import (
    alerts,
    city_comparison,
    city_daily,
    city_monthly,
    delete_record,
    ensure_seed_data,
    get_city_coords,
    get_policies,
    list_cities,
    list_records,
    overview_metrics,
    reload_from_excel,
    seasonal_comparison,
    seasonal_statistics,
    transfer_overview,
    update_record,
    upsert_record,
)
from .xlsx_loader import DailyRecord

ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"

# 优先使用构建产物，否则回退到源码目录
if FRONTEND_DIST.exists():
    STATIC_DIR = FRONTEND_DIST
    ASSETS_DIR = FRONTEND_DIST / "assets"
else:
    STATIC_DIR = FRONTEND_DIR
    ASSETS_DIR = None

app = FastAPI(
    title="蓝天智评 API",
    version="1.0.0",
    description="大气污染治理政策智能评估与实时监测一体化平台",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态资源目录（JS/CSS/图片等）
if ASSETS_DIR and ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

# 额外挂载 static（兼容旧路径）
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class RecordPayload(BaseModel):
    city: str = Field(..., description="城市名")
    date_iso: str = Field(..., description="日期，格式 YYYY-MM-DD")
    counterfactual: float
    observed: float
    net_reduction: float


class UpdatePayload(BaseModel):
    counterfactual: float
    observed: float
    net_reduction: float


@app.on_event("startup")
def on_startup() -> None:
    ensure_database()
    ensure_seed_data()
    warmup_realtime_cache()  # 后台预热实时数据


# ==================== 业务 API ====================

@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/cities")
def get_cities() -> dict:
    return {"cities": list_cities()}


@app.get("/api/overview")
def get_overview() -> dict:
    return overview_metrics()


@app.get("/api/city/{city}/daily")
def get_city_daily(
    city: str,
    start: Optional[str] = Query(None, description="起始日期 YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD"),
    limit: int = Query(365, ge=30, le=3000),
) -> dict:
    data = city_daily(city, start=start, end=end, limit=limit)
    return {"city": city, "count": len(data), "items": data}


@app.get("/api/city/{city}/monthly")
def get_city_monthly(city: str) -> dict:
    data = city_monthly(city)
    return {"city": city, "count": len(data), "items": data}


@app.get("/api/comparison")
def get_comparison() -> dict:
    return {"items": city_comparison()}


@app.get("/api/alerts")
def get_alerts(city: str = Query("北京市"), limit: int = Query(12, ge=1, le=100)) -> dict:
    return {"city": city, "items": alerts(city, limit=limit)}


@app.get("/api/transfer")
def get_transfer(source_city: str = Query("北京市")) -> dict:
    return transfer_overview(source_city=source_city)


@app.get("/api/seasonal/statistics")
def get_seasonal_statistics(city: Optional[str] = Query(None, description="城市名")) -> dict:
    return seasonal_statistics(city=city)


@app.get("/api/seasonal/comparison")
def get_seasonal_comparison() -> dict:
    return seasonal_comparison()


@app.get("/api/policies")
def get_policies_api() -> dict:
    return get_policies()


@app.get("/api/city-coords")
def get_city_coordinates() -> dict:
    return get_city_coords()


# ---- 实时监测 API ----

@app.get("/api/realtime/current")
def realtime_current() -> dict:
    return get_realtime_all(cached_only=False)


@app.get("/api/realtime/quick")
def realtime_quick() -> dict:
    """快速获取缓存数据（毫秒级），数据未就绪时返回 pending 标志"""
    return get_realtime_all(cached_only=True)


@app.get("/api/realtime/history/{city}")
def realtime_history(city: str, hours: int = 48) -> dict:
    return get_realtime_history(city, hours=hours)


@app.get("/api/realtime/forecast/{city}")
def realtime_forecast(city: str, hours: int = 48) -> dict:
    return get_realtime_forecast(city, hours=hours)


# ---- 时光对比 API ----

@app.get("/api/time-comparison")
def time_comparison(target_date: str = Query(..., description="目标日期 YYYY-MM-DD")) -> dict:
    return get_time_comparison(target_date)


# ---- 政策成效追踪 API ----

@app.get("/api/policy-timeline")
def policy_timeline() -> dict:
    return get_policy_timeline()


# ---- 城市联防联控网络 API ----

@app.get("/api/network")
def network_data() -> dict:
    return get_network_data()


# ---- 管理 API ----

@app.get("/api/admin/records")
def admin_records(
    city: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return list_records(city=city, limit=limit, offset=offset)


@app.post("/api/admin/records")
def admin_create_record(payload: RecordPayload) -> dict:
    try:
        dt = datetime.strptime(payload.date_iso, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="date_iso must be YYYY-MM-DD") from exc
    date_key = int(dt.strftime("%Y%m%d"))
    record = DailyRecord(
        city=payload.city, date_key=date_key, date_iso=payload.date_iso,
        year=dt.year, month=dt.month,
        counterfactual=payload.counterfactual, observed=payload.observed,
        net_reduction=payload.net_reduction,
    )
    upsert_record(record)
    return {"ok": True}


@app.put("/api/admin/records/{record_id}")
def admin_update_record(record_id: int, payload: UpdatePayload) -> dict:
    ok = update_record(record_id=record_id, counterfactual=payload.counterfactual,
                       observed=payload.observed, net_reduction=payload.net_reduction)
    if not ok:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


@app.delete("/api/admin/records/{record_id}")
def admin_delete_record(record_id: int) -> dict:
    ok = delete_record(record_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


@app.post("/api/admin/reload-data")
def admin_reload_data() -> dict:
    result = reload_from_excel()
    return {"ok": True, **result}


# ==================== 前端 SPA fallback ====================

@app.get("/{catch_all:path}")
async def serve_frontend(request: Request, catch_all: str) -> HTMLResponse:
    """所有非 API 路径返回前端 index.html（支持 React SPA 路由）"""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(index_path.read_text(encoding="utf-8"))
    return HTMLResponse(
        f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/>
        <title>蓝天智评</title></head><body style="background:#020817;color:#e2e8f0;
        font-family:sans-serif;display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0"><div style="text-align:center">
        <h2 style="color:#06b6d4">蓝天智评 API 服务运行中</h2>
        <p>请先构建前端: <code>cd frontend && npm run build</code></p>
        <p>或开发模式: <code>cd frontend && npm run dev</code> (端口 5173)</p>
        <p style="margin-top:1em"><a href="/docs" style="color:#06b6d4">API 文档 →</a></p>
        </div></body></html>""",
        status_code=200,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
