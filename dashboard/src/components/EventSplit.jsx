export function EventSplit({ pageViews, clicks }) {
  const total = pageViews + clicks;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const clickShare = total === 0 ? 0 : clicks / total;
  const clickArc = clickShare * circumference;

  return (
    <div className="donut-wrap">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Event type split">
        <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(14,124,74,0.22)" strokeWidth="16" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="#e2480c"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${clickArc} ${circumference}`}
          transform="rotate(-90 75 75)"
        />
        <text x="75" y="72" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1a1408" className="num">
          {total}
        </text>
        <text x="75" y="90" textAnchor="middle" fontSize="11" fill="#57503f">
          events
        </text>
      </svg>
      <div className="donut-legend">
        <div className="row">
          <span className="swatch" style={{ background: "#0e7c4a" }} /> Page views <b className="num">{pageViews}</b>
        </div>
        <div className="row">
          <span className="swatch" style={{ background: "#e2480c" }} /> Clicks <b className="num">{clicks}</b>
        </div>
        <div className="row">
          Click-through <b className="num">{pageViews === 0 ? "—" : `${Math.round((clicks / pageViews) * 100)}%`}</b>
        </div>
      </div>
    </div>
  );
}
