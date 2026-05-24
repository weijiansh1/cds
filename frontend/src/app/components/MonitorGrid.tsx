import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, Thermometer, Droplets, Wind, Eye, Gauge, Compass } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

interface StationData {
  name: string;
  pm25: number;
  aqi: number;
}

interface StationDetail {
  name: string;
  city: string;
  pm25: number;
  pm10: number;
  aqi: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  pressure: number;
  visibility: number;
  weather: string;
  updatedAt: string;
}

const CITY_STATIONS: Record<string, StationData[]> = {
  '北京市': [
    { name: '万寿西宫', pm25: 28, aqi: 45 },
    { name: '定陵', pm25: 32, aqi: 52 },
    { name: '东四', pm25: 35, aqi: 58 },
    { name: '天坛', pm25: 38, aqi: 62 },
    { name: '农展馆', pm25: 42, aqi: 68 },
    { name: '官园', pm25: 45, aqi: 72 },
    { name: '海淀', pm25: 36, aqi: 60 },
    { name: '顺义', pm25: 40, aqi: 65 },
  ],
  '天津市': [
    { name: '和平路', pm25: 30, aqi: 48 },
    { name: '河西区', pm25: 34, aqi: 55 },
    { name: '南开区', pm25: 31, aqi: 50 },
    { name: '河东区', pm25: 37, aqi: 60 },
    { name: '河北区', pm25: 36, aqi: 58 },
    { name: '红桥区', pm25: 33, aqi: 53 },
    { name: '滨海新区', pm25: 28, aqi: 44 },
    { name: '津南区', pm25: 35, aqi: 57 },
  ],
  '石家庄市': [
    { name: '长安区', pm25: 42, aqi: 68 },
    { name: '桥西区', pm25: 45, aqi: 72 },
    { name: '新华区', pm25: 39, aqi: 64 },
    { name: '裕华区', pm25: 44, aqi: 70 },
    { name: '高新区', pm25: 38, aqi: 62 },
    { name: '鹿泉区', pm25: 36, aqi: 58 },
    { name: '栾城区', pm25: 40, aqi: 65 },
    { name: '正定县', pm25: 37, aqi: 60 },
  ],
  '唐山市': [
    { name: '路北区', pm25: 38, aqi: 62 },
    { name: '路南区', pm25: 40, aqi: 65 },
    { name: '古冶区', pm25: 44, aqi: 70 },
    { name: '开平区', pm25: 36, aqi: 58 },
    { name: '丰润区', pm25: 35, aqi: 57 },
    { name: '丰南区', pm25: 32, aqi: 52 },
    { name: '曹妃甸', pm25: 29, aqi: 46 },
    { name: '滦州市', pm25: 33, aqi: 54 },
  ],
  '太原市': [
    { name: '杏花岭', pm25: 45, aqi: 72 },
    { name: '迎泽区', pm25: 48, aqi: 76 },
    { name: '万柏林', pm25: 42, aqi: 68 },
    { name: '小店区', pm25: 44, aqi: 70 },
    { name: '晋源区', pm25: 40, aqi: 65 },
    { name: '尖草坪', pm25: 46, aqi: 74 },
    { name: '古交市', pm25: 38, aqi: 62 },
    { name: '清徐县', pm25: 41, aqi: 66 },
  ],
  '保定市': [
    { name: '竞秀区', pm25: 38, aqi: 62 },
    { name: '莲池区', pm25: 41, aqi: 66 },
    { name: '满城区', pm25: 36, aqi: 58 },
    { name: '清苑区', pm25: 39, aqi: 64 },
    { name: '徐水区', pm25: 34, aqi: 55 },
    { name: '高碑店', pm25: 32, aqi: 52 },
    { name: '涿州市', pm25: 30, aqi: 49 },
    { name: '定州市', pm25: 37, aqi: 60 },
  ],
  '廊坊市': [
    { name: '广阳区', pm25: 32, aqi: 52 },
    { name: '安次区', pm25: 35, aqi: 57 },
    { name: '开发区', pm25: 29, aqi: 46 },
    { name: '三河市', pm25: 31, aqi: 50 },
    { name: '霸州市', pm25: 36, aqi: 58 },
    { name: '固安县', pm25: 28, aqi: 44 },
    { name: '永清县', pm25: 33, aqi: 54 },
    { name: '大厂县', pm25: 27, aqi: 42 },
  ],
  '邯郸市': [
    { name: '丛台区', pm25: 44, aqi: 70 },
    { name: '邯山区', pm25: 46, aqi: 74 },
    { name: '复兴区', pm25: 42, aqi: 68 },
    { name: '峰峰矿区', pm25: 48, aqi: 76 },
    { name: '武安市', pm25: 40, aqi: 65 },
    { name: '永年区', pm25: 38, aqi: 62 },
    { name: '磁县', pm25: 36, aqi: 58 },
    { name: '涉县', pm25: 34, aqi: 55 },
  ],
  '秦皇岛市': [
    { name: '海港区', pm25: 24, aqi: 38 },
    { name: '北戴河', pm25: 20, aqi: 30 },
    { name: '山海关', pm25: 26, aqi: 40 },
    { name: '抚宁区', pm25: 28, aqi: 44 },
    { name: '昌黎县', pm25: 25, aqi: 39 },
    { name: '卢龙县', pm25: 30, aqi: 48 },
    { name: '青龙县', pm25: 22, aqi: 34 },
    { name: '开发区', pm25: 23, aqi: 36 },
  ],
  '邢台市': [
    { name: '桥东区', pm25: 46, aqi: 74 },
    { name: '桥西区', pm25: 44, aqi: 70 },
    { name: '高开区', pm25: 42, aqi: 68 },
    { name: '邢台县', pm25: 40, aqi: 65 },
    { name: '沙河市', pm25: 48, aqi: 76 },
    { name: '内丘县', pm25: 38, aqi: 62 },
    { name: '临城县', pm25: 36, aqi: 58 },
    { name: '宁晋县', pm25: 43, aqi: 69 },
  ],
  '沧州市': [
    { name: '运河区', pm25: 38, aqi: 62 },
    { name: '新华区', pm25: 36, aqi: 58 },
    { name: '泊头市', pm25: 42, aqi: 68 },
    { name: '任丘市', pm25: 34, aqi: 55 },
    { name: '黄骅市', pm25: 30, aqi: 48 },
    { name: '河间市', pm25: 35, aqi: 57 },
    { name: '沧县', pm25: 37, aqi: 60 },
    { name: '青县', pm25: 33, aqi: 54 },
  ],
  '衡水市': [
    { name: '桃城区', pm25: 40, aqi: 65 },
    { name: '冀州区', pm25: 38, aqi: 62 },
    { name: '深州市', pm25: 36, aqi: 58 },
    { name: '枣强县', pm25: 34, aqi: 55 },
    { name: '武邑县', pm25: 42, aqi: 68 },
    { name: '景县', pm25: 35, aqi: 57 },
    { name: '安平县', pm25: 39, aqi: 64 },
    { name: '故城县', pm25: 37, aqi: 60 },
  ],
  '临汾市': [
    { name: '尧都区', pm25: 48, aqi: 76 },
    { name: '侯马市', pm25: 44, aqi: 70 },
    { name: '霍州市', pm25: 42, aqi: 68 },
    { name: '洪洞县', pm25: 46, aqi: 74 },
    { name: '襄汾县', pm25: 50, aqi: 80 },
    { name: '曲沃县', pm25: 40, aqi: 65 },
    { name: '隰县', pm25: 34, aqi: 55 },
    { name: '蒲县', pm25: 36, aqi: 58 },
  ],
};

