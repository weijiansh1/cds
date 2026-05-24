import { useEffect, useState } from 'react';
import {
  fetchAllCityRealtime,
  fetchBeijingTimeSeries,
  CityRealtime,
  TimeSeriesPoint,
} from '../services/airQualityService';

export interface AirQualityState {
  cities: CityRealtime[];
  series: TimeSeriesPoint[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * 每 5 分钟从 Open-Meteo 拉取一次京津冀实时空气质量 + 反事实预测。
 * 拉取失败时回退到基于反事实模型的离线数据，保证大屏不出现空状态。
 */
export function useAirQuality(refreshMs: number = 5 * 60 * 1000): AirQualityState {
  const [state, setState] = useState<AirQualityState>({
    cities: [],
    series: [],
    loading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cities, series] = await Promise.all([
          fetchAllCityRealtime(),
          fetchBeijingTimeSeries(48),
        ]);
        if (cancelled) return;
        setState({ cities, series, loading: false, error: null, lastUpdate: new Date() });
      } catch (e) {
        if (cancelled) return;
        setState(prev => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : 'fetch failed',
        }));
      }
    }

    load();
    const id = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshMs]);

  return state;
}
