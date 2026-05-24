import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAirQualityCtx } from '../hooks/AirQualityContext';

type Terrain = 'semi_basin' | 'coastal_plain' | 'piedmont_plain' | 'alluvial_plain' | 'piedmont_coastal' | 'basin';

interface GNode {
  id: string;
  name: string;
  cityName: string;
  lon: number; lat: number;
  elev: number;
  kappa: number;
  coastal: boolean;
  terrain: Terrain;
  isRef?: boolean;
  labelDir: 't' | 'b' | 'l' | 'r';
}

interface GEdge {
  s: string; t: string;
  d: number;
  elevDiff: number;
  crossMountain?: boolean;
  channel: string;
}

const VERTICES: GNode[] = [
  { id: 'bj', name: '北京',   cityName: '北京市',   lon: 116.4074, lat: 39.9042, elev: 43,  kappa: 0.70, coastal: false, terrain: 'semi_basin',       isRef: true, labelDir: 't' },
  { id: 'tj', name: '天津',   cityName: '天津市',   lon: 117.2008, lat: 39.0842, elev: 3,   kappa: 0.20, coastal: true,  terrain: 'coastal_plain',     labelDir: 'r' },
  { id: 'sjz', name: '石家庄', cityName: '石家庄市', lon: 114.5149, lat: 38.0428, elev: 78,  kappa: 0.50, coastal: false, terrain: 'piedmont_plain',    labelDir: 'b' },
  { id: 'bd', name: '保定',   cityName: '保定市',   lon: 115.4648, lat: 38.8738, elev: 17,  kappa: 0.40, coastal: false, terrain: 'piedmont_plain',    labelDir: 'l' },
  { id: 'lf', name: '廊坊',   cityName: '廊坊市',   lon: 116.6838, lat: 39.5385, elev: 9,   kappa: 0.15, coastal: false, terrain: 'alluvial_plain',    labelDir: 'b' },
  { id: 'ts', name: '唐山',   cityName: '唐山市',   lon: 118.1802, lat: 39.6305, elev: 25,  kappa: 0.30, coastal: false, terrain: 'piedmont_coastal',  labelDir: 't' },
  { id: 'ty', name: '太原',   cityName: '太原市',   lon: 112.5492, lat: 37.8570, elev: 811, kappa: 0.90, coastal: false, terrain: 'basin',             labelDir: 'b' },
  { id: 'hd', name: '邯郸',   cityName: '邯郸市',   lon: 114.5391, lat: 36.6256, elev: 55,  kappa: 0.45, coastal: false, terrain: 'piedmont_plain',    labelDir: 'b' },
  { id: 'qhd', name: '秦皇岛', cityName: '秦皇岛市', lon: 119.5976, lat: 39.9366, elev: 6,   kappa: 0.22, coastal: true,  terrain: 'piedmont_coastal',  labelDir: 'r' },
  { id: 'xt', name: '邢台',   cityName: '邢台市',   lon: 114.5047, lat: 37.0682, elev: 78,  kappa: 0.48, coastal: false, terrain: 'piedmont_plain',    labelDir: 'l' },
];

const EDGES: GEdge[] = [
  { s: 'bj', t: 'lf', d: 57,  elevDiff: 34,  channel: '京廊走廊' },
  { s: 'bj', t: 'tj', d: 120, elevDiff: 40,  channel: '京津走廊' },
  { s: 'bj', t: 'bd', d: 138, elevDiff: 26,  channel: '太行山前' },
  { s: 'bj', t: 'ts', d: 155, elevDiff: 18,  channel: '京唐通道' },
  { s: 'tj', t: 'lf', d: 62,  elevDiff: 6,   channel: '京津走廊' },
  { s: 'tj', t: 'ts', d: 109, elevDiff: 22,  channel: '渤海沿岸' },
  { s: 'ts', t: 'qhd', d: 150, elevDiff: 19,  channel: '渤海沿岸' },
  { s: 'bd', t: 'lf', d: 133, elevDiff: 8,   channel: '华北平原' },
  { s: 'bd', t: 'sjz', d: 125, elevDiff: 61, channel: '太行山前' },
  { s: 'sjz', t: 'xt', d: 115, elevDiff: 0,  channel: '太行山前' },
  { s: 'xt', t: 'hd', d: 55,  elevDiff: 23,  channel: '太行山前' },
  { s: 'ty', t: 'sjz', d: 196, elevDiff: 733, channel: '娘子关通道', crossMountain: true },
  { s: 'ty', t: 'xt', d: 220, elevDiff: 733, channel: '晋冀通道', crossMountain: true },
];

