import { useMemo, useState } from "react";
import { hourTick } from "../format.js";

const W = 760;
const H = 240;
const PAD = { left: 38, right: 10, top: 12, bottom: 24 };

export function ActivityChart({ buckets, hours }) {
  const [hover, setHover] = useState(null);

  const series = useMemo(() => {
    // Buckets come from Mongo $dateTrunc, which cuts on UTC hours. Snapping to
    // a local hour boundary makes every lookup miss on any non-UTC browser, so
    // the axis is aligned in UTC and only the tick labels render in local time.
    const start = new Date();
    start.setUTCMinutes(0, 0, 0);
    const points = [];
    const byHour = new Map(buckets.map((b) => [new Date(b.hour).getTime(), b]));
    for (let i = hours - 1; i >= 0; i--) {
      const at = new Date(start.getTime() - i * 3600_000);
      const found = byHour.get(at.getTime());
      points.push({ at: at.toISOString(), pageViews: found?.pageViews ?? 0, clicks: found?.clicks ?? 0 });
    }
    return points;
  }, [buckets, hours]);

  // Rounded gridlines: raw fractions of a small max round to duplicates
  // like 1, 1, 1 — so snap the axis up to a multiple of a whole step.
  const peak = Math.max(1, ...series.map((p) => p.pageViews + p.clicks));
  const step = Math.max(1, Math.ceil(peak / 4));
  const yMax = step * 4;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (series.length <= 1 ? 0 : (i / (series.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - (v / yMax) * innerH;

  const areaPath = (pick) => {
    if (series.length === 0) return "";
    let top = `M ${x(0)} ${y(pick(series[0]))}`;
    for (let i = 1; i < series.length; i++) top += ` L ${x(i)} ${y(pick(series[i]))}`;
    return `${top} L ${x(series.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  };

  const stacked = (p) => p.pageViews + p.clicks;
  const viewsPath = areaPath((p) => p.pageViews);
  const stackedPath = areaPath(stacked);
  const stackedLine = stackedPath.split(" L ").slice(0, series.length).join(" L ");
  const ticks = [step, step * 2, step * 3, step * 4];
  const tickEvery = Math.max(1, Math.ceil(series.length / 6));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const inner = (ratio * W - PAD.left) / innerW;
    const index = Math.round(inner * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, index)));
  };

  const hovered = hover !== null ? series[hover] : null;

  return (
    <div className="chart-body">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Events per hour">
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e7c4a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0e7c4a" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2480c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e2480c" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="rgba(26,20,8,0.12)" />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="#57503f" className="num">
              {tick}
            </text>
          </g>
        ))}
        <path d={viewsPath} fill="url(#viewsFill)" />
        <path d={stackedPath} fill="url(#clicksFill)" />
        <path d={stackedLine} fill="none" stroke="#e2480c" strokeWidth="2" strokeLinejoin="round" />
        {series.map((p, i) =>
          i % tickEvery === 0 ? (
            <text key={p.at} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#57503f">
              {hourTick(p.at)}
            </text>
          ) : null
        )}
        {hovered && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(26,20,8,0.35)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(hovered.pageViews + hovered.clicks)} r="4" fill="#e2480c" stroke="#fffdf6" strokeWidth="2" />
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hovered && (
        <div className="chart-tip num" style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}>
          {hourTick(hovered.at)} · {hovered.pageViews} views · {hovered.clicks} clicks
        </div>
      )}
    </div>
  );
}
