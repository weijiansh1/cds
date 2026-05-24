/**
 * 空气质量数据服务 — 适配层
 * 从蓝天智评后端 API 获取数据，映射为前端组件需要的格式
 */

export interface MeteoSnapshot {
  windSpeed: number;
  blh: number;
  humidity: number;
  temperature: number;
}

export interface CityRealtime {
  city: string;
  pm25: number;
  pm10: number;
  aqi: number;
  meteo: MeteoSnapshot;
  counterfactual: number;
  reduction: number;
  reductionPct: number;
}

export interface TimeSeriesPoint {
  time: string;
  hour: string;
  actual: number;
  counterfactual: number;
  reduction: number;
}

const API = '/api';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toHour(time: string): string {
  const d = new Date(time);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  return `${m}/${day} ${h}`;
}

/** 从后端获取所有城市实时数据，映射为原组件格式 */
export async function fetchAllCityRealtime(): Promise<CityRealtime[]> {
  const data = await fetchJSON<any>(`${API}/realtime/current`);
  const cities = data.cities || [];

  return cities.map((c: any) => {
    const pm25 = c.pm2_5 ?? 50;
    const cf = c.counterfactual ?? 80;
    const reduction = c.net_reduction ?? (cf - pm25);
    return {
      city: c.city,
      pm25,
      pm10: c.pm10 ?? pm25 * 1.5,
      aqi: c.aqi ?? 50,
      meteo: {
        windSpeed: 3,
        blh: 800,
        humidity: 60,
        temperature: 15,
      },
      counterfactual: cf,
      reduction,
      reductionPct: cf > 0 ? (reduction / cf) * 100 : 0,
    };
  });
}

/** 从后端获取北京48小时时序数据 */
export async function fetchBeijingTimeSeries(hours: number = 48): Promise<TimeSeriesPoint[]> {
  try {
    const data = await fetchJSON<any>(`${API}/realtime/history/${encodeURIComponent('北京市')}?hours=${hours}`);
    const series = data.series || [];
    return series.map((s: any) => ({
      time: s.time,
      hour: toHour(s.time),
      actual: s.pm2_5 ?? 0,
      counterfactual: s.counterfactual ?? 80,
      reduction: s.net_reduction ?? 0,
    }));
  } catch {
    return [];
  }
}
