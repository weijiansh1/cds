from __future__ import annotations

from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Optional

from .db import get_connection
from .xlsx_loader import DailyRecord, load_city_records

ROOT_DIR = Path(__file__).resolve().parents[1]
EXCEL_DIR = ROOT_DIR / "各个城市数据"

# 城市坐标信息
CITY_COORDS = {
    "北京市": [116.4074, 39.9042],
    "天津市": [117.2008, 39.0842],
    "石家庄市": [114.5149, 38.0428],
    "唐山市": [118.1802, 39.6305],
    "太原市": [112.5492, 37.857],
    "保定市": [115.4648, 38.8738],
    "廊坊市": [116.6838, 39.5385],
    "邯郸市": [114.5391, 36.6256],
    "秦皇岛市": [119.5976, 39.9366],
    "邢台市": [114.5047, 37.0682],
}

# 节假日期（简化版，2017-2024年主要节假日）
HOLIDAYS = [
    # 2017年
    "2017-01-01", "2017-01-27", "2017-01-28", "2017-01-29", "2017-01-30", "2017-01-31", "2017-02-01", "2017-02-02",
    "2017-04-02", "2017-04-03", "2017-04-04", "2017-04-29", "2017-04-30", "2017-05-01", "2017-05-28", "2017-05-29", "2017-05-30",
    "2017-10-01", "2017-10-02", "2017-10-03", "2017-10-04", "2017-10-05", "2017-10-06", "2017-10-07", "2017-10-08",
    # 2018年
    "2018-01-01", "2018-02-15", "2018-02-16", "2018-02-17", "2018-02-18", "2018-02-19", "2018-02-20", "2018-02-21",
    "2018-04-05", "2018-04-06", "2018-04-07", "2018-04-29", "2018-04-30", "2018-05-01", "2018-06-16", "2018-06-17", "2018-06-18",
    "2018-09-22", "2018-09-23", "2018-09-24", "2018-10-01", "2018-10-02", "2018-10-03", "2018-10-04", "2018-10-05", "2018-10-06", "2018-10-07",
    # 2019年
    "2019-01-01", "2019-02-04", "2019-02-05", "2019-02-06", "2019-02-07", "2019-02-08", "2019-02-09", "2019-02-10",
    "2019-04-05", "2019-04-06", "2019-04-07", "2019-04-29", "2019-04-30", "2019-05-01", "2019-05-03", "2019-05-04", "2019-05-05",
    "2019-06-07", "2019-06-08", "2019-06-09", "2019-09-13", "2019-09-14", "2019-09-15", "2019-10-01", "2019-10-02", "2019-10-03",
    "2019-10-04", "2019-10-05", "2019-10-06", "2019-10-07",
    # 2020年
    "2020-01-01", "2020-01-24", "2020-01-25", "2020-01-26", "2020-01-27", "2020-01-28", "2020-01-29", "2020-01-30", "2020-01-31",
    "2020-04-04", "2020-04-05", "2020-04-06", "2020-05-01", "2020-05-02", "2020-05-03", "2020-05-04", "2020-05-05",
    "2020-06-25", "2020-06-26", "2020-06-27", "2020-10-01", "2020-10-02", "2020-10-03", "2020-10-04", "2020-10-05", "2020-10-06", "2020-10-07", "2020-10-08",
    # 2021年
    "2021-01-01", "2021-02-11", "2021-02-12", "2021-02-13", "2021-02-14", "2021-02-15", "2021-02-16", "2021-02-17",
    "2021-04-03", "2021-04-04", "2021-04-05", "2021-05-01", "2021-05-02", "2021-05-03", "2021-05-04", "2021-05-05",
    "2021-06-12", "2021-06-13", "2021-06-14", "2021-09-19", "2021-09-20", "2021-09-21", "2021-10-01", "2021-10-02", "2021-10-03",
    "2021-10-04", "2021-10-05", "2021-10-06", "2021-10-07",
    # 2022年
    "2022-01-01", "2022-01-31", "2022-02-01", "2022-02-02", "2022-02-03", "2022-02-04", "2022-02-05", "2022-02-06",
    "2022-04-03", "2022-04-04", "2022-04-05", "2022-04-30", "2022-05-01", "2022-05-02", "2022-05-03", "2022-05-04",
    "2022-06-03", "2022-06-04", "2022-06-05", "2022-09-10", "2022-09-11", "2022-09-12", "2022-10-01", "2022-10-02", "2022-10-03",
    "2022-10-04", "2022-10-05", "2022-10-06", "2022-10-07",
    # 2023年
    "2023-01-01", "2023-01-21", "2023-01-22", "2023-01-23", "2023-01-24", "2023-01-25", "2023-01-26", "2023-01-27",
    "2023-04-05", "2023-04-29", "2023-04-30", "2023-05-01", "2023-05-02", "2023-05-03",
    "2023-06-22", "2023-06-23", "2023-06-24", "2023-09-29", "2023-09-30", "2023-10-01", "2023-10-02", "2023-10-03",
    "2023-10-04", "2023-10-05", "2023-10-06",
    # 2024年
    "2024-01-01", "2024-02-10", "2024-02-11", "2024-02-12", "2024-02-13", "2024-02-14", "2024-02-15", "2024-02-16", "2024-02-17",
    "2024-04-04", "2024-04-05", "2024-04-06", "2024-04-29", "2024-04-30", "2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04",
    "2024-06-08", "2024-06-09", "2024-06-10", "2024-09-15", "2024-09-16", "2024-09-17", "2024-10-01", "2024-10-02", "2024-10-03",
    "2024-10-04", "2024-10-05", "2024-10-06", "2024-10-07",
]

