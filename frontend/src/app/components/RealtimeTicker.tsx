import { motion } from 'motion/react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

/**
 * 底部实时滚动条 —— 持续滚动展示 13 个城市的实测/反事实/净减排
 */
export function RealtimeTicker() {
  const { cities, lastUpdate } = useAirQualityCtx();
  if (cities.length === 0) return null;

  // 复制两份，实现无缝循环
  const loop = [...cities, ...cities];

  const aqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-emerald-400';
    if (aqi <= 100) return 'text-cyan-400';
    if (aqi <= 150) return 'text-yellow-400';
    if (aqi <= 200) return 'text-orange-400';
    return 'text-rose-400';
  };

  return (
    <div className="relative h-9 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      {/* 左侧标签 */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center gap-2 px-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-transparent pr-8">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ boxShadow: '0 0 8px #10b981' }}
        />
        <span className="text-[10px] text-emerald-300 font-semibold tracking-[0.2em]">LIVE FEED</span>
        <span className="text-[10px] text-cyan-400/60 tabular-nums">
          {lastUpdate?.toLocaleTimeString('zh-CN')}
        </span>
      </div>

      {/* 右侧渐隐 */}
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />

      {/* 滚动内容 */}
      <motion.div
        className="absolute top-0 bottom-0 flex items-center gap-6 whitespace-nowrap pl-44"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {loop.map((c, i) => (
          <div key={`${c.city}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="text-cyan-300 font-medium">{c.city}</span>
            <span className="text-cyan-400/40">PM2.5</span>
            <span className={`font-bold tabular-nums ${aqiColor(c.aqi)} drop-shadow-[0_0_6px_currentColor]`}>
              {c.pm25.toFixed(1)}
            </span>
            <span className="text-cyan-400/30">/</span>
            <span className="text-rose-400/70 tabular-nums" title="反事实">
              {c.counterfactual.toFixed(1)}
            </span>
            <span className="text-cyan-400/40">μg/m³</span>
            <span className="text-emerald-400 tabular-nums font-semibold" title="净减排">
              ↓{c.reduction.toFixed(1)}
            </span>
            <span className="text-cyan-400/30 mx-2">|</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
