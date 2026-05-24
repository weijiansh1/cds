"""实时数据代理 + 时空融合分析服务"""
from __future__ import annotations

import json
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from statistics import mean
from typing import Optional

import urllib.request

from .db import get_connection
from .service import CITY_COORDS, POLICIES

CACHE_TTL = 300
_realtime_cache: dict = {"data": None, "ts": 0}
MAX_WORKERS = 6  # 并行请求数

# 13个城市的Open-Meteo坐标（经纬度 + 城市名对应）
OPENMETEO_CITIES = {
    "北京市": {"lat": 39.90, "lon": 116.41},
    "天津市": {"lat": 39.08, "lon": 117.20},
    "石家庄市": {"lat": 38.04, "lon": 114.51},
    "唐山市": {"lat": 39.63, "lon": 118.18},
    "太原市": {"lat": 37.87, "lon": 112.55},
    "保定市": {"lat": 38.87, "lon": 115.46},
    "廊坊市": {"lat": 39.54, "lon": 116.68},
    "邯郸市": {"lat": 36.63, "lon": 114.54},
    "秦皇岛市": {"lat": 39.94, "lon": 119.60},
    "邢台市": {"lat": 37.07, "lon": 114.50},
    "济南市": {"lat": 36.65, "lon": 117.00},
    "郑州市": {"lat": 34.75, "lon": 113.63},
    "沈阳市": {"lat": 41.80, "lon": 123.43},
}


def _fetch_openmeteo(city_name: str) -> dict | None:
    """从 Open-Meteo 获取单个城市的实时空气质量数据"""
    city = OPENMETEO_CITIES.get(city_name)
    if not city:
        return None

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={city['lat']}&longitude={city['lon']}"
        f"&current=pm2_5,pm10,european_aqi,us_aqi"
        f"&timezone=Asia/Shanghai"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BlueSkyEval/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        current = data.get("current", {})
        return {
            "city": city_name,
            "pm2_5": current.get("pm2_5"),
            "pm10": current.get("pm10"),
            "aqi": current.get("european_aqi") or current.get("us_aqi"),
            "time": current.get("time", ""),
        }
    except Exception:
        return {"city": city_name, "pm2_5": None, "pm10": None, "aqi": None, "time": None, "error": True}


def get_realtime_all(cached_only: bool = False) -> dict:
    """获取所有城市的实时数据（带缓存，并行请求）

    cached_only=True 时：有缓存直接返回，无缓存返回空数据（不等待外部API）
    """
    now = time.time()
    if _realtime_cache["data"] is not None and (now - _realtime_cache["ts"]) < CACHE_TTL:
        return _realtime_cache["data"]

    if cached_only:
        # 返回空数据，不阻塞
        return {
            "timestamp": datetime.now().isoformat(),
            "cities": [],
            "count": 0,
            "pending": True,
        }

    results = []
    city_names = list(OPENMETEO_CITIES.keys())

    # 并行请求所有城市（最多 MAX_WORKERS 个并发）
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {
            executor.submit(_fetch_openmeteo, name): name
            for name in city_names
        }
        for future in as_completed(future_map, timeout=8):
            try:
                data = future.result(timeout=3)
                if data:
                    results.append(data)
            except Exception:
                results.append({
                    "city": future_map[future],
                    "pm2_5": None, "pm10": None, "aqi": None, "time": None, "error": True,
                })

    # 计算反事实估计值
    for item in results:
        item["counterfactual"] = _estimate_counterfactual(item["city"])
        if item["pm2_5"] is not None and item["counterfactual"] is not None:
            item["net_reduction"] = round(item["counterfactual"] - item["pm2_5"], 2)
        else:
            item["net_reduction"] = None

    output = {
        "timestamp": datetime.now().isoformat(),
        "cities": results,
        "count": len(results),
    }
    _realtime_cache["data"] = output
    _realtime_cache["ts"] = now
    return output


def _estimate_counterfactual(city_name: str) -> Optional[float]:
    """基于历史数据估算当前的反事实PM2.5值"""
    met_base = {
        "北京市": 90, "天津市": 82, "石家庄市": 115, "唐山市": 95,
        "太原市": 80, "保定市": 110, "廊坊市": 85, "邯郸市": 105,
        "秦皇岛市": 68, "邢台市": 108, "济南市": 88, "郑州市": 92, "沈阳市": 78,
    }
    base = met_base.get(city_name, 85)
    month = datetime.now().month
    seasonal = 1.0 + 0.25 * math.cos(2 * math.pi * (month - 1) / 12)
    return round(base * seasonal, 1)


def warmup_realtime_cache() -> None:
    """后台预热：启动时异步获取实时数据填充缓存"""
    import threading

    def _fetch():
        try:
            get_realtime_all(cached_only=False)
        except Exception:
            pass

    t = threading.Thread(target=_fetch, daemon=True)
    t.start()


