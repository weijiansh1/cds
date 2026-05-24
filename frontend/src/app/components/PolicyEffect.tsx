import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

export function PolicyEffect() {
  const { cities } = useAirQualityCtx();
  // 按绝对值排序展示 7 城；负值表示污染加剧
  const data = [...cities]
    .sort((a, b) => Math.abs(b.reduction) - Math.abs(a.reduction))
    .slice(0, 7)
    .map(c => ({
      name: c.city,
      value: +c.reduction.toFixed(1),
      color: c.reduction >= 0 ? '#10b981' : '#f97316',
    }));
  return (
    <div className="relative h-full group">
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* 主容器 */}
      <div className="relative h-full bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        {/* 标题栏 */}
        <div className="relative px-3 py-1.5 border-b border-cyan-500/20 bg-slate-900/30">
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 0.5,
            }}
          />

          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-600 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <div>
              <h3 className="text-sm font-semibold text-white">各市净减排量 (μg/m³)</h3>
              <p className="text-[9px] text-cyan-400/50 mt-0.5">Policy Net Reduction · Counterfactual − Actual</p>
            </div>
          </div>
        </div>

        {/* 图表区域 —— flex 居中 + 横向柱 */}
        <div className="relative h-[calc(100%-40px)] flex items-center justify-center px-2 py-1">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: `linear-gradient(45deg, rgba(59, 130, 246, 0.5) 25%, transparent 25%, transparent 75%, rgba(59, 130, 246, 0.5) 75%, rgba(59, 130, 246, 0.5))`,
              backgroundSize: '20px 20px',
            }} />
          </div>

          <div className="relative w-full h-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="barPos" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="40%" stopColor="#34d399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barNeg" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="40%" stopColor="#fb923c" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#fed7aa" stopOpacity={0.8} />
                  </linearGradient>
                  <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="cb" />
                    <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="barGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="cb" />
                    <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.1)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="rgba(6, 182, 212, 0.4)"
                  tick={{ fill: 'rgba(6, 182, 212, 0.6)', fontSize: 9 }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(6, 182, 212, 0.4)"
                  tick={{ fill: 'rgba(6, 182, 212, 0.85)', fontSize: 11 }}
                  width={42}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(2, 8, 23, 0.95)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                  }}
                  labelStyle={{ color: '#06b6d4' }}
                  formatter={(value: number) => [
                    `${value >= 0 ? '↓ ' : '↑ +'}${Math.abs(value).toFixed(1)} μg/m³`,
                    value >= 0 ? '净减排' : '污染增量',
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 4, 4]}
                  filter="url(#barGlow)"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  label={{
                    position: 'right',
                    fill: '#ffffff',
                    fontSize: 10,
                    fontWeight: 'bold',
                    formatter: (v: number) => (v >= 0 ? `↓${v.toFixed(1)}` : `↑${Math.abs(v).toFixed(1)}`),
                  }}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? 'url(#barPos)' : 'url(#barNeg)'}
                      filter={index < 3 ? 'url(#barGlowStrong)' : 'url(#barGlow)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 边角装饰 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <motion.line
            x1="0"
            y1="0"
            x2="60"
            y2="0"
            stroke="url(#policyCornerGrad)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.line
            x1="0"
            y1="0"
            x2="0"
            y2="60"
            stroke="url(#policyCornerGrad)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

          <defs>
            <linearGradient id="policyCornerGrad">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
