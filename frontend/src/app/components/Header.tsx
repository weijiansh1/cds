import { motion } from 'motion/react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

interface HeaderProps {
  currentTime: Date;
}

export function Header({ currentTime }: HeaderProps) {
  const { cities, loading, error, lastUpdate } = useAirQualityCtx();
  const liveValue = loading
    ? '同步中...'
    : error
      ? '降级模式'
      : lastUpdate
        ? lastUpdate.toLocaleTimeString('zh-CN')
        : '—';
  const formatDate = (date: Date) => {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${days[date.getDay()]}`;
  };

  const formatTime = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/10 to-purple-500/5 blur-2xl" />

      {/* 主容器 */}
      <div className="relative bg-gradient-to-r from-slate-900/40 via-slate-800/40 to-slate-900/40 backdrop-blur-xl border-y border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* 顶部发光线 */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <div className="px-6 py-2">
          <div className="flex items-center justify-between">
            {/* 左侧标题区 */}
            <div className="flex items-center gap-6">
              {/* 装饰光柱 */}
              <div className="relative">
                <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    boxShadow: [
                      '0 0 20px rgba(6,182,212,0.5)',
                      '0 0 40px rgba(6,182,212,1)',
                      '0 0 20px rgba(6,182,212,0.5)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
              </div>

              {/* 标题文字 */}
              <div>
                <h1 className="text-2xl font-bold tracking-wide relative">
                  <span className="relative z-10 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                    京津冀-汾渭平原治理效用监测中心
                  </span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent blur-sm"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    京津冀-汾渭平原治理效用监测中心
                  </motion.span>
                </h1>
                <div className="text-xs text-cyan-400/50">
                  反事实评估 · 迁移衰减识别 · 交互式可视化决策
                </div>
              </div>
            </div>

            {/* 中间状态指示器 */}
            <div className="flex items-center gap-6">
              <StatusIndicator label="LIVE 实时数据" value={liveValue} status="active" />
              <StatusIndicator label="覆盖城市" value={`${cities.length || 13}个`} status="normal" />
              <StatusIndicator label="数据源" value="Open-Meteo API" status="normal" />
            </div>

            {/* 右侧时间区 */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-3xl font-bold tabular-nums tracking-wider relative">
                  <span className="relative z-10 bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                    {formatTime(currentTime)}
                  </span>
                  {/* 时间发光 */}
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent blur-sm"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  >
                    {formatTime(currentTime)}
                  </motion.span>
                </div>
                <div className="text-xs text-cyan-400/60 mt-1">{formatDate(currentTime)}</div>
              </div>

              {/* 装饰光柱 */}
              <div className="relative">
                <div className="w-1 h-16 bg-gradient-to-b from-purple-600 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-purple-600 via-blue-500 to-cyan-400"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    boxShadow: [
                      '0 0 20px rgba(168,85,247,0.5)',
                      '0 0 40px rgba(168,85,247,1)',
                      '0 0 20px rgba(168,85,247,0.5)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: 1,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部发光线 */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
          }}
          animate={{
            backgroundPosition: ['100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* 边角装饰 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* 左上角 */}
          <motion.path
            d="M 0,0 L 60,0 M 0,0 L 0,60"
            stroke="url(#cornerGradient1)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />

          {/* 右上角 */}
          <motion.path
            d="M 100%,0 L calc(100% - 60px),0 M 100%,0 L 100%,60"
            stroke="url(#cornerGradient2)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
          />

          {/* 左下角 */}
          <motion.path
            d="M 0,100% L 60,100% M 0,100% L 0,calc(100% - 60px)"
            stroke="url(#cornerGradient3)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.7 }}
          />

          {/* 右下角 */}
          <motion.path
            d="M 100%,100% L calc(100% - 60px),100% M 100%,100% L 100%,calc(100% - 60px)"
            stroke="url(#cornerGradient4)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />

          <defs>
            <linearGradient id="cornerGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cornerGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cornerGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cornerGradient4" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  label: string;
  value: string;
  status: 'active' | 'normal';
}

function StatusIndicator({ label, value, status }: StatusIndicatorProps) {
  const isActive = status === 'active';

  return (
    <div className="relative px-4 py-2 bg-slate-900/50 border border-cyan-500/20 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="flex items-center gap-3">
        {/* 状态指示灯 */}
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
          <motion.div
            className={`absolute inset-0 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-cyan-400'}`}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>

        <div>
          <div className="text-[10px] text-cyan-400/50 leading-none mb-1">{label}</div>
          <div className={`text-sm font-medium ${isActive ? 'text-emerald-400' : 'text-cyan-300'}`}>
            {value}
          </div>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  );
}