def get_time_comparison(target_date: str) -> dict:
    """时光对比：对比指定历史日期 vs 当前实时

    target_date: YYYY-MM-DD 格式的历史日期
    返回:
        - 历史同期数据
        - 当前实时数据
        - 对比摘要
    """
    try:
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError:
        return {"error": "日期格式错误，请使用 YYYY-MM-DD"}

    # 获取当前实时数据
    realtime = get_realtime_all()

    # 获取历史同期日期（月/日相同，查找所有可用年份）
    target_month = target_dt.month
    target_day = target_dt.day

    with get_connection() as conn:
        # 查找与目标月日相同的历史记录
        rows = conn.execute(
            """
            SELECT city, date_iso, year, observed, counterfactual, net_reduction
            FROM city_daily
            WHERE month = ? AND CAST(SUBSTR(date_iso, 9, 2) AS INTEGER) = ?
            ORDER BY year DESC, city
            """,
            (target_month, target_day),
        ).fetchall()

    # 按年份分组
    historical_by_year = {}
    for row in rows:
        year = row["year"]
        if year not in historical_by_year:
            historical_by_year[year] = []
        historical_by_year[year].append({
            "city": row["city"],
            "date": row["date_iso"],
            "observed": row["observed"],
            "counterfactual": row["counterfactual"],
            "net_reduction": row["net_reduction"],
        })

    # 计算历史同期平均值（按城市）
    historical_avg = {}
    for row in rows:
        city = row["city"]
        if city not in historical_avg:
            historical_avg[city] = []
        historical_avg[city].append({
            "year": row["year"],
            "observed": row["observed"],
            "counterfactual": row["counterfactual"],
            "net_reduction": row["net_reduction"],
        })

    # 生成对比摘要
    comparison = []
    for city_name in sorted(CITY_COORDS.keys()):
        city_realtime = next((c for c in realtime.get("cities", []) if c["city"] == city_name), None)
        city_histories = historical_avg.get(city_name, [])

        entry = {
            "city": city_name,
            "realtime": {
                "pm2_5": city_realtime["pm2_5"] if city_realtime else None,
                "counterfactual": city_realtime["counterfactual"] if city_realtime else None,
                "net_reduction": city_realtime["net_reduction"] if city_realtime else None,
            },
            "historical": city_histories[:5] if city_histories else [],
        }

        # 计算改善幅度（最近一年 vs 实时）
        if city_histories and city_realtime and city_realtime["pm2_5"] is not None:
            latest_hist = city_histories[0]["observed"]
            if latest_hist and latest_hist > 0:
                improvement = round((latest_hist - city_realtime["pm2_5"]) / latest_hist * 100, 1)
                entry["improvement_pct"] = improvement
            else:
                entry["improvement_pct"] = None
        else:
            entry["improvement_pct"] = None

        comparison.append(entry)

    return {
        "target_date": target_date,
        "target_month": target_month,
        "target_day": target_day,
        "comparison": comparison,
        "historical_by_year": {str(k): v for k, v in historical_by_year.items()},
    }


def get_policy_timeline() -> dict:
    """政策成效追踪：每个政策节点关联前后数据变化"""
    result = []
    for policy in POLICIES:
        policy_year = policy["year"]

        with get_connection() as conn:
            # 政策实施前一年的平均数据
            before = conn.execute(
                """
                SELECT AVG(observed) AS avg_observed,
                       AVG(counterfactual) AS avg_counterfactual,
                       AVG(net_reduction) AS avg_net
                FROM city_daily
                WHERE year = ?
                """,
                (policy_year - 1,),
            ).fetchone()

            # 政策实施后一年的平均数据
            after = conn.execute(
                """
                SELECT AVG(observed) AS avg_observed,
                       AVG(counterfactual) AS avg_counterfactual,
                       AVG(net_reduction) AS avg_net
                FROM city_daily
                WHERE year = ?
                """,
                (policy_year + 1,),
            ).fetchone()

        # 按城市获取该政策年份前后的数据
        with get_connection() as conn:
            city_changes = conn.execute(
                """
                SELECT city,
                       AVG(CASE WHEN year = ? THEN observed END) AS before_observed,
                       AVG(CASE WHEN year = ? THEN observed END) AS after_observed,
                       AVG(CASE WHEN year = ? THEN net_reduction END) AS before_net,
                       AVG(CASE WHEN year = ? THEN net_reduction END) AS after_net
                FROM city_daily
                WHERE year IN (?, ?)
                GROUP BY city
                """,
                (policy_year - 1, policy_year + 1, policy_year - 1, policy_year + 1,
                 policy_year - 1, policy_year + 1),
            ).fetchall()

        cities_impact = []
        for row in city_changes:
            change = None
            if row["before_observed"] and row["after_observed"]:
                change = round(row["after_observed"] - row["before_observed"], 2)
            cities_impact.append({
                "city": row["city"],
                "before_observed": round(row["before_observed"], 2) if row["before_observed"] else None,
                "after_observed": round(row["after_observed"], 2) if row["after_observed"] else None,
                "change": change,
                "before_net": round(row["before_net"], 2) if row["before_net"] else None,
                "after_net": round(row["after_net"], 2) if row["after_net"] else None,
            })

        before_obs = round(before["avg_observed"], 2) if before and before["avg_observed"] else None
        after_obs = round(after["avg_observed"], 2) if after and after["avg_observed"] else None
        overall_change = None
        if before_obs is not None and after_obs is not None:
            overall_change = round(after_obs - before_obs, 2)

        result.append({
            **policy,
            "before_year": policy_year - 1 if policy_year > 2017 else None,
            "after_year": policy_year + 1 if policy_year < 2024 else None,
            "before_avg_observed": before_obs,
            "after_avg_observed": after_obs,
            "overall_change": overall_change,
            "before_avg_net": round(before["avg_net"], 2) if before and before["avg_net"] else None,
            "after_avg_net": round(after["avg_net"], 2) if after and after["avg_net"] else None,
            "cities_impact": cities_impact,
        })

    return {"policies": result, "count": len(result)}


