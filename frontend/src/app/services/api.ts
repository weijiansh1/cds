const BASE = '/api';

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export interface CityRealtime {
  city: string;
  pm2_5: number | null;
  pm10: number | null;
  aqi: number | null;
  counterfactual: number | null;
  net_reduction: number | null;
  time: string;
  error?: boolean;
}

export interface RealtimeResponse {
  timestamp: string;
  cities: CityRealtime[];
  count: number;
}

export interface CityComparison {
  city: string;
  avg_counterfactual: number;
  avg_observed: number;
  avg_net: number;
  positive_ratio: number;
  positive_days: number;
  total_days: number;
}

export interface OverviewMetrics {
  total_days: number;
  avg_counterfactual: number;
  avg_observed: number;
  avg_net: number;
  best_city: { city: string; avg_net: number } | null;
  worst_city: { city: string; avg_net: number } | null;
}

export interface MonthlyItem {
  year: number;
  month: number;
  label: string;
  avg_counterfactual: number;
  avg_observed: number;
  avg_net: number;
  positive_days: number;
  total_days: number;
}

export interface HistorySeriesPoint {
  time: string;
  pm2_5: number | null;
  counterfactual: number;
  net_reduction: number | null;
}

export interface HistoryResponse {
  city: string;
  hours: number;
  series: HistorySeriesPoint[];
  avg_pm2_5: number | null;
  avg_reduction: number | null;
}

export interface TimeComparisonItem {
  city: string;
  realtime: { pm2_5: number | null; counterfactual: number | null; net_reduction: number | null };
  historical: Array<{ year: number; observed: number; counterfactual: number; net_reduction: number }>;
  improvement_pct: number | null;
}

export interface TimeComparisonResponse {
  target_date: string;
  comparison: TimeComparisonItem[];
}

export interface PolicyItem {
  id: number;
  title: string;
  year: number;
  summary: string;
  url: string;
  before_avg_observed: number | null;
  after_avg_observed: number | null;
  before_year: number | null;
  after_year: number | null;
  overall_change: number | null;
  before_avg_net: number | null;
  after_avg_net: number | null;
  cities_impact: Array<{ city: string; before_observed: number | null; after_observed: number | null; change: number | null }>;
}

export interface NetworkNode {
  id: string;
  coords: [number, number];
  pm2_5: number | null;
  aqi: number | null;
  net_reduction: number | null;
  avg_observed: number | null;
  avg_net: number | null;
}

export interface NetworkEdge {
  source: string;
  target: string;
  distance_km: number;
  weight: number;
  transfer_intensity: number;
  src_pm2_5: number | null;
  tgt_pm2_5: number | null;
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: { node_count: number; edge_count: number; avg_transfer_intensity: number; network_density: number };
}

export interface SeasonalStatsResponse {
  seasons: Record<string, { avg_net: number; count: number; positive_ratio: number }>;
  heating: Record<string, { avg_net: number; count: number; positive_ratio: number }>;
  holiday: Record<string, { avg_net: number; count: number; positive_ratio: number }>;
}

// 实时数据
export const getRealtime = () => fetchJSON<RealtimeResponse>(`${BASE}/realtime/current`);
export const getRealtimeQuick = () => fetchJSON<RealtimeResponse>(`${BASE}/realtime/quick`);
export const getRealtimeHistory = (city: string, hours?: number) =>
  fetchJSON<HistoryResponse>(`${BASE}/realtime/history/${encodeURIComponent(city)}?hours=${hours || 48}`);
export const getRealtimeForecast = (city: string, hours?: number) =>
  fetchJSON<HistoryResponse>(`${BASE}/realtime/forecast/${encodeURIComponent(city)}?hours=${hours || 48}`);

// 历史数据
export const getOverview = () => fetchJSON<OverviewMetrics>(`${BASE}/overview`);
export const getCities = () => fetchJSON<{ cities: string[] }>(`${BASE}/cities`);
export const getComparison = () => fetchJSON<{ items: CityComparison[] }>(`${BASE}/comparison`);
export const getCityMonthly = (city: string) =>
  fetchJSON<{ city: string; count: number; items: MonthlyItem[] }>(`${BASE}/city/${encodeURIComponent(city)}/monthly`);
export const getCityDaily = (city: string, limit?: number) =>
  fetchJSON<{ city: string; count: number; items: any[] }>(`${BASE}/city/${encodeURIComponent(city)}/daily?limit=${limit || 365}`);
export const getAlerts = (city: string) =>
  fetchJSON<{ city: string; items: any[] }>(`${BASE}/alerts?city=${encodeURIComponent(city)}`);

// 创意功能
export const getTimeComparison = (date: string) =>
  fetchJSON<TimeComparisonResponse>(`${BASE}/time-comparison?target_date=${date}`);
export const getPolicyTimeline = () => fetchJSON<{ policies: PolicyItem[] }>(`${BASE}/policy-timeline`);
export const getNetworkData = () => fetchJSON<NetworkResponse>(`${BASE}/network`);

// 季节性分析
export const getSeasonalStats = (city?: string) =>
  fetchJSON<SeasonalStatsResponse>(`${BASE}/seasonal/statistics${city ? `?city=${encodeURIComponent(city)}` : ''}`);
export const getTransfer = (sourceCity: string) =>
  fetchJSON<any>(`${BASE}/transfer?source_city=${encodeURIComponent(sourceCity)}`);