const WIND_DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const WEATHERS: Record<string, { icon: string; label: string }> = {
  good:    { icon: '☀️', label: '晴' },
  fair:    { icon: '⛅', label: '多云' },
  haze:    { icon: '🌫️', label: '霾' },
  overcast:{ icon: '☁️', label: '阴' },
  drizzle: { icon: '🌦️', label: '小雨' },
};

function generateStationDetail(station: StationData, city: string): StationDetail {
  const seed = station.name.charCodeAt(0) + station.name.charCodeAt(station.name.length - 1);
  const r = (min: number, max: number) => min + ((seed * 127 + 31) % 1000) / 1000 * (max - min);

  const aqi = +(station.aqi + r(-3, 3)).toFixed(2);
  const pm25 = station.pm25;
  const pm10 = Math.round(pm25 * (1.6 + r(-0.2, 0.4)));
  const o3  = Math.round(40 + r(-10, 30));
  const no2 = Math.round(15 + r(-5, 25));
  const so2 = Math.round(4 + r(-2, 10));
  const co  = +(0.4 + r(-0.2, 0.5)).toFixed(1);

  let weatherKey: string;
  let temp: number;
  if (aqi <= 50) {
    weatherKey = 'good'; temp = 18 + r(-4, 6);
  } else if (aqi <= 100) {
    weatherKey = r(0, 1) > 0.5 ? 'fair' : 'overcast'; temp = 14 + r(-4, 8);
  } else {
    weatherKey = r(0, 1) > 0.5 ? 'haze' : 'overcast'; temp = 10 + r(-3, 8);
  }
  if (r(0, 1) > 0.85) weatherKey = 'drizzle';

  return {
    name: station.name,
    city,
    pm25: +pm25.toFixed(1),
    pm10,
    aqi,
    o3,
    no2,
    so2,
    co,
    temperature: +temp.toFixed(1),
    feelsLike: +(temp + r(-3, 2)).toFixed(1),
    humidity: Math.round(30 + r(0, 50)),
    windSpeed: +(1.5 + r(0, 6)).toFixed(1),
    windDir: WIND_DIRS[Math.floor(r(0, WIND_DIRS.length))],
    pressure: Math.round(1008 + r(-8, 8)),
    visibility: +(aqi <= 50 ? 12 + r(0, 8) : aqi <= 100 ? 5 + r(0, 6) : 2 + r(0, 5)).toFixed(1),
    weather: WEATHERS[weatherKey]?.label || '多云',
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  };
}

