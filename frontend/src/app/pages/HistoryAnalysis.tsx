import { useState, useEffect, useRef } from 'react';
import {
  getOverview, getComparison, getCityMonthly, getSeasonalStats,
  getPolicyTimeline, getTransfer, getAlerts, getCityDaily,
} from '../services/api';
import type { OverviewMetrics, CityComparison, MonthlyItem, PolicyItem } from '../services/api';
import './history-analysis.css';

const CITIES = ['北京市','天津市','石家庄市','唐山市','太原市','保定市','廊坊市','邯郸市','秦皇岛市','邢台市'];
const DAILY_WINDOW_YEARS = 3;
const DAILY_VIEW_DAYS = 240;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function latestYearWindow(data: any[], years = DAILY_WINDOW_YEARS) {
  const yearValues = Array.from(
    new Set(data.map((d: any) => d.year || Number(String(d.date_iso || '').slice(0, 4))).filter(Boolean))
  ).sort((a: number, b: number) => a - b);
  const keepYears = new Set(yearValues.slice(-years));
  return data.filter((d: any) => keepYears.has(d.year || Number(String(d.date_iso || '').slice(0, 4))));
}

/* ============================== CountUp ============================== */
function CountUp({ value, decimals = 2, duration = 2000, suffix = '', prefix = '' }: {
  value: number; decimals?: number; duration?: number; suffix?: string; prefix?: string;
}) {
  const [v, setV] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 2.7);
      const current = start + (end - start) * eased;
      setV(current);
      if (progress >= 1) { clearInterval(timer); ref.current = end; }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{prefix}{v.toFixed(decimals)}{suffix}</>;
}