# 京津冀地区环保政策
POLICIES = [
    {
        "id": 1,
        "title": "《京津冀大气污染防治强化措施（2017-2020年）》",
        "year": 2017,
        "summary": "明确了京津冀地区大气污染联防联控的重点任务，包括燃煤锅炉淘汰、散乱污企业整治、机动车尾气治理等措施。",
        "url": "https://www.mee.gov.cn/xxgk/hjyw/201703/t20170330_409037.shtml"
    },
    {
        "id": 2,
        "title": "《京津冀及周边地区秋冬季大气污染综合治理攻坚行动方案》",
        "year": 2017,
        "summary": "针对秋冬季重污染天气，提出错峰生产、散煤替代、扬尘管控等具体措施，建立重污染天气应急响应机制。",
        "url": "https://www.mee.gov.cn/gkml/hbb/bwj/201708/t20170824_420330.htm"
    },
    {
        "id": 3,
        "title": "《河北省大气污染防治条例》",
        "year": 2017,
        "summary": "河北省地方性法规，明确了各级政府大气污染防治责任，规定了重点行业排放标准、清洁生产要求等内容。",
        "url": "https://hbepb.hebei.gov.cn/hbhjt/zwgk/zc/101633000437221.html"
    },
    {
        "id": 4,
        "title": "《京津冀协同发展生态环境保护规划》",
        "year": 2018,
        "summary": "规划了京津冀地区生态环境保护的总体目标和重点任务，提出到2020年区域PM2.5浓度比2013年下降40%左右。",
        "url": "https://www.caep.org.cn/yclm/jjjxtfzyggh/zxdt_21963/201706/t20170606_627665.shtml"
    },
    {
        "id": 5,
        "title": "《关于统筹推进疫情防控和经济社会发展生态环保工作的指导意见》",
        "year": 2020,
        "summary": "在疫情防控背景下，提出精准治污、科学治污、依法治污的要求，继续推进大气污染防治工作。",
        "url": "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202003/t20200304_767281.html"
    },
    {
        "id": 6,
        "title": "《京津冀及周边地区、汾渭平原2020-2021年秋冬季大气污染综合治理攻坚行动方案》",
        "year": 2020,
        "summary": "继续实施秋冬季攻坚行动，重点推进散煤治理、钢铁行业超低排放改造、柴油货车污染治理等工作。",
        "url": "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202011/t20201103_806152.html"
    },
    {
        "id": 7,
        "title": "《北京市大气污染防治条例》",
        "year": 2018,
        "summary": "北京市地方性法规，明确了北京市大气污染防治的各类措施，包括燃煤污染控制、机动车尾气管理、扬尘治理等。",
        "url": "https://www.bjrd.gov.cn/rdzl/dfxfgk/dfxfg/202101/t20210106_2200190.html"
    },
    {
        "id": 8,
        "title": "《天津市大气污染防治条例》",
        "year": 2019,
        "summary": "天津市地方性法规，建立了大气污染防治的监督管理体系，规定了重点排污单位在线监测、应急响应等内容。",
        "url": "https://jtys.tj.gov.cn/ZWXX2900/BMGZ8573/202007/t20200721_3024254.html"
    },
]


