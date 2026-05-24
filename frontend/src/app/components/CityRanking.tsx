import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

export function CityRanking() {
  const { cities } = useAirQualityCtx();
  const rankings = [...cities]
    .sort((a, b) => b.reductionPct - a.reductionPct)
    .map((c, i) => ({
      rank: i + 1,
      city: c.city,
      score: Math.round(Math.max(0, Math.min(100, c.reductionPct))),
      change: c.pm25 < 35 ? 1 : c.pm25 < 75 ? 0 : -1,
      pm25: c.pm25,
    }));

  const getRankColor = (rank: number) => {
    if (rank === 1) return { bg: 'from-yellow-500/30', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.6)]' };
    if (rank === 2) return { bg: 'from-gray-400/30', border: 'border-gray-400/50', text: 'text-gray-300', glow: 'shadow-[0_0_15px_rgba(156,163,175,0.6)]' };
    if (rank === 3) return { bg: 'from-orange-500/30', border: 'border-orange-500/50', text: 'text-orange-400', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.6)]' };
    return { bg: 'from-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.4)]' };
  };

  return (
    <div className="absolute inset-0 group">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative h-full bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col">
        {/* 标题栏 */}
        <div className="relative px-3 py-1.5 border-b border-cyan-500/20 bg-slate-900/30 flex-shrink-0">
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-purple-400 to-pink-600 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">城市治理成效排名</h3>
              <p className="text-[10px] text-cyan-400/50 mt-0.5">Policy Reduction Rate · {rankings.length} 城市</p>
            </div>
          </div>
        </div>

        {/* 排名列表 - 可滚动 */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar-right px-2 py-1.5">
          <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${rankings.length}, 40px)` }}>
            {rankings.map((item, index) => {
              const rankStyle = getRankColor(item.rank);
              return (
                <motion.div
                  key={item.city}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring' }}
                  className="relative group/item"
                >
                  {item.rank <= 3 && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${rankStyle.bg} to-transparent blur-lg opacity-0 group-hover/item:opacity-100 transition-opacity duration-300`} />
                  )}

                  <div className={`relative h-full flex items-center gap-2 px-2.5 bg-slate-900/25 backdrop-blur-sm border ${rankStyle.border} overflow-hidden`}>
                    {item.rank <= 3 && (
                      <motion.div
                        className={`absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b ${rankStyle.bg.replace('from-', 'from-').replace('/30', '')} to-transparent`}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      />
                    )}

                    <div className={`relative w-6 h-6 flex items-center justify-center font-bold text-[11px] border ${rankStyle.border} ${rankStyle.glow} flex-shrink-0`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${rankStyle.bg} to-transparent`} />
                      <span className={`relative z-10 ${rankStyle.text} drop-shadow-[0_0_8px_currentColor]`}>
                        {item.rank}
                      </span>
                      {item.rank <= 3 && (
                        <motion.div
                          className={`absolute -top-1 -right-1 ${rankStyle.text}`}
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        >
                          ★
                        </motion.div>
                      )}
                    </div>

                    <div className="flex-1 text-[12px] text-white font-semibold tracking-wide truncate">{item.city}</div>

                    <div className="flex items-baseline gap-0.5 flex-shrink-0">
                      <motion.span
                        key={item.score}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className={`text-base font-bold tabular-nums ${item.rank <= 3 ? rankStyle.text : 'text-cyan-400'} drop-shadow-[0_0_8px_currentColor]`}
                      >
                        {item.score}
                      </motion.span>
                      <span className="text-[10px] text-cyan-400/50">%</span>
                    </div>

                    <div className={`w-10 flex items-center justify-center text-[11px] flex-shrink-0 ${
                      item.change > 0 ? 'text-emerald-400' :
                      item.change < 0 ? 'text-rose-400' : 'text-cyan-400/50'
                    }`}>
                      {item.change > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-semibold">{item.change}</span>
                        </div>
                      ) : item.change < 0 ? (
                        <div className="flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          <span className="font-semibold">{Math.abs(item.change)}</span>
                        </div>
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </div>

                    <div className="flex-1 h-1.5 bg-slate-900/80 rounded-full overflow-hidden min-w-[30px]">
                      <motion.div
                        className={`h-full ${item.rank <= 3 ? `bg-gradient-to-r ${rankStyle.bg.replace('/30', '')}` : 'bg-gradient-to-r from-cyan-500 to-blue-600'} ${rankStyle.glow}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <motion.line x1="0" y1="0" x2="60" y2="0" stroke="url(#rankingCornerGrad)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
          <motion.line x1="0" y1="0" x2="0" y2="60" stroke="url(#rankingCornerGrad)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.1 }} />
          <defs>
            <linearGradient id="rankingCornerGrad">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
