import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Line, Legend } from 'recharts';
import { getRealtimeForecast, getRealtimeHistory } from '../services/api';

interface TimeSeriesPoint {
  time: string;
  hour: string;
  actual: number | null;
  counterfactual: number;
  reduction: number | null;
}

type TrendMode = 'realtime' | 'forecast';

function toHour(time: string): string {
  const d = new Date(time);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  return `${m}/${day} ${h}`;
}

function LegendDot({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass} shadow-[0_0_4px_currentColor]`} />
      <span className="text-cyan-300/80 text-xs">{label}</span>
    </div>
  );
}

export function TrendChart({ city = '北京市' }: { city?: string }) {
  const [series, setSeries] = useState<TimeSeriesPoint[]>([]);
  const [mode, setMode] = useState<TrendMode>('realtime');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSeries([]);

    const loader = mode === 'forecast' ? getRealtimeForecast : getRealtimeHistory;
    loader(city, 48)
      .then(data => {
        if (cancelled) return;
        const mapped: TimeSeriesPoint[] = (data.series || []).map((s: any) => ({
          time: s.time,
          hour: toHour(s.time),
          actual: s.pm2_5 ?? null,
          counterfactual: s.counterfactual ?? 80,
          reduction: s.net_reduction ?? null,
        }));
        setSeries(mapped);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'fetch failed');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [city, mode]);

  const sampled = series.length > 24
    ? series.filter((_, i) => i % Math.ceil(series.length / 24) === 0)
    : series;

  const reductionValues = series
    .map(p => p.reduction)
    .filter((value): value is number => value !== null);
  const totalReduction = reductionValues.reduce((sum, value) => sum + value, 0);
  const avgReduction = reductionValues.length ? totalReduction / reductionValues.length : 0;
  const isNegative = avgReduction < 0;
  const isForecast = mode === 'forecast';
  const periodLabel = isForecast ? '未来 48h' : '过去 48h';
  const pmLineLabel = isForecast ? '预测' : '实测';
  const loadingLabel = isForecast ? '未来预测' : '实时';

  return (
    <div className="relative h-full group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative h-full bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col">
        {/* 标题栏 */}
        <div className="relative px-3 py-2.5 border-b border-cyan-500/20 bg-slate-900/30 flex-shrink-0">
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(6,182,212,0.8)] flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-cyan-300 truncate">{city} · {periodLabel}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-2 text-[10px]">
                <LegendDot dotClass="bg-rose-400" label="反事实" />
                <LegendDot dotClass="bg-cyan-400" label={pmLineLabel} />
                <LegendDot dotClass="bg-emerald-400" label="净减排" />
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="relative px-2 py-1 flex-1 min-h-0">
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `radial-gradient(circle, rgba(6, 182, 212, 0.5) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-full text-cyan-400/60 text-xs animate-pulse">
              正在拉取 {city} {loadingLabel}数据 ...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-rose-400/70 text-xs">
              API 拉取失败：{error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sampled} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradActual2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCF2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradReduction2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <filter id="glow2">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.1)" />
                <XAxis
                  dataKey="hour"
                  stroke="rgba(6, 182, 212, 0.5)"
                  tick={{ fill: 'rgba(6, 182, 212, 0.7)', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="rgba(6, 182, 212, 0.5)"
                  tick={{ fill: 'rgba(6, 182, 212, 0.7)', fontSize: 11 }}
                  unit=" μg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(2, 8, 23, 0.95)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                  }}
                  labelStyle={{ color: '#06b6d4' }}
                  formatter={(value: number | null, name: string) => {
                    const labels: Record<string, string> = {
                      counterfactual: '反事实(无政策)',
                      actual: `${pmLineLabel} PM2.5`,
                      reduction: '净减排量',
                    };
                    return [value === null ? '--' : `${value.toFixed(1)} μg/m³`, labels[name] || name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reduction"
                  stroke="#10b981"
                  strokeWidth={1}
                  fill="url(#gradReduction2)"
                  stackId="rd"
                />
                <Area
                  type="monotone"
                  dataKey="counterfactual"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  fill="url(#gradCF2)"
                  filter="url(#glow2)"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  filter="url(#glow2)"
                />
                <Legend wrapperStyle={{ display: 'none' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 实时/未来切换按钮 - 面板右下角 */}
        <div className="relative z-20 grid h-11 flex-shrink-0 grid-cols-2 gap-1 border-t border-cyan-500/20 bg-slate-950/75 p-1 backdrop-blur-sm">
          {([
            ['realtime', '实时'],
            ['forecast', '未来'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`h-full rounded-md border text-base leading-none font-semibold tracking-[0.08em] transition-all ${
                mode === value
                  ? 'border-cyan-300/55 bg-gradient-to-b from-cyan-400/30 to-cyan-500/12 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'border-cyan-500/18 bg-slate-900/55 text-cyan-300/55 hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-cyan-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 边角装饰 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <motion.line x1="0" y1="0" x2="60" y2="0" stroke="url(#chartCornerGrad2)" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
          <motion.line x1="0" y1="0" x2="0" y2="60" stroke="url(#chartCornerGrad2)" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.1 }} />
          <defs>
            <linearGradient id="chartCornerGrad2">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
