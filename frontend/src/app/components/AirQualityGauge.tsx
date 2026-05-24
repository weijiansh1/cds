import { motion } from 'motion/react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

export function AirQualityGauge({ city = '北京市' }: { city?: string }) {
  const { cities, loading } = useAirQualityCtx();
  const data = cities.find(c => c.city === city);

  const aqi = data?.aqi ?? (loading ? 0 : 56);
  const pm25 = data?.pm25 ?? 0;
  const cf = data?.counterfactual ?? 0;
  const reduction = data?.reduction ?? 0;
  const reductionPct = data?.reductionPct ?? 0;

  const percentage = Math.min((aqi / 200) * 100, 100);
  const angle = (percentage / 100) * 180;

  const getAqiLevel = () => {
    if (aqi <= 50) return { label: '优', color: '#10b981', textColor: 'text-emerald-400' };
    if (aqi <= 100) return { label: '良', color: '#06b6d4', textColor: 'text-cyan-400' };
    if (aqi <= 150) return { label: '轻度污染', color: '#eab308', textColor: 'text-yellow-400' };
    if (aqi <= 200) return { label: '中度污染', color: '#f97316', textColor: 'text-orange-400' };
    return { label: '重度污染', color: '#ef4444', textColor: 'text-rose-400' };
  };
  const level = getAqiLevel();

  return (
    <div className="relative h-full group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative h-full bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col">
        {/* 标题栏 */}
        <div className="relative px-3 py-1.5 border-b border-cyan-500/20 bg-slate-900/30 flex-shrink-0">
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h3 className="text-sm font-bold text-white tracking-wide">{city}实时空气质量</h3>
            </div>
            <span className="text-[10px] text-cyan-400/50">Open-Meteo</span>
          </div>
        </div>

        {/* 主体 - 填满空间 */}
        <div className="flex-1 flex flex-col justify-evenly px-3 py-1.5 min-h-0">
          {/* 上部：仪表盘 + 等级 */}
          <div className="flex items-center gap-3">
            {/* 半圆仪表盘 - 加大 */}
            <div className="relative w-[155px] h-[90px] flex-shrink-0">
              <svg className="w-full h-full" viewBox="0 0 220 120">
                <defs>
                  <linearGradient id="gaugeGrad3" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="33%" stopColor="#06b6d4" />
                    <stop offset="66%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                  <filter id="gg3">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>
                <path d="M 20 100 A 90 90 0 0 1 200 100" fill="none" stroke="rgba(6, 182, 212, 0.12)" strokeWidth="16" strokeLinecap="round" />
                <motion.path
                  d="M 20 100 A 90 90 0 0 1 200 100"
                  fill="none" stroke="url(#gaugeGrad3)" strokeWidth="16" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: percentage / 100 }}
                  transition={{ duration: 1 }} filter="url(#gg3)"
                />
                <motion.g
                  initial={{ rotate: 0 }} animate={{ rotate: angle }}
                  transition={{ duration: 1 }} style={{ transformOrigin: '110px 100px' }}
                >
                  <path d="M 110 100 L 105 97 L 110 30 L 115 97 Z" fill={level.color} />
                  <circle cx="110" cy="100" r="8" fill={level.color} stroke="#020817" strokeWidth="2" />
                </motion.g>
              </svg>
              {/* 中心 AQI 数值 */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <motion.div
                  key={aqi}
                  initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                  className={`text-4xl font-bold tabular-nums ${level.textColor} drop-shadow-[0_0_12px_currentColor] leading-none`}
                >
                  {aqi}
                </motion.div>
                <div className="text-[10px] text-cyan-400/60 mt-0.5">AQI</div>
              </div>
            </div>

            {/* 右侧等级 + PM2.5 */}
            <div className="flex-1 min-w-0">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border mb-2"
                style={{ borderColor: level.color, backgroundColor: `${level.color}22` }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: level.color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className={`text-base font-bold ${level.textColor}`}>{level.label}</span>
              </div>
              <div className="text-xs text-cyan-400/60 leading-tight">实测 PM2.5</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-cyan-400 tabular-nums drop-shadow-[0_0_10px_rgba(6,182,212,0.7)] leading-none">
                  {pm25.toFixed(1)}
                </span>
                <span className="text-xs text-cyan-400/50">μg/m³</span>
              </div>
            </div>
          </div>

          {/* 下部：反事实 vs 实测 vs 净减排 三联对比 - 加大 */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="实测" value={pm25.toFixed(1)} unit="μg/m³" color="#06b6d4" />
            <MiniStat label="反事实" value={cf.toFixed(1)} unit="μg/m³" color="#f43f5e" dashed />
            <MiniStat
              label={reduction >= 0 ? '净减排' : '污染增量'}
              value={`${reduction >= 0 ? '↓' : '↑+'}${Math.abs(reduction).toFixed(1)}`}
              unit={`${reductionPct >= 0 ? '' : '+'}${Math.abs(reductionPct).toFixed(0)}%`}
              color={reduction >= 0 ? '#10b981' : '#f97316'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label, value, unit, color, dashed,
}: { label: string; value: string; unit: string; color: string; dashed?: boolean }) {
  return (
    <div
      className="relative bg-slate-900/30 px-3 py-3 overflow-hidden flex flex-col justify-center"
      style={{
        border: `1px ${dashed ? 'dashed' : 'solid'} ${color}55`,
        boxShadow: `0 0 16px ${color}22`,
      }}
    >
      <div className="text-[11px] text-cyan-400/60 leading-tight">{label}</div>
      <div className="flex items-baseline gap-0.5 mt-1">
        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {value}
        </span>
        <span className="text-[10px]" style={{ color: `${color}aa` }}>{unit}</span>
      </div>
    </div>
  );
}