const TERRAIN_LABEL: Record<Terrain, string> = {
  semi_basin: '半盆地', coastal_plain: '滨海平原', piedmont_plain: '山前平原',
  alluvial_plain: '冲积平原', piedmont_coastal: '山前滨海', basin: '盆地',
};

const TENCENT_MAP_KEY = 'DZOBZ-UHEC3-SCL3O-OREXX-2GRV6-7OBTJ';

// 墨卡托投影: lat/lon → 相对于地图容器的像素坐标
function mercatorProject(
  lon: number, lat: number,
  mapCenterLon: number, mapCenterLat: number,
  zoom: number,
  containerW: number, containerH: number,
): { x: number; y: number } {
  const TILE_SIZE = 256;
  const scale = Math.pow(2, zoom);

  const toWorldX = (lng: number) => TILE_SIZE * (lng + 180) / 360;
  const toWorldY = (lt: number) => {
    const sinLat = Math.sin(lt * Math.PI / 180);
    return TILE_SIZE * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI));
  };

  const cx = toWorldX(mapCenterLon);
  const cy = toWorldY(mapCenterLat);
  const wx = toWorldX(lon);
  const wy = toWorldY(lat);

  return {
    x: (wx - cx) * scale + containerW / 2,
    y: (wy - cy) * scale + containerH / 2,
  };
}

function pm25Color(pm25: number) {
  if (pm25 <= 35)  return { main: '#22d3ee', glow: 'rgba(34,211,238,0.7)', soft: 'rgba(34,211,238,0.18)' };
  if (pm25 <= 75)  return { main: '#38bdf8', glow: 'rgba(56,189,248,0.7)', soft: 'rgba(56,189,248,0.18)' };
  if (pm25 <= 115) return { main: '#fbbf24', glow: 'rgba(251,191,36,0.7)', soft: 'rgba(251,191,36,0.18)' };
  if (pm25 <= 150) return { main: '#fb923c', glow: 'rgba(251,146,60,0.7)', soft: 'rgba(251,146,60,0.18)' };
  return { main: '#f87171', glow: 'rgba(248,113,113,0.7)', soft: 'rgba(248,113,113,0.18)' };
}

