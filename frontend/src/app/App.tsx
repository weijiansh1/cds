import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AirQualityProvider } from './hooks/AirQualityContext';
import { Header } from './components/Header';
import { DataPanel } from './components/DataPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { TrendChart } from './components/TrendChart';
import { CityRanking } from './components/CityRanking';
import { PolicyEffect } from './components/PolicyEffect';
import { MonitorGrid } from './components/MonitorGrid';
import { AirQualityGauge } from './components/AirQualityGauge';
import { ParticleField } from './components/ParticleField';
import { GridBackground } from './components/GridBackground';
import { GlowEffect } from './components/GlowEffect';
import { RealtimeTicker } from './components/RealtimeTicker';
import { HistoryAnalysis } from './pages/HistoryAnalysis';
import { Activity, BarChart3 } from 'lucide-react';

function RealtimeDashboard({ currentTime, selectedCity }: { currentTime: Date; selectedCity: string }) {
  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <Header currentTime={currentTime} />
      <DataPanel />
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0"><TrendChart city={selectedCity} /></div>
          <div className="h-[200px] flex-shrink-0"><AirQualityGauge city={selectedCity} /></div>
        </div>
        <div className="col-span-6 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0"><NetworkGraph /></div>
          <div className="h-[195px] flex-shrink-0"><MonitorGrid city={selectedCity} /></div>
        </div>
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0 relative"><CityRanking /></div>
          <div className="h-[160px] flex-shrink-0"><PolicyEffect /></div>
        </div>
      </div>
      <RealtimeTicker />
    </div>
  );
}

const CITIES = ['北京市','天津市','石家庄市','唐山市','太原市','保定市','廊坊市','邯郸市','秦皇岛市','邢台市','沧州市','衡水市','临汾市'];

export default function App() {
  const [mode, setMode] = useState<'realtime' | 'history'>('realtime');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState('北京市');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AirQualityProvider>
      <div className="w-full h-screen bg-[#020817] overflow-hidden relative text-white flex flex-col">
        <GridBackground />
        <ParticleField />
        <GlowEffect />

        {/* ====== 统一顶部栏：模式切换 + 城市选择 ====== */}
        <div className="relative z-30 flex-shrink-0">
          <div className="bg-gradient-to-r from-slate-900/50 via-slate-800/40 to-slate-900/50 backdrop-blur-md border-b border-cyan-500/15 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between px-6 py-3">
              {/* 左：模式切换 */}
              <div className="flex items-center gap-1 rounded-xl border border-cyan-500/25 bg-slate-950/70 p-1 shadow-[0_0_22px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                {([
                  { id: 'realtime', label: '实时监测大屏', icon: Activity },
                  { id: 'history', label: '历史分析与评估', icon: BarChart3 },
                ] as const).map(({ id, label, icon: Icon }) => {
                  const active = mode === id;
                  const activeClass = id === 'realtime'
                    ? 'border-cyan-400/45 bg-gradient-to-b from-cyan-500/25 to-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.28)]'
                    : 'border-violet-400/45 bg-gradient-to-b from-violet-500/25 to-violet-500/10 text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.25)]';
                  const iconClass = id === 'realtime'
                    ? 'bg-cyan-400/15 text-cyan-200'
                    : 'bg-violet-400/15 text-violet-200';
                  return (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`relative flex h-11 items-center gap-2.5 rounded-lg border px-5 text-[15px] font-semibold tracking-wide transition-all duration-200 ${
                        active
                          ? activeClass
                          : 'border-transparent text-slate-400 hover:bg-slate-800/55 hover:text-slate-100'
                      }`}
                    >
                      <span className={`grid h-7 w-7 place-items-center rounded-md ${active ? iconClass : 'bg-slate-800/80 text-slate-500'}`}>
                        <Icon size={17} strokeWidth={2.2} />
                      </span>
                      <span>{label}</span>
                      {active && (
                        <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-current opacity-70 shadow-[0_0_8px_currentColor]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 中：城市选择（两个模式共用） */}
              <div className="flex items-center gap-2.5">
                <span className="text-base text-slate-400">城市</span>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="bg-slate-800/70 text-slate-200 border border-cyan-500/25 rounded-md px-4 py-2 text-base focus:outline-none focus:border-cyan-400/50 transition-colors"
                >
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ====== 内容区域 ====== */}
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === 'realtime' ? (
              <motion.div
                key="realtime"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <RealtimeDashboard currentTime={currentTime} selectedCity={selectedCity} />
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <HistoryAnalysis selectedCity={selectedCity} onCityChange={setSelectedCity} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 全局扫描线 */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(6,182,212,0.04) 50%, transparent 100%)',
            height: '200px',
          }}
          animate={{ y: ['0vh', '100vh'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <style>{`
          .custom-scrollbar-right::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar-right::-webkit-scrollbar-track { background: rgba(6,182,212,0.05); }
          .custom-scrollbar-right::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.4); border-radius: 2px; }
          .custom-scrollbar-right::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.7); }
        `}</style>
      </div>
    </AirQualityProvider>
  );
}