def reload_from_excel() -> dict[str, int]:
    inserted = 0
    file_count = 0
    with get_connection() as conn:
        conn.execute("DELETE FROM city_daily")
        for xlsx_path in sorted(EXCEL_DIR.glob("*.xlsx")):
            file_count += 1
            rows = load_city_records(xlsx_path)
            if not rows:
                continue
            conn.executemany(
                """
                INSERT OR REPLACE INTO city_daily
                (city, date_key, date_iso, year, month, counterfactual, observed, net_reduction)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        row.city,
                        row.date_key,
                        row.date_iso,
                        row.year,
                        row.month,
                        row.counterfactual,
                        row.observed,
                        row.net_reduction,
                    )
                    for row in rows
                ],
            )
            inserted += len(rows)
        conn.commit()

    return {"files": file_count, "rows": inserted}


def ensure_seed_data() -> None:
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM city_daily").fetchone()
    if not row or row["c"] == 0:
        reload_from_excel()


def list_cities() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute("SELECT DISTINCT city FROM city_daily ORDER BY city").fetchall()
    return [row["city"] for row in rows]


def overview_metrics() -> dict:
    with get_connection() as conn:
        totals = conn.execute(
            """
            SELECT COUNT(*) AS total_days,
                   AVG(counterfactual) AS avg_counterfactual,
                   AVG(observed) AS avg_observed,
                   AVG(net_reduction) AS avg_net
            FROM city_daily
            """
        ).fetchone()
        best_city = conn.execute(
            """
            SELECT city, AVG(net_reduction) AS avg_net
            FROM city_daily
            GROUP BY city
            ORDER BY avg_net DESC
            LIMIT 1
            """
        ).fetchone()
        worst_city = conn.execute(
            """
            SELECT city, AVG(net_reduction) AS avg_net
            FROM city_daily
            GROUP BY city
            ORDER BY avg_net ASC
            LIMIT 1
            """
        ).fetchone()

    return {
        "total_days": totals["total_days"] if totals else 0,
        "avg_counterfactual": round(totals["avg_counterfactual"] or 0.0, 2),
        "avg_observed": round(totals["avg_observed"] or 0.0, 2),
        "avg_net": round(totals["avg_net"] or 0.0, 2),
        "best_city": {"city": best_city["city"], "avg_net": round(best_city["avg_net"], 2)} if best_city else None,
        "worst_city": {"city": worst_city["city"], "avg_net": round(worst_city["avg_net"], 2)} if worst_city else None,
    }


def city_daily(city: str, start: Optional[str] = None, end: Optional[str] = None, limit: int = 365):
    params: list[object] = [city]
    conditions = ["city = ?"]
    if start:
        conditions.append("date_iso >= ?")
        params.append(start)
    if end:
        conditions.append("date_iso <= ?")
        params.append(end)

    sql = f"""
        SELECT id, city, date_iso, date_key, year, month, counterfactual, observed, net_reduction
        FROM city_daily
        WHERE {' AND '.join(conditions)}
        ORDER BY date_key ASC
    """
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()

    if limit and len(rows) > limit:
        rows = rows[-limit:]

    return [dict(row) for row in rows]


def city_monthly(city: str):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT year,
                   month,
                   AVG(counterfactual) AS avg_counterfactual,
                   AVG(observed) AS avg_observed,
                   AVG(net_reduction) AS avg_net,
                   SUM(CASE WHEN net_reduction > 0 THEN 1 ELSE 0 END) AS positive_days,
                   COUNT(*) AS total_days
            FROM city_daily
            WHERE city = ?
            GROUP BY year, month
            ORDER BY year, month
            """,
            (city,),
        ).fetchall()

    return [
        {
            "year": row["year"],
            "month": row["month"],
            "label": f"{row['year']}-{row['month']:02d}",
            "avg_counterfactual": round(row["avg_counterfactual"], 2),
            "avg_observed": round(row["avg_observed"], 2),
            "avg_net": round(row["avg_net"], 2),
            "positive_days": row["positive_days"],
            "total_days": row["total_days"],
        }
        for row in rows
    ]


