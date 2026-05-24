import { motion } from 'motion/react';

export function GridBackground() {
  return (
    <div className="absolute inset-0 z-0">
      {/* 主网格 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* 次级网格 */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px',
        }}
      />

      {/* 径向渐变 */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent" />

      {/* 动态光线 */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), transparent)',
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <motion.div
        className="absolute left-0 top-0 w-[2px] h-full"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(6, 182, 212, 0.5), transparent)',
        }}
        animate={{
          y: ['-100%', '200%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* 四角装饰光束 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cornerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.6)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </linearGradient>
        </defs>

        {/* 左上 */}
        <motion.path
          d="M 0,0 L 200,0 L 0,200 Z"
          fill="url(#cornerGlow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* 右上 */}
        <motion.path
          d="M 100%,0 L calc(100% - 200px),0 L 100%,200 Z"
          fill="url(#cornerGlow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />

        {/* 左下 */}
        <motion.path
          d="M 0,100% L 200,100% L 0,calc(100% - 200px) Z"
          fill="url(#cornerGlow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />

        {/* 右下 */}
        <motion.path
          d="M 100%,100% L calc(100% - 200px),100% L 100%,calc(100% - 200px) Z"
          fill="url(#cornerGlow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 3 }}
        />
      </svg>
    </div>
  );
}