export function MonitorGrid({ city = '北京市' }: { city?: string }) {
  const defaultStations = CITY_STATIONS[city] || CITY_STATIONS['北京市'];
  const [stations, setStations] = useState(defaultStations);
  const [selectedStation, setSelectedStation] = useState<StationDetail | null>(null);

  useEffect(() => {
    setStations(CITY_STATIONS[city] || CITY_STATIONS['北京市']);
  }, [city]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStations(prev => prev.map(station => ({
        ...station,
        pm25: Math.max(10, Math.min(80, station.pm25 + (Math.random() - 0.5) * 5)),
        aqi: Math.max(20, Math.min(120, station.aqi + (Math.random() - 0.5) * 8)),
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, [city]);

  const handleCardClick = useCallback((station: StationData) => {
    setSelectedStation(generateStationDetail(station, city));
  }, [city]);

  const closeModal = useCallback(() => setSelectedStation(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    if (selectedStation) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [selectedStation, closeModal]);

  const getAqiLevel = (aqi: number) => {
    if (aqi <= 50) return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: '优', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' };
    if (aqi <= 100) return { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: '良', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' };
    return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: '中', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' };
  };

  const getAqiLevelDetail = (aqi: number) => {
    if (aqi <= 50) return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', label: '优', textColor: 'text-emerald-300' };
    if (aqi <= 100) return { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)', label: '良', textColor: 'text-cyan-300' };
    return { color: '#eab308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)', label: '轻度污染', textColor: 'text-yellow-300' };
  };

  return (
    <>
      <div className="relative h-full group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative h-full bg-gradient-to-br from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {/* 标题栏 */}
          <div className="relative px-3 py-1.5 border-b border-cyan-500/20 bg-slate-900/30">
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div>
                  <h3 className="text-sm font-semibold text-white">{city}监测站点实时数据</h3>
                  <p className="text-[9px] text-cyan-400/50 mt-0.5">Real-time Station Data · 点击卡片查看详情</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/25 border border-emerald-500/30 rounded">
                <div className="relative">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="w-3 h-3 text-emerald-400" />
                  </motion.div>
                </div>
                <span className="text-xs text-emerald-400">在线监测</span>
              </div>
            </div>
          </div>

          {/* 数据网格 */}
          <div className="px-2 pb-2 pt-1 grid grid-cols-4 gap-1.5 h-[calc(100%-42px)]">
            {stations.map((station, index) => {
              const level = getAqiLevel(station.aqi);
              return (
                <motion.div
                  key={station.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, type: 'spring' }}
                  className="relative group/card cursor-pointer"
                  onClick={() => handleCardClick(station)}
                >
                  <div className={`absolute inset-0 ${level.bg} blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300`} />

                  <div className={`relative h-full bg-slate-900/25 backdrop-blur-sm border ${level.border} p-1.5 overflow-hidden transition-all duration-200 group-hover/card:border-cyan-400/50 group-hover/card:scale-[1.02]`}>
                    <motion.div
                      className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent ${level.color}`}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                    />

                    <div className="text-xs text-cyan-400/80 mb-1 truncate font-medium">{station.name}</div>

                    <div className="space-y-0.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-cyan-400/50">PM2.5</span>
                        <div className="flex items-baseline gap-0.5">
                          <motion.span
                            key={station.pm25.toFixed(0)}
                            initial={{ scale: 1.2, color: '#06b6d4' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="text-lg font-bold tabular-nums drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                          >
                            {station.pm25.toFixed(0)}
                          </motion.span>
                          <span className="text-[9px] text-cyan-400/50">μg/m³</span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-cyan-400/50">AQI</span>
                        <div className="flex items-center gap-1.5">
                          <motion.span
                            key={station.aqi.toFixed(0)}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className={`text-lg font-bold tabular-nums ${level.color} drop-shadow-[0_0_8px_currentColor]`}
                          >
                            {station.aqi.toFixed(0)}
                          </motion.span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${level.bg} ${level.color} border ${level.border}`}>
                            {level.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/80">
                      <motion.div
                        className={`h-full ${level.color.replace('text-', 'bg-')} ${level.glow}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(station.aqi / 150) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <div className={`absolute top-0 left-0 w-6 h-[1px] ${level.color.replace('text-', 'bg-')} opacity-50`} />
                    <div className={`absolute top-0 left-0 w-[1px] h-6 ${level.color.replace('text-', 'bg-')} opacity-50`} />

                    <div className="absolute top-2 right-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${level.color.replace('text-', 'bg-')}`} />
                      <motion.div
                        className={`absolute inset-0 rounded-full ${level.color.replace('text-', 'bg-')}`}
                        animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.15 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <motion.line x1="0" y1="0" x2="60" y2="0" stroke="url(#monitorCornerGrad2)" strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
            <motion.line x1="0" y1="0" x2="0" y2="60" stroke="url(#monitorCornerGrad2)" strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.1 }} />
            <defs>
              <linearGradient id="monitorCornerGrad2">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* ====== 站点详情弹窗 ====== */}
      <AnimatePresence>
        {selectedStation && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 背景遮罩 — 极浅，不虚化 */}
            <motion.div
              className="absolute inset-0 bg-black/15"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* 弹窗主体 */}
            <motion.div
              className="relative w-[720px] max-h-[88vh] overflow-y-auto rounded-2xl border shadow-[0_0_80px_rgba(6,182,212,0.25),0_24px_64px_rgba(0,0,0,0.5)]"
              style={{
                background: 'linear-gradient(160deg, rgba(7, 30, 48, 0.97), rgba(3, 16, 28, 0.95))',
                borderColor: 'rgba(6, 182, 212, 0.35)',
                backdropFilter: 'blur(24px) saturate(140%)',
              }}
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const dl = getAqiLevelDetail(selectedStation.aqi);
                return (
                  <>
                    {/* 顶部彩色光条 */}
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-80"
                      style={{ background: `linear-gradient(90deg, transparent, ${dl.color}, transparent)`, boxShadow: `0 0 12px ${dl.color}88` }} />

                    {/* 边角装饰 */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="0" x2="50" y2="0" stroke={dl.color} strokeWidth="1.5" opacity="0.5" />
                      <line x1="0" y1="0" x2="0" y2="50" stroke={dl.color} strokeWidth="1.5" opacity="0.5" />
                      <line x1="100%" y1="0" x2="calc(100% - 50px)" y2="0" stroke={dl.color} strokeWidth="1.5" opacity="0.3" />
                      <line x1="100%" y1="0" x2="100%" y2="50" stroke={dl.color} strokeWidth="1.5" opacity="0.3" />
                    </svg>

                    {/* 头部 */}
                    <div className="relative px-7 py-6 border-b flex items-center justify-between"
                      style={{ borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-7 rounded-full flex-shrink-0"
                            style={{ background: `linear-gradient(180deg, ${dl.color}, transparent)`, boxShadow: `0 0 10px ${dl.color}88` }} />
                          <h2 className="text-xl font-bold text-white tracking-wide">{selectedStation.name}</h2>
                          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold border"
                            style={{ color: dl.color, background: dl.bg, borderColor: dl.border }}>
                            {dl.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-cyan-400/50 mt-1.5 ml-4">
                          {selectedStation.city} · 数据更新时间 {selectedStation.updatedAt}
                        </p>
                      </div>
                      <button
                        onClick={closeModal}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-800/50 text-cyan-400/70 hover:text-white hover:border-cyan-400/50 hover:bg-rose-500/20 transition-all duration-200"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    {/* 主内容 */}
                    <div className="relative px-7 py-6 space-y-5">
                      {/* AQI + PM2.5 大数字 */}
                      <div className="grid grid-cols-2 gap-5">
                        {/* AQI 卡片 */}
                        <div className="relative overflow-hidden rounded-2xl border p-6 group/aqi"
                          style={{ borderColor: dl.border, background: dl.bg }}>
                          <div className="absolute inset-0 opacity-0 group-hover/aqi:opacity-100 transition-opacity duration-500"
                            style={{ background: `radial-gradient(circle at 30% 40%, ${dl.color}22, transparent 60%)` }} />
                          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl"
                            style={{ background: dl.color }} />
                          <div className="relative">
                            <span className="text-[11px] tracking-widest uppercase" style={{ color: dl.color }}>AQI 指数</span>
                            <div className="flex items-baseline gap-2 mt-3">
                              <span className="text-[56px] font-bold tabular-nums text-white leading-none"
                                style={{ textShadow: `0 0 30px ${dl.color}55` }}>
                                {selectedStation.aqi.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-sm mt-1 block" style={{ color: dl.color }}>{dl.label}级别</span>
                            {/* AQI 色条 */}
                            <div className="mt-5 h-2.5 rounded-full bg-slate-800/80 overflow-hidden flex gap-[2px]">
                              <div className="h-full bg-emerald-500/80 rounded-l-full" style={{ width: '33.3%' }} />
                              <div className="h-full bg-cyan-500/80" style={{ width: '33.3%' }} />
                              <div className="h-full bg-yellow-500/80 rounded-r-full" style={{ width: '33.4%' }} />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[9px] text-cyan-400/35">
                              <span>优 0-50</span><span>良 51-100</span><span>污染 101+</span>
                            </div>
                          </div>
                        </div>

                        {/* PM2.5 卡片 */}
                        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-6 group/pm">
                          <div className="absolute inset-0 opacity-0 group-hover/pm:opacity-100 transition-opacity duration-500"
                            style={{ background: 'radial-gradient(circle at 30% 40%, rgba(6,182,212,0.12), transparent 60%)' }} />
                          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl bg-cyan-400" />
                          <div className="relative">
                            <span className="text-[11px] tracking-widest uppercase text-cyan-400/60">首要污染物 PM2.5</span>
                            <div className="flex items-baseline gap-2 mt-3">
                              <span className="text-[56px] font-bold tabular-nums text-white leading-none"
                                style={{ textShadow: '0 0 30px rgba(6,182,212,0.35)' }}>
                                {selectedStation.pm25.toFixed(0)}
                              </span>
                              <span className="text-sm text-cyan-400/60">μg/m³</span>
                            </div>
                            <div className="mt-5 flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-cyan-400/40">PM10</span>
                                <span className="text-white font-semibold text-sm">{selectedStation.pm10}</span>
                                <span className="text-cyan-400/40">μg/m³</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 气态污染物 */}
                      <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/25 p-6">
                        <h3 className="text-sm font-semibold text-cyan-300 mb-5 flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-400 to-purple-600 shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                          气态污染物浓度
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { label: 'O₃', value: selectedStation.o3, unit: 'μg/m³', max: 200, color: '#a78bfa', glow: 'rgba(168,85,247,0.4)' },
                            { label: 'NO₂', value: selectedStation.no2, unit: 'μg/m³', max: 100, color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
                            { label: 'SO₂', value: selectedStation.so2, unit: 'μg/m³', max: 60, color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
                            { label: 'CO', value: selectedStation.co, unit: 'mg/m³', max: 5, color: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
                          ].map(p => (
                            <div key={p.label} className="relative overflow-hidden bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 group/pol">
                              <div className="absolute inset-0 opacity-0 group-hover/pol:opacity-100 transition-opacity duration-300"
                                style={{ background: `radial-gradient(circle at 50% 0%, ${p.glow}15, transparent 50%)` }} />
                              <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs text-cyan-400/60 font-medium">{p.label}</span>
                                  <span className="text-[10px] text-cyan-400/35">{p.unit}</span>
                                </div>
                                <div className="text-2xl font-bold text-white tabular-nums">{p.value}</div>
                                <div className="mt-3 h-2 rounded-full bg-slate-700/60 overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (p.value / p.max) * 100)}%` }}
                                    transition={{ duration: 0.8, ease: 'ease-out' }}
                                    style={{ background: p.color, boxShadow: `0 0 8px ${p.glow}` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 气象条件 */}
                      <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/25 p-6">
                        <h3 className="text-sm font-semibold text-cyan-300 mb-5 flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
                          气象条件
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { icon: Thermometer, label: '温度', value: `${selectedStation.temperature}°C`, sub: `体感 ${selectedStation.feelsLike}°C`, accent: '#fb923c' },
                            { icon: Droplets, label: '相对湿度', value: `${selectedStation.humidity}%`, sub: selectedStation.humidity > 60 ? '偏高' : '正常', accent: '#38bdf8' },
                            { icon: Wind, label: '风速 / 风向', value: `${selectedStation.windSpeed} m/s`, sub: selectedStation.windDir, accent: '#34d399' },
                            { icon: Compass, label: '气压', value: `${selectedStation.pressure} hPa`, sub: selectedStation.pressure > 1013 ? '高压控制' : '低压影响', accent: '#a78bfa' },
                            { icon: Eye, label: '能见度', value: `${selectedStation.visibility} km`, sub: selectedStation.visibility < 5 ? '较低' : selectedStation.visibility < 10 ? '一般' : '良好', accent: '#fbbf24' },
                            { icon: Gauge, label: '天气状况', value: selectedStation.weather, sub: selectedStation.pm25 > 40 ? '不利于扩散' : '利于扩散', accent: '#f472b6' },
                          ].map((item, i) => {
                            const Icon = item.icon;
                            return (
                              <div key={i} className="relative overflow-hidden bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 group/met flex items-start gap-3 hover:border-slate-600/60 transition-all duration-200">
                                <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-700/40 flex items-center justify-center flex-shrink-0 mt-0.5 relative overflow-hidden">
                                  <div className="absolute inset-0 opacity-20" style={{ background: item.accent }} />
                                  <Icon size={15} style={{ color: item.accent }} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] text-cyan-400/45">{item.label}</div>
                                  <div className="text-sm font-semibold text-white mt-1">{item.value}</div>
                                  <div className="text-[10px] text-cyan-400/35 mt-0.5">{item.sub}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 底部 */}
                    <div className="relative px-7 py-4 border-t flex items-center justify-between"
                      style={{ borderColor: 'rgba(6, 182, 212, 0.12)' }}>
                      <span className="text-[10px] text-cyan-400/35">
                        数据来源：生态环境部国家空气质量监测网 · 自动站实时上报
                      </span>
                      <button
                        onClick={closeModal}
                        className="px-5 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/8 text-xs text-cyan-300/80 hover:bg-cyan-500/18 hover:border-cyan-400/45 hover:text-cyan-200 transition-all duration-200"
                      >
                        关闭 ESC
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