def city_comparison():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT city,
                   AVG(counterfactual) AS avg_counterfactual,
                   AVG(observed) AS avg_observed,
                   AVG(net_reduction) AS avg_net,
                   SUM(CASE WHEN net_reduction > 0 THEN 1 ELSE 0 END) AS positive_days,
                   COUNT(*) AS total_days
            FROM city_daily
            GROUP BY city
            ORDER BY avg_net DESC
            """
        ).fetchall()

    output = []
    for row in rows:
        positive_ratio = (row["positive_days"] / row["total_days"]) if row["total_days"] else 0.0
        output.append(
            {
                "city": row["city"],
                "avg_counterfactual": round(row["avg_counterfactual"], 2),
                "avg_observed": round(row["avg_observed"], 2),
                "avg_net": round(row["avg_net"], 2),
                "positive_ratio": round(positive_ratio, 4),
                "positive_days": row["positive_days"],
                "total_days": row["total_days"],
            }
        )
    return output


def alerts(city: str, limit: int = 10):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT city, date_iso, observed, counterfactual, net_reduction
            FROM city_daily
            WHERE city = ? AND (net_reduction < 0 OR observed > 150)
            ORDER BY date_key DESC
            LIMIT ?
            """,
            (city, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def transfer_overview(source_city: str = "北京市") -> dict:
    with get_connection() as conn:
        src_rows = conn.execute(
            """
            SELECT date_key, counterfactual, net_reduction
            FROM city_daily
            WHERE city = ? AND counterfactual > 0
            ORDER BY date_key
            """,
            (source_city,),
        ).fetchall()

        city_rows = conn.execute(
            """
            SELECT city,
                   AVG(net_reduction) AS avg_net,
                   AVG(counterfactual) AS avg_counterfactual,
                   AVG(observed) AS avg_observed
            FROM city_daily
            GROUP BY city
            ORDER BY city
            """
        ).fetchall()

    if not src_rows:
        return {"source_city": source_city, "cities": []}

    src_ratio_avg = mean(row["net_reduction"] / row["counterfactual"] for row in src_rows if row["counterfactual"] > 0)

    result_cities = []
    for row in city_rows:
        if row["city"] == source_city:
            continue
        target_counterfactual = row["avg_counterfactual"] or 0.0
        expected_net = src_ratio_avg * target_counterfactual
        actual_net = row["avg_net"] or 0.0

        discount = 0.0
        if expected_net > 0:
            discount = max(0.0, min(1.0, actual_net / expected_net))

        attenuation = 1 - discount
        result_cities.append(
            {
                "city": row["city"],
                "expected_net": round(expected_net, 2),
                "actual_net": round(actual_net, 2),
                "discount": round(discount, 3),
                "attenuation": round(attenuation, 3),
                "avg_observed": round(row["avg_observed"] or 0.0, 2),
            }
        )

    result_cities.sort(key=lambda item: item["discount"], reverse=True)

    return {
        "source_city": source_city,
        "source_ratio": round(src_ratio_avg, 3),
        "cities": result_cities,
    }


def list_records(city: Optional[str], limit: int, offset: int):
    params: list[object] = []
    where = ""
    if city:
        where = "WHERE city = ?"
        params.append(city)

    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT id, city, date_iso, date_key, counterfactual, observed, net_reduction, updated_at
            FROM city_daily
            {where}
            ORDER BY date_key DESC
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()
        total_query = "SELECT COUNT(*) AS c FROM city_daily " + where
        total_row = conn.execute(total_query, params).fetchone()

    return {
        "total": total_row["c"] if total_row else 0,
        "items": [dict(row) for row in rows],
    }


def upsert_record(record: DailyRecord) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO city_daily
            (city, date_key, date_iso, year, month, counterfactual, observed, net_reduction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(city, date_key) DO UPDATE SET
              counterfactual=excluded.counterfactual,
              observed=excluded.observed,
              net_reduction=excluded.net_reduction,
              year=excluded.year,
              month=excluded.month
            """,
            (
                record.city,
                record.date_key,
                record.date_iso,
                record.year,
                record.month,
                record.counterfactual,
                record.observed,
                record.net_reduction,
            ),
        )
        conn.commit()


def update_record(
    record_id: int,
    counterfactual: float,
    observed: float,
    net_reduction: float,
) -> bool:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE city_daily
            SET counterfactual = ?, observed = ?, net_reduction = ?
            WHERE id = ?
            """,
            (counterfactual, observed, net_reduction, record_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def delete_record(record_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM city_daily WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_season(date_iso: str) -> str:
    """根据日期获取季节"""
    try:
        dt = datetime.strptime(date_iso, "%Y-%m-%d")
        month = dt.month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "autumn"
    except:
        return "unknown"


def is_holiday(date_iso: str) -> bool:
    """判断是否为节假日"""
    return date_iso in HOLIDAYS


def is_heating_season(date_iso: str) -> bool:
    """判断是否为采暖期（11月-次年3月）"""
    try:
        dt = datetime.strptime(date_iso, "%Y-%m-%d")
        month = dt.month
        return month in [11, 12, 1, 2, 3]
    except:
        return False


def seasonal_statistics(city: Optional[str] = None) -> dict:
    """获取季节性统计"""
    params = []
    where = ""
    if city:
        where = "WHERE city = ?"
        params.append(city)

    with get_connection() as conn:
        # 获取所有数据
        rows = conn.execute(
            f"""
            SELECT city, date_iso, net_reduction, counterfactual, observed
            FROM city_daily
            {where}
            ORDER BY date_key
            """,
            params,
        ).fetchall()

    if not rows:
        return {"seasons": {}, "heating": {}, "holiday": {}}

    # 按季节统计
    season_data = {"winter": [], "spring": [], "summer": [], "autumn": []}
    heating_data = {"heating": [], "non_heating": []}
    holiday_data = {"holiday": [], "workday": []}

    for row in rows:
        net = row["net_reduction"] or 0
        season = get_season(row["date_iso"])
        if season in season_data:
            season_data[season].append(net)

        if is_heating_season(row["date_iso"]):
            heating_data["heating"].append(net)
        else:
            heating_data["non_heating"].append(net)

        if is_holiday(row["date_iso"]):
            holiday_data["holiday"].append(net)
        else:
            holiday_data["workday"].append(net)

    def calc_stats(data_list):
        if not data_list:
            return {"avg_net": 0, "count": 0, "positive_ratio": 0}
        avg_net = sum(data_list) / len(data_list)
        positive_count = sum(1 for x in data_list if x > 0)
        return {
            "avg_net": round(avg_net, 2),
            "count": len(data_list),
            "positive_ratio": round(positive_count / len(data_list), 4)
        }

    result = {
        "seasons": {k: calc_stats(v) for k, v in season_data.items()},
        "heating": {k: calc_stats(v) for k, v in heating_data.items()},
        "holiday": {k: calc_stats(v) for k, v in holiday_data.items()},
    }

    if city:
        result["city"] = city

    return result


def seasonal_comparison() -> dict:
    """获取所有城市的季节性对比"""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT city, date_iso, net_reduction
            FROM city_daily
            ORDER BY city, date_key
            """
        ).fetchall()

    if not rows:
        return {"cities": []}

    # 按城市和季节分组
    city_season_data = {}
    for row in rows:
        city = row["city"]
        if city not in city_season_data:
            city_season_data[city] = {"winter": [], "spring": [], "summer": [], "autumn": []}
        season = get_season(row["date_iso"])
        if season in city_season_data[city]:
            city_season_data[city][season].append(row["net_reduction"] or 0)

    def calc_avg(data_list):
        if not data_list:
            return 0
        return round(sum(data_list) / len(data_list), 2)

    cities_result = []
    for city, seasons in city_season_data.items():
        cities_result.append({
            "city": city,
            "winter": calc_avg(seasons["winter"]),
            "spring": calc_avg(seasons["spring"]),
            "summer": calc_avg(seasons["summer"]),
            "autumn": calc_avg(seasons["autumn"]),
        })

    # 按冬季净减排排序
    cities_result.sort(key=lambda x: x["winter"], reverse=True)

    return {"cities": cities_result}


def get_policies() -> dict:
    """获取环保政策列表"""
    return {"policies": POLICIES, "count": len(POLICIES)}


def get_city_coords() -> dict:
    """获取所有城市的坐标"""
    return {"cities": CITY_COORDS}