def get_network_data() -> dict:
    """城市联防联控网络数据：污染传输关系 + 实时状态"""
    # 城市间距离信息（相邻城市）
    edges = [
        ("北京市", "天津市", 120),
        ("北京市", "廊坊市", 60),
        ("北京市", "保定市", 140),
        ("北京市", "唐山市", 180),
        ("天津市", "廊坊市", 80),
        ("天津市", "唐山市", 120),
        ("天津市", "沧州市", 100),
        ("石家庄市", "保定市", 140),
        ("石家庄市", "邢台市", 110),
        ("石家庄市", "邯郸市", 160),
        ("石家庄市", "太原市", 220),
        ("保定市", "廊坊市", 160),
        ("保定市", "沧州市", 140),
        ("唐山市", "秦皇岛市", 140),
        ("邢台市", "邯郸市", 55),
        ("太原市", "邯郸市", 300),
        ("邢台市", "济南市", 260),
        ("廊坊市", "沧州市", 130),
    ]

    realtime = get_realtime_all()
    city_map = {}
    for c in realtime.get("cities", []):
        city_map[c["city"]] = c

    # 获取各城市的历史净减排数据
    with get_connection() as conn:
        city_stats = conn.execute(
            """
            SELECT city, AVG(net_reduction) AS avg_net, AVG(observed) AS avg_obs, AVG(counterfactual) AS avg_cf
            FROM city_daily GROUP BY city
            """
        ).fetchall()

    stats_map = {}
    for row in city_stats:
        stats_map[row["city"]] = {
            "avg_net": round(row["avg_net"], 2),
            "avg_obs": round(row["avg_obs"], 2),
            "avg_cf": round(row["avg_cf"], 2),
        }

    # 构建节点
    nodes = []
    for city_name in sorted(CITY_COORDS.keys()):
        rt = city_map.get(city_name, {})
        st = stats_map.get(city_name, {})
        nodes.append({
            "id": city_name,
            "coords": CITY_COORDS[city_name],
            "pm2_5": rt.get("pm2_5"),
            "aqi": rt.get("aqi"),
            "counterfactual": rt.get("counterfactual"),
            "net_reduction": rt.get("net_reduction"),
            "avg_observed": st.get("avg_obs"),
            "avg_net": st.get("avg_net"),
        })

    # 构建边（含传输强度估算）
    network_edges = []
    for src, tgt, dist in edges:
        src_node = city_map.get(src, {})
        tgt_node = city_map.get(tgt, {})

        # 传输权重估算：距离衰减 + PM2.5梯度
        weight = round(1.0 / (dist / 100.0), 4) if dist > 0 else 1.0

        src_pm = src_node.get("pm2_5") or 0
        tgt_pm = tgt_node.get("pm2_5") or 0
        gradient = max(0, src_pm - tgt_pm)
        transfer_intensity = round(weight * (1 + gradient / 50), 3)

        network_edges.append({
            "source": src,
            "target": tgt,
            "distance_km": dist,
            "weight": weight,
            "src_pm2_5": src_pm if src_pm else None,
            "tgt_pm2_5": tgt_pm if tgt_pm else None,
            "transfer_intensity": transfer_intensity,
        })

    # 计算联防联控指标
    total_nodes = len(nodes)
    total_edges = len(network_edges)
    avg_intensity = mean(e["transfer_intensity"] for e in network_edges) if network_edges else 0

    return {
        "nodes": nodes,
        "edges": network_edges,
        "stats": {
            "node_count": total_nodes,
            "edge_count": total_edges,
            "avg_transfer_intensity": round(avg_intensity, 3),
            "network_density": round(2 * total_edges / (total_nodes * (total_nodes - 1)), 4) if total_nodes > 1 else 0,
        },
    }