/* ============================== Canvas - Monthly Trend ============================== */
function MonthlyTrendCanvas({ data }: { data: MonthlyItem[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || data.length === 0) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.parentElement!.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const pad = { t: 20, r: 20, b: 36, l: 50 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const items = data.slice(-36).map((m: any) => ({
      label: `${m.year}-${String(m.month).padStart(2, '0')}`,
      obs: m.avg_observed, cf: m.avg_counterfactual, net: m.avg_net,
    }));
    const allValues = items.flatMap((d: any) => [Number(d.obs || 0), Number(d.cf || 0), Number(d.net || 0)]).concat([0]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const rawSpan = Math.max(1, rawMax - rawMin);
    const minY = rawMin - rawSpan * 0.08;
    const maxY = rawMax + rawSpan * 0.08;
    const ySpan = Math.max(1, maxY - minY);
    const x = (i: number) => pad.l + (items.length === 1 ? 0 : (i / (items.length - 1)) * pw);
    const y = (v: number) => pad.t + ph - ((v - minY) / ySpan) * ph;
    const y0 = y(0);
    ctx.strokeStyle = 'rgba(137,211,220,0.08)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const yy = pad.t + (ph / 4) * i;
      const tick = maxY - (ySpan / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
      ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(tick.toFixed(0), pad.l - 6, yy + 3);
    }
    ctx.strokeStyle = 'rgba(211,255,244,0.2)'; ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(W - pad.r, y0); ctx.stroke();
    ctx.setLineDash([]);
    const bw = Math.max(2, pw / items.length * 0.6);
    items.forEach((d: any, i: number) => {
      const valueY = y(Number(d.net || 0));
      const top = Math.min(valueY, y0);
      const h = Math.max(1, Math.abs(y0 - valueY));
      const grad = ctx.createLinearGradient(0, top, 0, top + h);
      grad.addColorStop(0, '#7df8e5'); grad.addColorStop(1, '#59acff');
      ctx.fillStyle = grad; ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.roundRect(x(i) - bw / 2, top, bw, h, 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.strokeStyle = '#66bcff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    items.forEach((d: any, i: number) => i === 0 ? ctx.moveTo(x(i), y(d.obs)) : ctx.lineTo(x(i), y(d.obs)));
    ctx.stroke();
    ctx.strokeStyle = '#65f0d7'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    items.forEach((d: any, i: number) => i === 0 ? ctx.moveTo(x(i), y(d.cf)) : ctx.lineTo(x(i), y(d.cf)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    items.forEach((d: any, i: number) => {
      if (i % 5 === 0) ctx.fillText(d.label, x(i), pad.t + ph + 14);
    });
  }, [data]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ============================== Canvas - City Bar ============================== */
function CityBarCanvas({ data }: { data: CityComparison[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const c = ref.current; if (!c || data.length === 0) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.parentElement!.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const pad = { t: 10, r: 40, b: 10, l: 56 };
    const sorted = [...data].sort((a: any, b: any) => b.avg_net - a.avg_net);
    const maxV = sorted[0]?.avg_net || 1;
    const pw = W - pad.l - pad.r;
    const barH = Math.min(22, (H - pad.t - pad.b) / sorted.length - 6);

    let start = 0;
    const duration = 800;
    const draw = (t: number) => {
      if (!start) start = t;
      const progress = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 2.5);

      ctx.clearRect(0, 0, W, H);

      sorted.forEach((d: any, i: number) => {
        const top = pad.t + i * (barH + 6);
        const targetW = Math.max(6, (d.avg_net / maxV) * pw);
        const w = targetW * eased;
        const isTop3 = i < 3;
        const isNeg = d.avg_net < 0;

        // Glow behind bar
        if (isTop3 && w > 4) {
          ctx.save();
          ctx.shadowColor = isNeg ? 'rgba(249,115,22,0.6)' : 'rgba(16,185,129,0.6)';
          ctx.shadowBlur = 14;
          ctx.fillStyle = isNeg ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.15)';
          ctx.beginPath(); ctx.roundRect(pad.l, top, w, barH, 3); ctx.fill();
          ctx.restore();
        }

        // Bar gradient
        const grad = ctx.createLinearGradient(pad.l, 0, pad.l + targetW, 0);
        if (isNeg) {
          grad.addColorStop(0, '#f97316'); grad.addColorStop(0.5, '#fb923c'); grad.addColorStop(1, '#fed7aa');
        } else if (isTop3) {
          grad.addColorStop(0, '#10b981'); grad.addColorStop(0.4, '#34d399'); grad.addColorStop(0.7, '#6ee7b7'); grad.addColorStop(1, '#a7f3d0');
        } else {
          grad.addColorStop(0, '#06b6d4'); grad.addColorStop(0.5, '#22d3ee'); grad.addColorStop(1, '#67e8f9');
        }
        ctx.fillStyle = grad;
        ctx.globalAlpha = isTop3 ? 0.9 : 0.7;
        ctx.beginPath(); ctx.roundRect(pad.l, top, w, barH, 3); ctx.fill();
        ctx.globalAlpha = 1;

        // Bar top highlight
        if (w > 8) {
          const hlg = ctx.createLinearGradient(pad.l, top, pad.l, top + barH);
          hlg.addColorStop(0, 'rgba(255,255,255,0.35)'); hlg.addColorStop(0.5, 'rgba(255,255,255,0.05)'); hlg.addColorStop(1, 'rgba(0,0,0,0.1)');
          ctx.fillStyle = hlg;
          ctx.beginPath(); ctx.roundRect(pad.l, top, w, barH, 3); ctx.fill();
        }

        // City label
        ctx.fillStyle = isTop3 ? '#ffffff' : '#b0cdd8';
        ctx.font = `${isTop3 ? 'bold ' : ''}10px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.city.replace('市', ''), pad.l - 6, top + barH / 2);

        // Value label with glow
        if (w > 20) {
          ctx.save();
          ctx.shadowColor = isNeg ? 'rgba(249,115,22,0.7)' : 'rgba(16,185,129,0.7)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = isNeg ? '#ffedd5' : '#d1fae5';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(d.avg_net.toFixed(1), pad.l + w + 6, top + barH / 2);
          ctx.restore();
        }
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ============================== Canvas - Pie ============================== */
function PieCanvas({ data }: { data: CityComparison[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || data.length === 0) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.parentElement!.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const cx = W * 0.34, cy = H * 0.5, r = Math.min(cx - 20, cy - 20, 70);
    const colors = ['#71f2df','#63c4ff','#8aa8ff','#49d8b5','#5be0ff','#78ffde','#4de8c8','#55a8ff','#6dc8e8','#80e8d4'];
    const total = data.reduce((s: number, d: any) => s + Math.abs(d.avg_net), 0) || 1;
    let angle = -Math.PI / 2;
    data.forEach((d: any, i: number) => {
      const slice = (Math.abs(d.avg_net) / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.8; ctx.fill();
      ctx.globalAlpha = 1;
      const itemH = Math.min(22, (H - 60) / data.length);
      const lx = W * 0.64, ly = 18 + i * itemH;
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(lx, ly, 8, 8);
      ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${d.city.replace('市','')} ${((Math.abs(d.avg_net) / total) * 100).toFixed(1)}%`, lx + 12, ly + 7);
      angle += slice;
    });
    ctx.fillStyle = '#dbfbff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('城市贡献', cx, cy + 4);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#020d15'; ctx.fill();
  }, [data]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ============================== Canvas - Box Plot ============================== */
function BoxPlotCanvas({ data }: { data: MonthlyItem[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || data.length === 0) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.parentElement!.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const pad = { t: 20, r: 20, b: 36, l: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const byMonth: Record<number, number[]> = {};
    data.forEach((d: any) => { if (!byMonth[d.month]) byMonth[d.month] = []; byMonth[d.month].push(d.avg_net); });
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const allVals = Object.values(byMonth).flat();
    const maxV = Math.max(...allVals.map(Math.abs)) * 1.2 || 10;
    const minV = -maxV;
    const x = (i: number) => pad.l + (pw / 12) * (i + 0.5);
    const yv = (v: number) => pad.t + ph - ((v - minV) / (maxV - minV)) * ph;
    const y0 = yv(0);
    ctx.strokeStyle = 'rgba(137,211,220,0.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(W - pad.r, y0); ctx.stroke();
    months.forEach((m, i) => {
      const vals = byMonth[m] || [];
      if (vals.length < 2) return;
      vals.sort((a, b) => a - b);
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const median = vals[Math.floor(vals.length * 0.5)];
      const iqr = q3 - q1;
      const lower = Math.max(minV, q1 - 1.5 * iqr);
      const upper = Math.min(maxV, q3 + 1.5 * iqr);
      const bw = Math.min(24, pw / 14);
      const cxp = x(i);
      ctx.fillStyle = 'rgba(98,195,255,0.22)'; ctx.strokeStyle = '#69f0dc'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cxp - bw / 2, yv(q3), bw, yv(q1) - yv(q3), 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c8fff4'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cxp - bw / 2, yv(median)); ctx.lineTo(cxp + bw / 2, yv(median)); ctx.stroke();
      ctx.strokeStyle = '#9deee5'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cxp, yv(lower)); ctx.lineTo(cxp, yv(q1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cxp, yv(upper)); ctx.lineTo(cxp, yv(q3)); ctx.stroke();
      ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      if (m % 2 === 1) ctx.fillText(`${m}月`, cxp, pad.t + ph + 14);
    });
  }, [data]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ============================== Canvas - Daily Analysis ============================== */
function DailyCanvas({ data }: { data: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{
    x: (i: number) => number;
    y: (v: number) => number;
    pad: { t: number; r: number; b: number; l: number };
    W: number; H: number;
    items: any[];
    observed: number[];
    counterfactual: number[];
    net: number[];
    drawBase: () => void;
  } | null>(null);
  const hoverRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    ix: number; cx: number; cyObs: number; cyCf: number; cyNet: number;
    date: string; obs: number; cf: number; net: number;
  } | null>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c || data.length === 0) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.parentElement!.getBoundingClientRect();
    const W = Math.max(800, rect.width);
    const H = Math.max(360, rect.height || 420);
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    const pad = { t: 24, r: 24, b: 40, l: 56 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const items = data;
    const observed = items.map((d: any) => Number(d.observed || 0));
    const counterfactual = items.map((d: any) => Number(d.counterfactual || 0));
    const net = items.map((d: any) => Number(d.net_reduction || 0));
    const allValues = observed.concat(counterfactual, net, [0]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const minY = rawMin;
    const maxY = rawMax;
    const ySpan = Math.max(1, maxY - minY);
    const x = (i: number) => pad.l + (items.length === 1 ? 0 : (i / (items.length - 1)) * pw);
    const y = (v: number) => pad.t + ph - ((v - minY) / ySpan) * ph;
    const y0 = y(0);

    const drawBase = () => {
      ctx.clearRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = 'rgba(137,211,220,0.07)'; ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const yy = pad.t + (ph / 5) * i;
        const tick = maxY - (ySpan / 5) * i;
        ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
        ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(tick.toFixed(1), pad.l - 8, yy + 3);
      }
      // Zero line
      ctx.strokeStyle = 'rgba(211,255,244,0.22)'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(pad.l, y0); ctx.lineTo(W - pad.r, y0); ctx.stroke();
      ctx.setLineDash([]);
      // Net fill
      ctx.fillStyle = 'rgba(211,255,244,0.06)';
      ctx.beginPath();
      net.forEach((v: number, i: number) => {
        i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v));
      });
      for (let i = items.length - 1; i >= 0; i--) ctx.lineTo(x(i), y0);
      ctx.closePath(); ctx.fill();

      const drawLine = (values: number[], color: string, width: number, dashed = false, glow = false) => {
        if (glow) {
          ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.16; ctx.lineWidth = width + 4;
          ctx.setLineDash(dashed ? [5, 4] : []);
          ctx.beginPath();
          values.forEach((v: number, i: number) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
          ctx.stroke(); ctx.restore();
        }
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.setLineDash(dashed ? [5, 4] : []);
        ctx.beginPath();
        values.forEach((v: number, i: number) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
        ctx.stroke(); ctx.setLineDash([]);
      };
      drawLine(observed, '#65bfff', 2, false, true);
      drawLine(counterfactual, '#62efd7', 1.5, true, true);
      drawLine(net, '#d3fff4', 1.2, false, true);

      // End dots
      const last = items[items.length - 1];
      if (last) {
        [
          { value: observed[observed.length - 1], color: '#65bfff' },
          { value: counterfactual[counterfactual.length - 1], color: '#62efd7' },
          { value: net[net.length - 1], color: '#d3fff4' },
        ].forEach(point => {
          ctx.fillStyle = point.color; ctx.shadowColor = point.color; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(x(items.length - 1), y(point.value), 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(4,18,29,0.9)'; ctx.lineWidth = 1.1; ctx.stroke();
        });
      }
      // X labels
      ctx.fillStyle = '#88bec9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      const labelInterval = Math.max(1, Math.floor(items.length / 12));
      const shownYears = new Set<number>();
      items.forEach((d: any, i: number) => {
        if (i % labelInterval === 0 || i === items.length - 1 || (d.year && !shownYears.has(d.year))) {
          if (d.year) shownYears.add(d.year);
          ctx.fillText(d.date_iso ? d.date_iso.slice(2) : '', x(i), pad.t + ph + 16);
          if (d.year && i > 0 && i < items.length - 1 && items[i - 1]?.year !== d.year) {
            ctx.strokeStyle = 'rgba(136,190,201,0.15)'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
            ctx.beginPath(); ctx.moveTo(x(i), pad.t); ctx.lineTo(x(i), pad.t + ph); ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      });
    };

    chartRef.current = { x, y, pad, W, H, items, observed, counterfactual, net, drawBase };
    drawBase();
  }, [data]);

  // Redraw crosshair on hover
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ch = chartRef.current; if (!ch) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ch.drawBase();
    if (!tooltip) return;
    const { cx } = tooltip;
    ctx.save();
    // Crosshair line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx, ch.pad.t); ctx.lineTo(cx, ch.H - ch.pad.b); ctx.stroke();
    ctx.setLineDash([]);
    // Dots on each line
    [
      { vy: tooltip.cyObs, color: '#65bfff' },
      { vy: tooltip.cyCf, color: '#62efd7' },
      { vy: tooltip.cyNet, color: '#d3fff4' },
    ].forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx, pt.vy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(2,8,23,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    });
    ctx.restore();
  }, [tooltip, data]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ch = chartRef.current; if (!ch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    // Find nearest data point
    let bestIx = 0, bestDist = Infinity;
    for (let i = 0; i < ch.items.length; i++) {
      const dist = Math.abs(ch.x(i) - mx);
      if (dist < bestDist) { bestDist = dist; bestIx = i; }
    }
    if (bestDist > 30) { setTooltip(null); return; }
    const item = ch.items[bestIx];
    setTooltip({
      ix: bestIx,
      cx: ch.x(bestIx),
      cyObs: ch.y(ch.observed[bestIx]),
      cyCf: ch.y(ch.counterfactual[bestIx]),
      cyNet: ch.y(ch.net[bestIx]),
      date: item.date_iso || '',
      obs: ch.observed[bestIx],
      cf: ch.counterfactual[bestIx],
      net: ch.net[bestIx],
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div style={{ position: 'relative', display: 'block', minWidth: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', minWidth: '100%', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (() => {
        const ch = chartRef.current!;
        const top = Math.max(8, tooltip.cyObs - 80);
        const left = tooltip.ix > ch.items.length / 2
          ? tooltip.cx - 220
          : tooltip.cx + 18;
        return (
          <div ref={hoverRef} className="absolute z-20 pointer-events-none"
            style={{ top: `${top}px`, left: `${left}px` }}>
            <div style={{
              background: 'rgba(2,8,23,0.94)',
              border: '1px solid rgba(6,182,212,0.5)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              boxShadow: '0 0 20px rgba(6,182,212,0.25)',
              backdropFilter: 'blur(8px)',
              minWidth: 180,
            }}>
              <div style={{ color: '#88bec9', fontSize: 10, marginBottom: 6 }}>{tooltip.date}</div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#65bfff', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#88bec9' }}>实测</span>
                <span style={{ color: '#65bfff', fontWeight: 700, marginLeft: 'auto' }}>{tooltip.obs.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#62efd7', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#88bec9' }}>反事实</span>
                <span style={{ color: '#62efd7', fontWeight: 700, marginLeft: 'auto' }}>{tooltip.cf.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d3fff4', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#88bec9' }}>净减排</span>
                <span style={{ color: '#d3fff4', fontWeight: 700, marginLeft: 'auto' }}>{tooltip.net.toFixed(1)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ============================== City Coords ============================== */
const CITY_COORDS: Record<string, [number, number]> = {
  '北京市': [39.92, 116.42], '天津市': [39.13, 117.20], '石家庄市': [38.04, 114.51],
  '唐山市': [39.63, 118.18], '太原市': [37.87, 112.55], '保定市': [38.87, 115.47],
  '廊坊市': [39.52, 116.70], '邯郸市': [36.63, 114.54], '秦皇岛市': [39.94, 119.60],
  '邢台市': [37.07, 114.50],
};

/* ============================== 3D City Group ============================== */
const CITY_POSITIONS: Record<string, [number, number]> = {
  '北京市': [52, 38], '天津市': [57, 44], '石家庄市': [42, 48],
  '唐山市': [59, 35], '太原市': [33, 50], '保定市': [47, 46],
  '廊坊市': [54, 42], '邯郸市': [40, 57], '秦皇岛市': [62, 28], '邢台市': [44, 54],
};

function City3DGroup({ selectedCity, cityData }: { selectedCity: string; cityData: CityComparison[] }) {
  const [yaw, setYaw] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lastX = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (dragging) return;
    const tick = () => { setYaw(y => y + 0.07); animRef.current = requestAnimationFrame(tick); };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [dragging]);

  const maxNet = Math.max(...cityData.map((d: any) => d.avg_net), 1);

  return (
    <div
      className={`city3d-stage${dragging ? ' dragging' : ''}`}
      onMouseDown={e => { setDragging(true); lastX.current = e.clientX; }}
      onMouseMove={e => { if (dragging) { setYaw(y => y + (e.clientX - lastX.current) * 0.3); lastX.current = e.clientX; } }}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
    >
      <div className="city3d-scene" style={{ transform: `rotateX(55deg) rotateZ(${yaw}deg)` }}>
        <div className="city3d-ground" />
        <div className="city3d-ring c-ring-1" />
        <div className="city3d-ring c-ring-2" />
        {Object.entries(CITY_POSITIONS).map(([city, [cx, cy]]) => {
          const d = cityData.find((x: any) => x.city === city);
          const net = d?.avg_net ?? 0;
          const isSelected = city === selectedCity;
          const beamH = Math.max(15, (net / maxNet) * 80);
          const beamW = isSelected ? 9 : 6;
          return (
            <div key={city} className="city3d-node"
              style={{ '--x': `${cx}%`, '--y': `${cy}%`, '--ly': '50px' } as React.CSSProperties}>
              <span className={`city3d-footprint${isSelected ? ' selected' : ''}`} />
              <span className={`city3d-stem${isSelected ? ' selected' : ''}`} />
              <span className={`city3d-base-pulse${isSelected ? ' selected' : ''}`} />
              <i className={`city3d-beam${isSelected ? ' selected' : ''}`}
                style={{ '--bx': '0px', '--by': '0px', '--bh': `${beamH}px`, '--bw': `${beamW}px`, '--delay': '0s' } as React.CSSProperties} />
              {isSelected && (
                <span className="city3d-label">{city} {net.toFixed(1)}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="city3d-tip">拖拽城市群组可旋转，空闲时自动旋转</div>
    </div>
  );
}

/* ============================== HistoryAnalysis Main ============================== */
const TABS = [
  { id: 'realtime', label: '预警分析' },
  { id: 'analysis', label: '治理分析' },
  { id: 'features', label: '特征因子' },
  { id: 'science', label: '模型科普' },
] as const;

/* ============================== Tencent Map ============================== */
const TMAP_KEY = 'DZOBZ-UHEC3-SCL3O-OREXX-2GRV6-7OBTJ';

function loadTencentMap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).TMap?.Map) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(TMAP_KEY)}`;
    s.async = true;
    s.onload = () => {
      const check = setInterval(() => {
        if ((window as any).TMap?.Map) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error('TMap load timeout')); }, 8000);
    };
    s.onerror = () => reject(new Error('TMap script failed'));
    document.head.appendChild(s);
  });
}

function TencentMap({ comparison }: { comparison: CityComparison[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let map: any;
    loadTencentMap().then(() => {
      const TMap = (window as any).TMap;
      if (!containerRef.current) return;
      map = new TMap.Map(containerRef.current, {
        center: new TMap.LatLng(38.7, 115.0),
        zoom: 7.5,
        rotation: 15,
        pitch: 45,
        viewMode: '3D',
        showControl: false,
      });
      mapRef.current = map;
    }).catch(() => {});
    return () => { if (map && typeof map.destroy === 'function') map.destroy(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || comparison.length === 0) return;
    const TMap = (window as any).TMap;
    if (!TMap) return;

    layersRef.current.forEach(l => { try { l.setMap(null); } catch(e) {} });
    layersRef.current = [];

    const maxNet = Math.max(...comparison.map((c: any) => Math.abs(c.avg_net)), 1);

    comparison.forEach((c: any) => {
      const pos = CITY_COORDS[c.city];
      if (!pos) return;
      const net = c.avg_net;
      const barH = Math.max(20, (Math.abs(net) / maxNet) * 90);
      const barW = 14;
      const color = net >= 0 ? '#10b981' : '#f97316';
      const totalW = 64;
      const totalH = barH + 22;
      const cityName = c.city.replace('市', '');

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">`
        + `<rect x="${(totalW - barW) / 2}" y="${totalH - barH}" width="${barW}" height="${barH}" rx="3" fill="${color}" fill-opacity="0.88" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`
        + `<text x="${totalW / 2}" y="10" text-anchor="middle" fill="${color}" font-size="9" font-weight="bold" font-family="sans-serif">${cityName}</text>`
        + `<text x="${totalW / 2}" y="20" text-anchor="middle" fill="white" font-size="8" font-family="sans-serif">${net >= 0 ? '↓' : '↑+'}${Math.abs(net).toFixed(1)}</text>`
        + `</svg>`;

      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

      try {
        const marker = new TMap.MultiMarker({
          map,
          styles: {
            [c.city]: new TMap.MarkerStyle({
              width: totalW,
              height: totalH,
              src: dataUri,
              anchor: { x: totalW / 2, y: totalH },
            }),
          },
          geometries: [{
            id: c.city,
            styleId: c.city,
            position: new TMap.LatLng(pos[0], pos[1]),
          }],
        });
        layersRef.current.push(marker);
      } catch(e) {
        try {
          const circle = new TMap.MultiCircle({
            map,
            styles: { circle: new TMap.CircleStyle({ color: `${color}66`, showBorder: true, borderColor: '#ffffff66', borderWidth: 2 }) },
            geometries: [{ id: c.city, styleId: 'circle', center: new TMap.LatLng(pos[0], pos[1]), radius: Math.max(5000, (Math.abs(net) / maxNet) * 25000) }],
          });
          layersRef.current.push(circle);
        } catch(e2) {}
      }
    });

    return () => {
      layersRef.current.forEach(l => { try { l.setMap(null); } catch(e) {} });
      layersRef.current = [];
    };
  }, [comparison]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1, borderRadius: '4px' }} />;
}

export function HistoryAnalysis({ selectedCity, onCityChange }: {
  selectedCity: string; onCityChange: (c: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<string>('realtime');
  const [clockText, setClockText] = useState('');
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [comparison, setComparison] = useState<CityComparison[]>([]);
  const [monthly, setMonthly] = useState<MonthlyItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [transfer, setTransfer] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [seasonal, setSeasonal] = useState<any>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [analysisWindowStart, setAnalysisWindowStart] = useState(0);
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingAnalysis = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWindowStart = useRef(0);

  useEffect(() => {
    const tick = () => setClockText(new Date().toLocaleString('zh-CN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      getOverview(), getComparison(), getCityMonthly(selectedCity),
      getAlerts(selectedCity), getTransfer(selectedCity),
    ]).then(([ov, cp, mo, al, tr]) => {
      setOverview(ov); setComparison(cp.items || []);
      setMonthly(mo.items || []); setAlerts(al.items || []); setTransfer(tr);
    });
  }, [selectedCity]);

  useEffect(() => {
    getCityDaily(selectedCity, 2000).then(r => setDaily(r.items || []));
  }, [selectedCity]);

  useEffect(() => {
    const threeYearDaily = latestYearWindow(daily);
    setAnalysisWindowStart(Math.max(0, threeYearDaily.length - DAILY_VIEW_DAYS));
  }, [daily]);

  useEffect(() => {
    getSeasonalStats(selectedCity).then(setSeasonal);
  }, [selectedCity]);

  useEffect(() => {
    getPolicyTimeline().then(r => setPolicies(r.policies || []));
  }, []);

  const refreshAll = () => {
    Promise.all([
      getOverview(), getComparison(), getCityMonthly(selectedCity),
      getAlerts(selectedCity), getTransfer(selectedCity),
    ]).then(([ov, cp, mo, al, tr]) => {
      setOverview(ov); setComparison(cp.items || []);
      setMonthly(mo.items || []); setAlerts(al.items || []); setTransfer(tr);
    });
  };

  const reloadData = async () => {
    try {
      await fetch('/api/admin/reload-data', { method: 'POST' });
      refreshAll();
    } catch { /* ignore */ }
  };

  const startAnalysisDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const maxStart = Math.max(0, latestYearWindow(daily).length - DAILY_VIEW_DAYS);
    if (maxStart <= 0) return;
    isDraggingAnalysis.current = true;
    dragStartX.current = e.clientX;
    dragStartWindowStart.current = analysisWindowStart;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('dragging');
  };

  const moveAnalysisDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingAnalysis.current) return;
    e.preventDefault();
    const threeYearDaily = latestYearWindow(daily);
    const maxStart = Math.max(0, threeYearDaily.length - DAILY_VIEW_DAYS);
    const pixelsPerDay = 6;
    const deltaDays = Math.round((dragStartX.current - e.clientX) / pixelsPerDay);
    setAnalysisWindowStart(clampNumber(dragStartWindowStart.current + deltaDays, 0, maxStart));
  };

  const stopAnalysisDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingAnalysis.current = false;
    e.currentTarget.classList.remove('dragging');
  };

  const selData = comparison.find((d: any) => d.city === selectedCity) || { avg_net: 0, positive_ratio: 0 };
  const bestCityText = overview?.best_city
    ? `${overview.best_city.city?.replace('市','')} ${overview.best_city.avg_net?.toFixed(1)}`
    : '—';

  const isFocus = activeTab !== 'realtime';

  const threeYearDaily = latestYearWindow(daily);
  const maxWindowStart = Math.max(0, threeYearDaily.length - DAILY_VIEW_DAYS);
  const safeWindowStart = clampNumber(analysisWindowStart, 0, maxWindowStart);
  const analysisWindow = threeYearDaily.slice(safeWindowStart, safeWindowStart + DAILY_VIEW_DAYS);
  const peak = analysisWindow.reduce((max: any, d: any) => (d.net_reduction > (max?.net_reduction || 0) ? d : max), analysisWindow[0]);
  const dateRange = analysisWindow.length >= 2
    ? `${analysisWindow[0]?.date_iso?.slice(5)} - ${analysisWindow[analysisWindow.length - 1]?.date_iso?.slice(5)}`
    : '';
  const yearCount = new Set(threeYearDaily.map((d: any) => d.year || Number(String(d.date_iso || '').slice(0, 4))).filter(Boolean)).size;

  const seasonNames: Record<string, string> = { winter: '冬', spring: '春', summer: '夏', autumn: '秋' };
  const heatingNames: Record<string, string> = { heating: '采暖期', non_heating: '非采暖期' };
  const holidayNames: Record<string, string> = { holiday: '节假日', workday: '工作日' };
  const maxNet = Math.max(
    ...Object.values(seasonal?.seasons || {}).map((v: any) => Math.abs(v.avg_net)),
    ...Object.values(seasonal?.heating || {}).map((v: any) => Math.abs(v.avg_net)),
    ...Object.values(seasonal?.holiday || {}).map((v: any) => Math.abs(v.avg_net)),
    1,
  );

  const shouldScrollAlerts = alerts.length > 3;

  return (
    <div className="history-page screen-bg"
      style={{ background: 'radial-gradient(circle at 18% 10%, #184761 0%, #082233 28%, #020d15 72%)' }}>

      <div className="vibe-orb orb-a" />
      <div className="vibe-orb orb-b" />
      <div className="vibe-grid" />

      <div className={`content-reveal${revealed ? ' revealed' : ''}`}>
        <div className={`dashboard-shell${isFocus ? ' dashboard-shell--focus' : ''}`}>

          {/* ====== Header ====== */}
          <header className="panel hud-header frame-corner">
            <div>
              <h1>历史数据分析中心</h1>
              <p>反事实评估 · 迁移衰减识别 · 交互式可视化决策</p>
            </div>
            <div className="header-actions">
              <div className="admin-tools">
                <button className="icon-btn" title="刷新数据" onClick={refreshAll}>⟳</button>
                <button className="icon-btn" title="重载 Excel 数据" onClick={reloadData}>⭮</button>
              </div>
            </div>
          </header>

          {/* ====== Main Grid ====== */}
          <main className={`main-grid${isFocus ? ' main-grid--focus' : ''}`}>

            {/* === Left Column (realtime only) === */}
            {!isFocus && (
              <aside className="column left-column">
                <article className="panel card frame-corner card--kpi">
                  <div className="card-title">核心指标</div>
                  <div className="kpi-grid">
                    {overview && [
                      { label: '平均反事实', value: overview.avg_counterfactual },
                      { label: '平均实测值', value: overview.avg_observed },
                      { label: '平均净减排', value: overview.avg_net },
                    ].map(kpi => (
                      <div key={kpi.label} className="kpi-item">
                        <span>{kpi.label}</span>
                        <strong><CountUp value={kpi.value} decimals={2} /></strong>
                      </div>
                    ))}
                    {overview && (
                      <div className="kpi-item">
                        <span>优效城市</span>
                        <strong>{bestCityText}</strong>
                      </div>
                    )}
                  </div>
                </article>

                <article className="panel card frame-corner card--trend">
                  <div className="card-title">月度趋势（线+柱）</div>
                  <div className="chart-box"><MonthlyTrendCanvas data={monthly} /></div>
                </article>

                <article className="panel card frame-corner card--bar">
                  <div className="card-title">城市净减排柱状图</div>
                  <div className="chart-box"><CityBarCanvas data={comparison} /></div>
                </article>
              </aside>
            )}

            {/* === Center Column === */}
            <section className={`column center-column center-stack${isFocus ? ' center-stack--focus' : ''}`}>

              {/* --- Realtime Tab --- */}
              <article className={`panel center-panel frame-corner stack-panel${activeTab === 'realtime' ? ' is-active' : ''}`}>
                <div className="card-title">京津冀-汾渭平原监测地图</div>
                <div className="map-stage" style={{ position: 'relative', minHeight: '420px' }}>
                  <TencentMap comparison={comparison} />
                  {/* 浮动统计卡片 */}
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: '选中城市净减排', value: selData.avg_net, dec: 2, suf: '' },
                      { label: '正效天数占比', value: selData.positive_ratio * 100, dec: 2, suf: '%' },
                      { label: '异常预警条数', value: alerts.length, dec: 0, suf: '' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: 'rgba(2,8,23,0.88)', border: '1px solid rgba(6,182,212,0.35)', padding: '4px 10px', borderRadius: 4, backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: 9, color: 'rgba(6,182,212,0.6)' }}>{s.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#67e8f9', fontFamily: 'monospace' }}>
                          <CountUp value={s.value} decimals={s.dec} suffix={s.suf} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {/* --- Analysis Tab --- */}
              <article className={`panel center-panel frame-corner stack-panel analysis-panel${activeTab === 'analysis' ? ' is-active' : ''}`}>
                <div className="analysis-header">
                  <div className="card-title">治理分析视图（逐日观测 / 反事实 / 净减排）— 3年数据</div>
                  <div className="analysis-toolbar">
                    <div className="analysis-legend" aria-label="图例">
                      <span className="analysis-legend__item">
                        <i className="analysis-legend__swatch" />
                        <span>逐日观测</span>
                      </span>
                      <span className="analysis-legend__item">
                        <i className="analysis-legend__swatch is-dashed" style={{ '--legend-color': '#62efd7' } as React.CSSProperties} />
                        <span>反事实估计</span>
                      </span>
                      <span className="analysis-legend__item">
                        <i className="analysis-legend__swatch" style={{ '--legend-color': '#d3fff4' } as React.CSSProperties} />
                        <span>净减排</span>
                      </span>
                    </div>
                    <div className="analysis-summary">
                      <span className="analysis-summary__pill">时间窗口：{dateRange}</span>
                      <span className="analysis-summary__pill">峰值净减排：{peak?.net_reduction?.toFixed(1) || '—'} · {peak?.date_iso?.slice(5) || ''}</span>
                      <span className="analysis-summary__pill">样本数：{analysisWindow.length} 天</span>
                      <span className="analysis-summary__pill">数据范围：{threeYearDaily.length} 天 · {yearCount} 年</span>
                    </div>
                  </div>
                </div>
                <div
                  ref={analysisScrollRef}
                  className="analysis-chart-stage"
                  onPointerDown={startAnalysisDrag}
                  onPointerMove={moveAnalysisDrag}
                  onPointerUp={stopAnalysisDrag}
                  onPointerCancel={stopAnalysisDrag}
                  onPointerLeave={stopAnalysisDrag}
                >
                  <div className="chart-box center-large analysis-chart-canvas">
                    <DailyCanvas data={analysisWindow} />
                  </div>
                  <div className="analysis-window-rail" aria-hidden="true">
                    <span style={{
                      width: `${threeYearDaily.length ? (DAILY_VIEW_DAYS / threeYearDaily.length) * 100 : 100}%`,
                      left: `${maxWindowStart ? (safeWindowStart / maxWindowStart) * (100 - (DAILY_VIEW_DAYS / threeYearDaily.length) * 100) : 0}%`,
                    }} />
                  </div>
                  <div className="analysis-scroll-hint">拖动图表左右切换三年内的 240 天窗口</div>
                </div>
              </article>

              {/* --- Features Tab --- */}
              <article className={`panel center-panel frame-corner stack-panel${activeTab === 'features' ? ' is-active' : ''}`}>
                <div className="card-title">特征工程因子详解</div>
                <div className="features-layout">
                  {[
                    {
                      cat: '🌡️ 原始气象特征', color: 'teal', tag: '气象', cards: [
                        { title: '平均/最高/最低温度', formula: 'Tavg/Tmax/Tmin (℃)', desc: '直接来源于气象监测站点，反映大气热力状态。低温抑制边界层提升，加剧污染累积；高温促进光化学反应，加速二次气溶胶生成。' },
                        { title: '相对湿度', formula: 'RH (%)', desc: '高湿环境促进SO₂、NOₓ向硫酸盐、硝酸盐转化，是二次污染的核心催化剂。' },
                        { title: '平均风速', formula: 'Windspd (m/s)', desc: '决定污染物水平平流输送与湍流扩散速率。风速越低，污染物越易在本地累积。' },
                        { title: '地面气压', formula: 'P (hPa)', desc: '高压系统伴随下沉气流，抑制大气垂直扩散；低压系统伴随上升气流，有利于污染物扩散。' },
                        { title: '降水量', formula: 'Precip (mm)', desc: '通过湿沉降清除大气中的颗粒物，是大自然的"清洁器"。' },
                        { title: '日照时长', formula: 'Sunshine (h)', desc: '驱动光化学反应，影响边界层高度发展，利于污染物扩散。' },
                      ],
                    },
                    {
                      cat: '🔬 物理衍生特征', color: 'blue', tag: '核心', highlight: true, cards: [
                        { title: '单日静稳指数', formula: 'SIdaily = (RH + C₁) / (Windspd × (Trange + 1) + C₂)', desc: '量化大气层结稳定程度，指数越大代表"高湿+静风+弱热力湍流"的静稳条件越显著，是识别重污染风险的核心指标。' },
                        { title: '污染累积势能', formula: 'Paccum(t) = Paccum(t-1) × β(Windspd) + 1', desc: '基于欧拉箱式模型，模拟污染物在城市冠层内的动态累积与清除过程，赋予模型对持续性重污染的"记忆能力"。' },
                        { title: '大气净化力', formula: 'CF = Windspd × |Pdiff|', desc: '耦合风速与气压日变幅，量化冷空气入侵时的平流输送通量，反映大气动力净化能力。' },
                        { title: '综合清除潜力', formula: 'CP = Precip × wi + Windspd × wj', desc: '融合湿沉降与干输送两种清除机制，评估大气自然清洁能力的综合水平。' },
                        { title: '边界层高度', formula: 'PBLH ∝ Sunshine × Windspd × (Trange + 1)', desc: '表征大气垂直混合体积，数值越低导致"压缩效应"，污染物易在近地层累积。' },
                      ],
                    },
                    {
                      cat: '📈 差值与变速特征', color: 'amber', tag: '变化', cards: [
                        { title: '温度日较差', formula: 'Trange = Tmax - Tmin (℃)', desc: '反映昼夜辐射强迫变化，数值过小易形成低空逆温层，抑制垂直扩散。' },
                        { title: '气压日变幅', formula: 'Pdiff = Pmax - Pmin (hPa)', desc: '气压剧烈正向跃变通常伴随强冷高压前缘推进，是污染物浓度"断崖式"下降的信号。' },
                        { title: '气温日变幅', formula: 'Tdiff = T(t) - T(t-1) (℃)', desc: '反映气温的日际变化率，差值为负时代表冷平流入侵，能快速改善大气扩散条件。' },
                      ],
                    },
                    {
                      cat: '🏭 人为与时间特征', color: 'rose', tag: '人为', cards: [
                        { title: '采暖期标记', formula: 'Heating (0/1)', desc: '区分采暖期（11月-3月）与非采暖期，精准表征燃煤供暖带来的排放增量。' },
                        { title: '采暖-静稳交互项', formula: 'Heating × SIdaily', desc: '捕捉"高排放+不利扩散"的时空叠加效应，针对北方冬季重污染设计。' },
                        { title: '年周期循环', formula: 'Sin(2π×d/365), Cos(2π×d/365)', desc: '将离散日期转化为连续周期性变量，让模型平滑捕捉季节性偏移。' },
                        { title: '节假日标记', formula: 'Holiday (0/1)', desc: '区分节假日与工作日，捕捉春节、国庆等期间的排放异常波动。' },
                      ],
                    },
                  ].map(f => (
                    <section key={f.cat} className="feature-category">
                      <h3>{f.cat}</h3>
                      <div className="feature-grid">
                        {f.cards.map(card => (
                          <div key={card.title} className={`feature-card${(f as any).highlight ? ' card-highlight' : ''}`}>
                            <span className={`card-accent accent-${(f as any).color}`} />
                            <span className={`card-tag tag-${(f as any).color}`}>{(f as any).tag}</span>
                            <div className={`card-bg-glow glow-${(f as any).color}`} />
                            <div className={`card-shimmer shimmer-${(f as any).color}`} />
                            <h4>{card.title}</h4>
                            <p className="formula">{card.formula}</p>
                            <p className="desc">{card.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* Seasonal analysis */}
                  {seasonal && (
                    <section className="feature-category">
                      <h3><span className="cat-icon">📊</span> 多维度评估指标（{selectedCity}）</h3>
                      <div className="seasonal-layout">
                        {[
                          { title: '季节性对比', data: seasonal.seasons || {}, names: seasonNames, cls: '' },
                          { title: '采暖期 vs 非采暖期', data: seasonal.heating || {}, names: heatingNames, cls: 'heating' },
                          { title: '节假日 vs 工作日', data: seasonal.holiday || {}, names: holidayNames, cls: 'holiday' },
                        ].map(section => (
                          <section key={section.title} className="seasonal-section">
                            <h3>{section.title}</h3>
                            <div className="seasonal-bars">
                              {Object.entries(section.data).map(([k, v]: any) => (
                                <div key={k} className="season-bar">
                                  <span className="season-label">{section.names[k] || k}</span>
                                  <div className="season-bar-track">
                                    <div className={`season-bar-fill${section.cls ? ` ${section.cls}` : ''}${v.avg_net < 0 ? ' negative' : ''}`}
                                      style={{ width: `${(Math.abs(v.avg_net) / maxNet) * 100}%` }} />
                                  </div>
                                  <span className="season-value">{v.avg_net.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </article>

              {/* --- Science Tab --- */}
              <article className={`panel center-panel frame-corner stack-panel${activeTab === 'science' ? ' is-active' : ''}`}>
                <div className="card-title">模型科普视图</div>
                <div className="science-layout">

                  {/* Hero */}
                  <section className="science-hero">
                    <div className="science-hero__content">
                      <div>
                        <div className="science-eyebrow">MODEL INSIGHT / GOVERNANCE LOGIC</div>
                        <h2>把"政策效果评估"拆成可解释、可迁移、可落地的三步链路</h2>
                        <p>先构造"无政策世界"的反事实基线，再计算真实治理带来的净减排，最后通过迁移折扣因子判断其他城市复制经验时会打几折。</p>
                      </div>
                      <div className="science-chip-row">
                        <div className="science-chip">
                          <span>当前城市</span>
                          <strong>{selectedCity}</strong>
                        </div>
                        <div className="science-chip">
                          <span>平均净减排</span>
                          <strong><CountUp value={selData.avg_net} decimals={2} /></strong>
                        </div>
                      </div>
                    </div>
                    <div className="science-hero__flow" aria-label="模型流程">
                      <div className="science-flow-step">
                        <span>01</span>
                        <strong>反事实基线</strong>
                        <p>重建"未治理时"的污染轨迹</p>
                      </div>
                      <div className="science-flow-step">
                        <span>02</span>
                        <strong>净减排识别</strong>
                        <p>量化政策真实带来的改善幅度</p>
                      </div>
                      <div className="science-flow-step">
                        <span>03</span>
                        <strong>迁移衰减修正</strong>
                        <p>判断经验在目标域能保留多少效果</p>
                      </div>
                    </div>
                  </section>

                  {/* 3 Science Cards */}
                  <section className="science-steps">
                    <section className="science-card sc-counter">
                      <div className="science-card__head">
                        <span className="science-card__tag">STEP 01</span>
                        <h3>反事实评估</h3>
                      </div>
                      <p className="science-lead">用 2013-2016 基准期训练模型，生成"无政策"污染基线，作为治理效果识别的参照面。</p>
                      <div className="formula-stack">
                        <p className="formula">净减排 = 反事实预测值 - 实际观测值</p>
                        <p className="formula">源域经验 R(t) = 净减排 / 反事实预测值</p>
                      </div>
                      <div className="science-mini-grid">
                        <div className="science-mini-card"><span>输入</span><strong>基准期气象 + 污染观测</strong></div>
                        <div className="science-mini-card"><span>输出</span><strong>无政策污染基线</strong></div>
                        <div className="science-mini-card"><span>用途</span><strong>识别真实净减排</strong></div>
                      </div>
                      <p className="science-note">核心意义：把"治理后的实际空气质量"与"本该出现的污染水平"拉开对比，避免只看表面下降趋势。</p>
                    </section>

                    <section className="science-card sc-transfer">
                      <div className="science-card__head">
                        <span className="science-card__tag">STEP 02</span>
                        <h3>迁移衰减逻辑</h3>
                      </div>
                      <p className="science-lead">将北京经验迁移到目标域，并用折扣因子 α(t) 校正"水土不服"，刻画策略落地后的真实折损。</p>
                      <div className="formula-stack">
                        <p className="formula">目标域应然减排 = R(t) × α(t) × 反事实基线</p>
                      </div>
                      <div className="science-mini-grid">
                        <div className="science-mini-card"><span>源域经验</span><strong>北京治理收益 R(t)</strong></div>
                        <div className="science-mini-card"><span>校正项</span><strong>折扣因子 α(t)</strong></div>
                        <div className="science-mini-card"><span>判断</span><strong>经验可迁移程度</strong></div>
                      </div>
                      <p className="science-note">α(t) 越低，代表同等政策在目标域发挥越弱，也说明更需要本地化治理组合来补足差异。</p>
                    </section>

                    <section className="science-card science-action sc-action">
                      <div className="science-card__head">
                        <span className="science-card__tag">STEP 03</span>
                        <h3>解读与行动建议</h3>
                      </div>
                      <div className="icon-draw-row" aria-hidden="true">
                        {(() => {
                          const paths = [
                            'M8 50h48M12 50V34l8-6v22M24 50V28l8-8v30M36 50V24l8-6v32M48 50V30l4-3v23 M12 20l10-8 8 5 12-7 10 6',
                            'M15 43c13-1 21-8 25-22 9 9 11 19 5 29-5 8-14 12-24 10-9-2-15-9-15-18 0-8 4-15 9-20 M20 39c7-1 13-5 17-12',
                            'M32 9l20 8v13c0 14-9 22-20 27C21 52 12 44 12 30V17z M23 32l7 7 12-14',
                            'M10 50h44M14 50V34M26 50V28M38 50V22M50 50V30 M12 24h8M24 18h8M36 14h8M48 22h6',
                            'M24 49h16M28 49l-2-7h12l-2 7M32 15c7 0 12 6 12 13 0 5-2 8-5 11-2 2-3 3-3 6h-8c0-3-1-4-3-6-3-3-5-6-5-11 0-7 5-13 12-13z M32 10v-4M18 19l-3-3M46 19l3-3',
                          ];
                          return paths.map((d, i) => (
                            <svg key={i} className="icon-draw" viewBox="0 0 64 64" style={{ '--delay': `${i * 0.16}s` } as React.CSSProperties}>
                              <path d={d} />
                            </svg>
                          ));
                        })()}
                      </div>
                      <div className="action-grid">
                        <div className="action-item"><strong>采暖季预控</strong><p>重点盯住"静稳 + 高湿"天气窗口，提前启用削峰策略。</p></div>
                        <div className="action-item"><strong>本地化修正</strong><p>折扣因子持续偏低时，优先引入本地化治理组合而非简单照搬。</p></div>
                        <div className="action-item"><strong>极端事件追踪</strong><p>将箱线图离群点与预警记录联动，快速锁定极端污染窗口。</p></div>
                      </div>
                    </section>
                  </section>

                  {/* Policy Section */}
                  <section className="science-card science-policy-section">
                    <div className="science-card__head science-card__head--policy">
                      <span className="science-card__tag">POLICY</span>
                      <h3>环保政策背景知识</h3>
                    </div>
                    <div className="policy-overview">
                      <div className="policy-overview__item"><span>政策图谱</span><strong>政策数量：{policies.length} 项</strong></div>
                      <div className="policy-overview__item"><span>时间跨度</span><strong>年份覆盖：2017 - 2024</strong></div>
                      <div className="policy-overview__item"><span>区域聚焦</span><strong>重点区域：京津冀 · 汾渭平原</strong></div>
                    </div>
                    <div className="policy-board">
                      <div className="policy-board__rail" aria-hidden="true">
                        {policies.slice().reverse().map(p => (
                          <span key={p.id} className="policy-board__dot">{p.year}</span>
                        ))}
                      </div>
                      <div className="policies-layout">
                        {policies.slice().reverse().map(p => (
                          <article key={p.id} className="policy-card"
                            tabIndex={0}
                            role="link"
                            onClick={() => p.url && window.open(p.url, '_blank')}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.url && window.open(p.url, '_blank'); } }}>
                            <div className="policy-year">{p.year}</div>
                            <h3>{p.title}</h3>
                            <p>{p.summary}</p>
                            {p.url && <button type="button" className="policy-link" onClick={e => { e.stopPropagation(); window.open(p.url, '_blank'); }}>查看原文 →</button>}
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </article>
            </section>

            {/* === Right Column (realtime only) === */}
            {!isFocus && (
              <aside className="column right-column">
                <article className="panel card frame-corner card--pie">
                  <div className="card-title">城市贡献饼图</div>
                  <div className="chart-box"><PieCanvas data={comparison} /></div>
                </article>

                <article className="panel card frame-corner card--box">
                  <div className="card-title">净减排箱线图（月分布）</div>
                  <div className="chart-box"><BoxPlotCanvas data={monthly} /></div>
                </article>

                <article className="panel card frame-corner card--alerts">
                  <div className="card-title">异常预警记录（循环滚动）</div>
                  <div className={`list-box auto-scroll${shouldScrollAlerts ? ' scrolling' : ''}`}>
                    <div className="scroll-track"
                      style={{ '--scroll-duration': `${Math.max(12, alerts.length * 1.5)}s` } as React.CSSProperties}>
                      {alerts.map((a: any, i: number) => (
                        <div key={`a1-${i}`} className="list-row">
                          <div><strong>{a.date_iso}</strong><span>{a.net_reduction < 0 ? '净减排为负' : '重污染高值'}</span></div>
                          <em className={a.net_reduction < 0 ? 'warn' : ''}>{a.net_reduction?.toFixed(1)}</em>
                        </div>
                      ))}
                      {shouldScrollAlerts && alerts.map((a: any, i: number) => (
                        <div key={`a2-${i}`} className="list-row">
                          <div><strong>{a.date_iso}</strong><span>{a.net_reduction < 0 ? '净减排为负' : '重污染高值'}</span></div>
                          <em className={a.net_reduction < 0 ? 'warn' : ''}>{a.net_reduction?.toFixed(1)}</em>
                        </div>
                      ))}
                    </div>
                    {alerts.length === 0 && <div className="empty">暂无异常记录</div>}
                  </div>
                </article>
              </aside>
            )}
          </main>

          {/* ====== Footer ====== */}
          <footer className="panel hud-footer frame-corner">
            <div className="footer-tabs">
              {TABS.map(t => (
                <button key={t.id}
                  className={activeTab === t.id ? 'active' : ''}
                  onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="footer-left">
              <span>源域：北京市</span>
              <span>迁移城市数：{transfer?.cities?.length || 0}</span>
              <span>更新时间：{clockText}</span>
            </div>
            <div className="hint"></div>
          </footer>

        </div>
      </div>
    </div>
  );
}
