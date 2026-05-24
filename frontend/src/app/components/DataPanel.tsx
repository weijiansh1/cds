import { motion } from 'motion/react';
import { TrendingDown, TrendingUp, Activity, CloudFog, BarChart3, Leaf, Sun } from 'lucide-react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

/**
 * 横向 KPI 条 —— 占满主体顶部一行，4 列紧凑卡片
 * 不再独占左列垂直空间
 */
export function DataPanel() {
  const { cities } = useAirQualityCtx();
  const n = cities.length || 1;
  const avgPm25 = cities.reduce((s, c) => s + c.pm25, 0) / n;
  const avgCF = cities.reduce((s, c) => s + c.counterfactual, 0) / n;
  const avgReduction = cities.reduce((s, c) => s + c.reduction, 0) / n;
  const reductionPct = avgCF > 0 ? (avgReduction / avgCF) * 100 : 0;
  const goodRatio = cities.length
    ? (cities.filter(c => c.aqi <= 100).length / cities.length) * 100
    : 0;

  const stats = [
    {
      label: '京津冀 PM2.5 实测均值',
      sub: 'Real-time Observed',
      value: avgPm25.toFixed(1),
      unit: 'μg/m³',
      color: 'cyan',
      Icon: CloudFog,
      tone: 'good' as const,
    },
    {
      label: '反事实(无政策)PM2.5',
      sub: 'XGBoost Counterfactual',
      value: avgCF.toFixed(1),
      unit: 'μg/m³',
      color: 'rose',
      Icon: BarChart3,
      tone: 'bad' as const,
    },
    {
      label: '政策净减排量',
      sub: 'Net Policy Reduction',
      value: avgReduction.toFixed(1),
      unit: 'μg/m³',
      color: 'emerald',
      Icon: Leaf,
      tone: 'good' as const,
      trendPct: reductionPct,
    },
    {
      label: '当前优良城市占比',
      sub: 'AQI ≤ 100 Ratio',
      value: goodRatio.toFixed(0),
      unit: '%',
      color: 'violet',
      Icon: Sun,
      tone: 'good' as const,
    },
  ];

  const colorMap: Record<string, { from: string; to: string; text: string; border: string; shadow: string; rgb: string }> = {
    cyan:    { from: 'from-cyan-500/20',    to: 'to-cyan-500/0',    text: 'text-cyan-300',    border: 'border-cyan-500/40',    shadow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',  rgb: '6,182,212'  },
    rose:    { from: 'from-rose-500/20',    to: 'to-rose-500/0',    text: 'text-rose-300',    border: 'border-rose-500/40',    shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.2)]',  rgb: '244,63,94'  },
    emerald: { from: 'from-emerald-500/20', to: 'to-emerald-500/0', text: 'text-emerald-300', border: 'border-emerald-500/40', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]', rgb: '16,185,129' },
    violet:  { from: 'from-violet-500/20',  to: 'to-violet-500/0',  text: 'text-violet-300',  border: 'border-violet-500/40',  shadow: 'shadow-[0_0_30px_rgba(139,92,246,0.2)]', rgb: '139,92,246' },
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat, index) => {
          const c = colorMap[stat.color];
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.from} ${c.to} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className={`relative bg-gradient-to-br from-slate-900/35 via-slate-800/25 to-slate-900/35 backdrop-blur-xl border ${c.border} p-2 overflow-hidden ${c.shadow}`}>
                {/* 顶部脉动线 */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, rgb(${c.rgb}), transparent)` }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                />

                {/* 右侧图标 */}
                <div className={`absolute top-1.5 right-2.5 pointer-events-none`} style={{ opacity: 0.8 }}>
                  <stat.Icon size={40} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 14px rgb(${c.rgb}, 0.6))` }} className={c.text} />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  {/* 左侧实时跳动竖条 */}
                  <motion.div
                    className={`w-0.5 self-stretch ${c.text.replace('text-', 'bg-')} rounded-full`}
                    animate={{ opacity: [0.5, 1, 0.5], height: ['60%', '100%', '60%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.15 }}
                    style={{ boxShadow: `0 0 8px rgb(${c.rgb})` }}
                  />

                  <div className="flex-1 min-w-0">
                    {/* 标签 */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className={`w-3 h-3 ${c.text}`} />
                      <div className="text-[11px] text-cyan-400/80 tracking-wide truncate">{stat.label}</div>
                    </div>
                    <div className="text-[9px] text-cyan-400/40 mb-1.5 tracking-wide">{stat.sub}</div>

                    {/* 数值 */}
                    <div className="flex items-baseline gap-1.5">
                      <motion.span
                        key={stat.value}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`text-3xl font-bold tabular-nums ${c.text} drop-shadow-[0_0_10px_currentColor] leading-none`}
                      >
                        {stat.value}
                      </motion.span>
                      <span className="text-xs text-cyan-400/60">{stat.unit}</span>

                      {stat.trendPct !== undefined && (
                        <div className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                          <TrendingDown className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">
                            ↓{stat.trendPct.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右下角装饰 */}
                <svg className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none">
                  <path d="M 32,32 L 8,32 L 8,30 L 30,30 L 30,8 L 32,8 Z" fill={`rgba(${c.rgb}, 0.7)`} />
                </svg>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