def get_realtime_history(city: str, hours: int = 48) -> dict:
    """获取城市最近N小时的实时数据（用于趋势图）"""
    city_info = OPENMETEO_CITIES.get(city)
    if not city_info:
        return {"error": f"未知城市: {city}"}

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={city_info['lat']}&longitude={city_info['lon']}"
        f"&hourly=pm2_5,pm10,european_aqi"
        f"&past_days=2&timezone=Asia/Shanghai"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BlueSkyEval/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return {"error": "获取数据失败", "city": city}

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    pm25 = hourly.get("pm2_5", [])

    # Open-Meteo 的 hourly 序列可能包含未来预报小时；趋势图只保留当前时刻以前的数据。
    now_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
    filtered: list[tuple[str, Optional[float]]] = []
    for i, value in enumerate(times):
        try:
            item_time = datetime.fromisoformat(str(value))
        except ValueError:
            continue
        if item_time <= now_hour:
            filtered.append((str(value), pm25[i] if i < len(pm25) else None))

    # 极端情况下外部接口只返回未来预报时，用本地时间兜底，避免前端出现未来日期。
    if not filtered:
        fallback_times = [
            (now_hour - timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00")
            for offset in range(hours - 1, -1, -1)
        ]
        filtered = [(value, None) for value in fallback_times]

    if len(filtered) > hours:
        filtered = filtered[-hours:]

    # 估算反事实值
    cf_base = _estimate_counterfactual(city) or 80
    series = []
    for t, pm in filtered:
        month = datetime.now().month
        seasonal = 1.0 + 0.25 * math.cos(2 * math.pi * (month - 1) / 12)
        cf = round(cf_base * seasonal, 1)
        reduction = round(cf - pm, 2) if pm is not None and cf is not None else None
        series.append({
            "time": t,
            "pm2_5": pm,
            "counterfactual": cf,
            "net_reduction": reduction,
        })

    valid_pm25 = [s["pm2_5"] for s in series if s["pm2_5"] is not None]
    valid_reductions = [s["net_reduction"] for s in series if s["net_reduction"] is not None]
    return {
        "city": city,
        "hours": hours,
        "series": series,
        "avg_pm2_5": round(mean(valid_pm25), 2) if valid_pm25 else None,
        "avg_reduction": round(mean(valid_reductions), 2) if valid_reductions else None,
    }


def get_realtime_forecast(city: str, hours: int = 48) -> dict:
    """Return the next N hourly PM2.5 forecast values for the trend chart."""
    city_info = OPENMETEO_CITIES.get(city)
    if not city_info:
        return {"error": f"未知城市: {city}"}

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={city_info['lat']}&longitude={city_info['lon']}"
        f"&hourly=pm2_5,pm10,european_aqi"
        f"&past_days=1&timezone=Asia/Shanghai"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BlueSkyEval/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return {"error": "获取数据失败", "city": city}

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    pm25 = hourly.get("pm2_5", [])

    now_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
    filtered: list[tuple[str, Optional[float]]] = []
    for i, value in enumerate(times):
        try:
            item_time = datetime.fromisoformat(str(value))
        except ValueError:
            continue
        if item_time > now_hour:
            filtered.append((str(value), pm25[i] if i < len(pm25) else None))

    if len(filtered) < hours:
        existing = {value for value, _ in filtered}
        for offset in range(1, hours + 1):
            value = (now_hour + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00")
            if value not in existing:
                filtered.append((value, None))
                existing.add(value)
            if len(filtered) >= hours:
                break

    filtered = sorted(filtered, key=lambda item: item[0])[:hours]

    cf_base = _estimate_counterfactual(city) or 80
    series = []
    for t, pm in filtered:
        try:
            month = datetime.fromisoformat(str(t)).month
        except ValueError:
            month = datetime.now().month
        seasonal = 1.0 + 0.25 * math.cos(2 * math.pi * (month - 1) / 12)
        cf = round(cf_base * seasonal, 1)
        reduction = round(cf - pm, 2) if pm is not None and cf is not None else None
        series.append({
            "time": t,
            "pm2_5": pm,
            "counterfactual": cf,
            "net_reduction": reduction,
        })

    valid_pm25 = [s["pm2_5"] for s in series if s["pm2_5"] is not None]
    valid_reductions = [s["net_reduction"] for s in series if s["net_reduction"] is not None]
    return {
        "city": city,
        "hours": hours,
        "series": series,
        "avg_pm2_5": round(mean(valid_pm25), 2) if valid_pm25 else None,
        "avg_reduction": round(mean(valid_reductions), 2) if valid_reductions else None,
    }