export function NetworkGraph() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 460 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapInfo, setMapInfo] = useState({ centerLon: 115.5, centerLat: 38.5, zoom: 7 });
  const { cities } = useAirQualityCtx();

  // 监听容器尺寸
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(420, r.width), h: Math.max(340, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 计算所有节点的边界
  const bounds = useMemo(() => {
    const lons = VERTICES.map(v => v.lon);
    const lats = VERTICES.map(v => v.lat);
    return {
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }, []);

  // 加载腾讯地图
  useEffect(() => {
    const el = mapDivRef.current;
    if (!el) return;
    let destroyed = false;

    const init = async () => {
      try {
        // 加载腾讯地图 GL JS
        const TMap = await new Promise<any>((resolve, reject) => {
          if ((window as any).TMap?.Map) { resolve((window as any).TMap); return; }
          const s = document.createElement('script');
          s.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}`;
          s.async = true;
          s.onload = () => {
            let ticks = 0;
            const check = setInterval(() => {
              ticks++;
              if ((window as any).TMap?.Map) { clearInterval(check); resolve((window as any).TMap); }
              else if (ticks > 80) { clearInterval(check); reject(new Error('TMap load timeout')); }
            }, 50);
          };
          s.onerror = () => reject(new Error('Script load failed'));
          document.head.appendChild(s);
        });

        if (destroyed) return;

        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;

        const map = new TMap.Map(el, {
          center: new TMap.LatLng(centerLat, centerLon),
          zoom: 7.2,
          rotation: 0,
          pitch: 0,
          viewMode: '2D',
          baseMap: { type: 'vector', features: ['base', 'building3d', 'label'] },
          showControl: false,
        });

        mapRef.current = map;
        setMapInfo({ centerLon, centerLat, zoom: 7.2 });
        setMapReady(true);

        // 禁用交互
        map.setDraggable(false);
        map.setScrollable(false);
        map.setDoubleClickZoom(false);
      } catch (err) {
        console.warn('Tencent Map failed, using fallback:', err);
        setMapFailed(true);
      }
    };

    // 延迟初始化，确保DOM就绪
    const timer = setTimeout(init, 200);
    return () => { destroyed = true; clearTimeout(timer); };
  }, []);

  // 墨卡托投影（与腾讯地图对齐）
  const project = useCallback((lon: number, lat: number) => {
    return mercatorProject(
      lon, lat,
      mapInfo.centerLon, mapInfo.centerLat,
      mapInfo.zoom,
      size.w, size.h,
    );
  }, [mapInfo, size]);

  const pm25Map = useMemo(() => {
    const m = new Map<string, number>();
    VERTICES.forEach(v => {
      const c = cities.find(x => x.city === v.cityName || x.city === v.name);
      m.set(v.id, c?.pm25 ?? 0);
    });
    return m;
  }, [cities]);

  const positions = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    VERTICES.forEach(v => p.set(v.id, project(v.lon, v.lat)));
    return p;
  }, [project]);

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    VERTICES.forEach(v => d.set(v.id, 0));
    EDGES.forEach(e => { d.set(e.s, (d.get(e.s) ?? 0) + 1); d.set(e.t, (d.get(e.t) ?? 0) + 1); });
    return d;
  }, []);

  const weight = useCallback((e: GEdge) => {
    const base = 1 / e.d;
    if (e.crossMountain) {
      const elevAtten = Math.exp(-e.elevDiff / 350);
      const target = VERTICES.find(v => v.id === e.t)!;
      return base * elevAtten * (1 - target.kappa);
    }
    return base;
  }, []);

  const neighborSet = useMemo(() => {
    if (!selected) return new Set<string>();
    const ns = new Set<string>();
    EDGES.forEach(e => { if (e.s === selected) ns.add(e.t); if (e.t === selected) ns.add(e.s); });
    return ns;
  }, [selected]);

  // 绘制图网络（叠加在地图之上）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let phase = 0;
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size.w, size.h);

      // ===== 边 =====
      EDGES.forEach((e) => {
        const a = positions.get(e.s);
        const b = positions.get(e.t);
        if (!a || !b) return;
        const w = weight(e);
        const wNorm = Math.min(w * 60, 1);
        const highlight = !selected || (e.s === selected || e.t === selected);
        const alpha = highlight ? 1 : 0.06;

        // 发光底层
        if (highlight && wNorm > 0.03) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = e.crossMountain
            ? `rgba(251,146,60,${0.15 * alpha})`
            : `rgba(34,211,238,${0.12 * alpha})`;
          ctx.lineWidth = (1.8 + wNorm * 3) + 5;
          ctx.stroke();
        }

        // 主线
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (e.crossMountain) {
          ctx.strokeStyle = `rgba(251,146,60,${0.6 * alpha})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
        } else {
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          const sc = pm25Color(pm25Map.get(e.s) ?? 35);
          const tc = pm25Color(pm25Map.get(e.t) ?? 35);
          grad.addColorStop(0, sc.main);
          grad.addColorStop(1, tc.main);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2 + wNorm * 3.5;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 流动粒子
        if (highlight && wNorm > 0.04) {
          const flow = e.crossMountain ? 0.3 : 1.2 + wNorm * 3;
          const numP = Math.max(1, Math.round(flow));
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
          if (dist > 0) {
            for (let j = 0; j < numP; j++) {
              const o = ((phase * (0.25 + wNorm * 0.6) + j * dist / numP) % dist) / dist;
              const px = a.x + dx * o, py = a.y + dy * o;
              const ps = 1.6 + wNorm * 1.8;
              const col = e.crossMountain ? '251,146,60' : '34,211,238';
              const g = ctx.createRadialGradient(px, py, 0, px, py, ps * 3.5);
              g.addColorStop(0, `rgba(${col}, 0.9)`);
              g.addColorStop(0.5, `rgba(${col}, 0.3)`);
              g.addColorStop(1, `rgba(${col}, 0)`);
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(px, py, ps * 3.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(px, py, ps * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = e.crossMountain ? '#fed7aa' : '#cffafe';
              ctx.fill();
            }
          }
        }

        // 通道标签
        if (highlight && wNorm > 0.02) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const ox = -Math.sin(angle) * 10;
          const oy =  Math.cos(angle) * 10;
          ctx.save();
          ctx.translate(mx + ox, my + oy);
          ctx.font = '8px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          const txt = e.channel;
          const tw = ctx.measureText(txt).width;
          ctx.fillStyle = 'rgba(2, 8, 23, 0.9)';
          ctx.beginPath();
          ctx.roundRect(-tw / 2 - 4, -7, tw + 8, 13, 3);
          ctx.fill();
          ctx.fillStyle = e.crossMountain ? 'rgba(251,146,60,0.7)' : 'rgba(34,211,238,0.6)';
          ctx.fillText(txt, 0, 2);
          ctx.restore();
        }
      });

      // ===== 节点 =====
      VERTICES.forEach((v) => {
        const p = positions.get(v.id);
        if (!p) return;
        const pm25 = pm25Map.get(v.id) ?? 0;
        const col = pm25Color(pm25);
        const deg = degree.get(v.id) ?? 0;
        const isSel = selected === v.id;
        const isHov = hovered === v.id;
        const isNeighbor = neighborSet.has(v.id);
        const dim = !selected || isSel || isNeighbor ? 1 : 0.15;

        const r = 15 + deg * 3;

        // 影响范围
        const infR = r + (1 - v.kappa) * 28;
        ctx.beginPath();
        ctx.arc(p.x, p.y, infR, 0, Math.PI * 2);
        ctx.fillStyle = col.soft.replace('0.18', String(0.07 * dim));
        ctx.fill();
        ctx.strokeStyle = `${col.main}${Math.round(22 * dim).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 光晕
        const pulse = r + 6 + Math.sin(phase / 30 + VERTICES.indexOf(v) * 1.2) * 3;
        const pg = ctx.createRadialGradient(p.x, p.y, r * 0.35, p.x, p.y, pulse + 10);
        pg.addColorStop(0, col.glow.replace('0.7', String(0.45 * dim)));
        pg.addColorStop(0.6, col.glow.replace('0.7', String(0.12 * dim)));
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, pulse + 10, 0, Math.PI * 2);
        ctx.fillStyle = pg; ctx.fill();

        // 节点主体
        const ng = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.05, p.x, p.y, r);
        ng.addColorStop(0, 'rgba(255,255,255,0.95)');
        ng.addColorStop(0.25, col.main);
        ng.addColorStop(0.7, col.main);
        ng.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.globalAlpha = dim;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 边框
        ctx.lineWidth = isSel ? 3 : isHov ? 2 : 1.3;
        ctx.strokeStyle = isSel ? '#ffffff' : isHov ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)';
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = isSel ? 24 : isHov ? 16 : 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 选中/悬停 外环
        if (isSel || isHov) {
          ctx.lineWidth = isSel ? 2.5 : 1.2;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 城市名
        ctx.fillStyle = `rgba(255,255,255,${0.95 * dim})`;
        ctx.textAlign = 'center';
        ctx.font = `bold ${isSel ? 13 : 11}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(v.name, p.x, p.y + 4);
        ctx.shadowBlur = 0;

        // REF 标记
        if (v.isRef) {
          const refY = p.y - r - 8;
          ctx.fillStyle = 'rgba(2,8,23,0.85)';
          ctx.beginPath();
          ctx.roundRect(p.x - 14, refY - 8, 28, 13, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(252,211,77,0.55)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(p.x - 14, refY - 8, 28, 13, 3);
          ctx.stroke();
          ctx.fillStyle = 'rgba(252,211,77,0.9)';
          ctx.font = 'bold 9px "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText('REF', p.x, refY + 2);
        }

        // 详细信息标签
        if (isSel) {
          const lines = [
            `PM2.5  ${pm25.toFixed(1)} μg/m³`,
            `海拔 ${v.elev}m  κ=${v.kappa}`,
            `地形 ${TERRAIN_LABEL[v.terrain]}`,
          ];
          ctx.font = '9px "PingFang SC", "Microsoft YaHei", monospace';
          const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
          const boxW = maxW + 16;
          const boxH = lines.length * 13 + 12;

          let bx = p.x - boxW / 2;
          let by = p.y + r + 14;
          if (v.labelDir === 't') by = p.y - r - boxH - 14;
          else if (v.labelDir === 'l') { bx = p.x - r - boxW - 14; by = p.y - boxH / 2; }
          else if (v.labelDir === 'r') { bx = p.x + r + 14; by = p.y - boxH / 2; }

          bx = Math.max(2, Math.min(size.w - boxW - 2, bx));
          by = Math.max(2, Math.min(size.h - boxH - 2, by));

          ctx.fillStyle = 'rgba(2, 8, 23, 0.94)';
          ctx.beginPath();
          ctx.roundRect(bx, by, boxW, boxH, 5);
          ctx.fill();
          ctx.strokeStyle = `${col.main}66`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx, by, boxW, boxH, 5);
          ctx.stroke();

          ctx.textAlign = 'center';
          lines.forEach((l, li) => {
            ctx.fillStyle = li === 0 ? col.main : 'rgba(148,163,184,0.8)';
            ctx.font = li === 0 ? 'bold 9px "PingFang SC", "Microsoft YaHei", monospace' : '8px "PingFang SC", "Microsoft YaHei", monospace';
            ctx.fillText(l, bx + boxW / 2, by + 13 + li * 13);
          });
        }
      });

      phase += 1.0;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [selected, hovered, pm25Map, positions, degree, neighborSet, size, weight]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    for (const v of VERTICES) {
      const p = positions.get(v.id);
      if (!p) continue;
      const r = 15 + (degree.get(v.id) ?? 0) * 3;
      if (Math.hypot(x - p.x, y - p.y) <= r + 8) {
        setSelected(selected === v.id ? null : v.id);
        return;
      }
    }
    setSelected(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    let found: string | null = null;
    for (const v of VERTICES) {
      const p = positions.get(v.id);
      if (!p) continue;
      const r = 15 + (degree.get(v.id) ?? 0) * 3;
      if (Math.hypot(x - p.x, y - p.y) <= r + 8) {
        found = v.id; break;
      }
    }
    setHovered(found);
  };

  const stats = useMemo(() => {
    const V = VERTICES.length;
    const E = EDGES.length;
    const avgDeg = (2 * E) / V;
    const density = (2 * E) / (V * (V - 1));
    const totalW = EDGES.reduce((s, e) => s + weight(e), 0);
    return { V, E, avgDeg, density, avgW: totalW / E };
  }, [weight]);

  const selV = selected ? VERTICES.find(v => v.id === selected) : null;

  return (
    <div className="relative h-full group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative h-full bg-gradient-to-br from-slate-900/25 via-slate-800/15 to-slate-900/25 backdrop-blur-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col">
        {/* 标题栏 */}
        <div className="relative px-3 py-1.5 border-b border-cyan-500/20 bg-slate-900/30 flex-shrink-0">
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(6,182,212,0.8)] flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  京津冀 PM<sub>2.5</sub> 跨城传输网络
                </h3>
                <p className="text-[9px] text-cyan-400/50 mt-0.5">
                  污染物传输通道 · 点击节点查看属性
                </p>
              </div>
            </div>
            <div className="flex gap-2 text-[10px] flex-shrink-0">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                <span className="w-3 h-[2px] bg-cyan-400 rounded" />
                <span className="text-cyan-300">平原通道</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 border border-dashed border-orange-500/30 rounded">
                <span className="w-3 h-0 border-t border-dashed border-orange-400" />
                <span className="text-orange-300">跨山通道</span>
              </span>
            </div>
          </div>
        </div>

        {/* 图区域 */}
        <div ref={wrapRef} className="relative flex-1 min-h-0">
          {/* 腾讯地图背景 */}
          <div
            ref={mapDivRef}
            className="absolute inset-0 z-0"
            style={{ opacity: mapReady ? 0.9 : 0 }}
          />

          {/* 地图未加载时的占位背景 */}
          {!mapReady && (
            <div className="absolute inset-0 z-0 bg-[#0f1724] flex items-center justify-center">
              {mapFailed ? (
                <span className="text-cyan-400/30 text-xs">地图加载失败 · 显示传输网络</span>
              ) : (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-cyan-400/50 text-xs">加载地图...</span>
                </div>
              )}
            </div>
          )}

          {/* Canvas 覆盖层 */}
          <canvas
            ref={canvasRef}
            onClick={onClick}
            onMouseMove={onMouseMove}
            className="absolute inset-0 z-10 cursor-pointer"
          />

          {/* 右上角图例面板 */}
          <DraggablePanel
            className="absolute z-20 bg-slate-900/85 backdrop-blur-xl border border-cyan-500/25 rounded-lg px-3.5 py-3 text-[12px] w-[180px]"
            initialStyle={{ top: '80px', right: '12px' }}
          >
            {selV ? (
              <div className="font-mono space-y-0.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyan-300 font-semibold tracking-wider">{selV.id} · {selV.name}</span>
                  {selV.isRef && <span className="text-amber-300 text-[9px] bg-amber-500/15 px-1 rounded">REF</span>}
                </div>
                <StatRow k="经度" v={`${selV.lon.toFixed(2)}°E`} />
                <StatRow k="纬度" v={`${selV.lat.toFixed(2)}°N`} />
                <StatRow k="海拔" v={`${selV.elev}m`} />
                <StatRow k="κ系数" v={`${selV.kappa}`} />
                <StatRow k="度" v={`${degree.get(selV.id) ?? 0}`} />
                <StatRow k="地形" v={TERRAIN_LABEL[selV.terrain]} />
                <div className="mt-0.5 pt-0.5 border-t border-cyan-500/15">
                  <StatRow k="PM2.5" v={`${(pm25Map.get(selV.id) ?? 0).toFixed(1)} μg`} highlight />
                </div>
              </div>
            ) : (
              <>
                <div className="text-cyan-300/80 font-semibold mb-2 text-[12px] tracking-widest">PM2.5 等级</div>
                <LegendRow color="#22d3ee" label="优 ≤35" />
                <LegendRow color="#38bdf8" label="良 ≤75" />
                <LegendRow color="#fbbf24" label="轻度 ≤115" />
                <LegendRow color="#fb923c" label="中度 ≤150" />
                <LegendRow color="#f87171" label="重度 >150" />
              </>
            )}
          </DraggablePanel>

          {/* 网络统计 */}
          <DraggablePanel
            className="absolute z-20 bg-slate-900/85 backdrop-blur-xl border border-cyan-500/25 rounded-lg px-3.5 py-3 text-[12px] font-mono w-[180px]"
            initialStyle={{ bottom: '12px', right: '12px' }}
          >
            <div className="text-cyan-300/60 font-semibold mb-2 tracking-widest text-[12px]">网络统计</div>
            <StatRow k="|V|" v={`${stats.V}`} />
            <StatRow k="|E|" v={`${stats.E}`} />
            <StatRow k="密度 ρ" v={stats.density.toFixed(3)} />
            <StatRow k="平均度" v={stats.avgDeg.toFixed(2)} />
            <StatRow k="平均权" v={stats.avgW.toFixed(4)} />
          </DraggablePanel>
        </div>

        {/* 四角装饰 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {[
            { x1: 0, y1: 0, x2: 50, y2: 0, x3: 0, y3: 50, d: 0 },
            { x1: '100%' as any, y1: 0, x2: 'calc(100% - 50px)' as any, y2: 0, x3: '100%' as any, y3: 50, d: 0.15 },
            { x1: 0, y1: '100%' as any, x2: 50, y2: '100%' as any, x3: 0, y3: 'calc(100% - 50px)' as any, d: 0.3 },
            { x1: '100%' as any, y1: '100%' as any, x2: 'calc(100% - 50px)' as any, y2: '100%' as any, x3: '100%' as any, y3: 'calc(100% - 50px)' as any, d: 0.45 },
          ].map((c, i) => (
            <g key={i}>
              <motion.line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="url(#netCorner3)" strokeWidth="1.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: c.d }} />
              <motion.line x1={c.x1} y1={c.y1} x2={c.x3} y2={c.y3} stroke="url(#netCorner3)" strokeWidth="1.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: c.d + 0.05 }} />
            </g>
          ))}
          <defs>
            <linearGradient id="netCorner3">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function StatRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3 leading-[1.45]">
      <span className="text-cyan-400/50">{k}</span>
      <span className={highlight ? 'text-cyan-200 tabular-nums font-semibold' : 'text-cyan-300/80 tabular-nums'}>{v}</span>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 leading-[1.45]">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}80` }} />
      <span className="text-cyan-300/70 font-mono">{label}</span>
    </div>
  );
}

function DraggablePanel({
  children, className, initialStyle,
}: {
  children: React.ReactNode;
  className?: string;
  initialStyle: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = el.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    const onMove = (ev: MouseEvent) => {
      const parent = el.parentElement;
      if (!parent) return;
      const pRect = parent.getBoundingClientRect();
      el.style.left = `${ev.clientX - pRect.left - offsetX}px`;
      el.style.top = `${ev.clientY - pRect.top - offsetY}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      el.style.cursor = 'grab';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    el.style.cursor = 'grabbing';
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...initialStyle, cursor: 'grab' }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
