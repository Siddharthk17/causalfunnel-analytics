import { useEffect, useRef, useState } from "react";
import { fetchHeatmap, fetchPages } from "../api.js";
import { dotPosition } from "../format.js";

const FRAME_W = 960;
const FRAME_H = 540;
const HEAT_W = 240;
const HEAT_H = 135;

function paintBlobs(canvas, clicks) {
  const heat = document.createElement("canvas");
  heat.width = HEAT_W;
  heat.height = HEAT_H;
  const ctx = heat.getContext("2d");
  ctx.clearRect(0, 0, HEAT_W, HEAT_H);
  ctx.globalCompositeOperation = "lighter";
  for (const click of clicks) {
    const { left, top } = dotPosition(click);
    const cx = (left / 100) * HEAT_W;
    const cy = (top / 100) * HEAT_H;
    const radius = 15;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, "rgba(226,72,12,0.6)");
    glow.addColorStop(0.55, "rgba(226,72,12,0.22)");
    glow.addColorStop(1, "rgba(226,72,12,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const frame = canvas.getContext("2d");
  const scale = window.devicePixelRatio || 1;
  canvas.width = FRAME_W * scale;
  canvas.height = FRAME_H * scale;
  frame.scale(scale, scale);
  frame.fillStyle = "#fbf8ef";
  frame.fillRect(0, 0, FRAME_W, FRAME_H);

  // Draft wireframe so clusters read as header, hero, cards.
  frame.strokeStyle = "rgba(26,20,8,0.28)";
  frame.lineWidth = 1.5;
  frame.strokeRect(60, 70, 840, 120);
  for (let i = 0; i < 3; i++) frame.strokeRect(60 + i * 290, 220, 260, 200);
  frame.beginPath();
  frame.moveTo(60, 440);
  frame.lineTo(900, 440);
  frame.stroke();
  frame.fillStyle = "rgba(26,20,8,0.4)";
  frame.font = "600 13px 'IBM Plex Mono', monospace";
  frame.fillText("HEADER", 70, 60);
  frame.fillText("HERO", 70, 210);
  frame.fillText("GRID", 70, 470);

  frame.imageSmoothingEnabled = true;
  frame.drawImage(heat, 0, 0, FRAME_W, FRAME_H);
}

export function Heatmap() {
  const [pages, setPages] = useState([]);
  const [activeUrl, setActiveUrl] = useState("");
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchPages()
      .then((data) => {
        setPages(data.pages);
        if (data.pages.length > 0) setActiveUrl(data.pages[0].pageUrl);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!activeUrl) return;
    setLoading(true);
    setError("");
    fetchHeatmap(activeUrl)
      .then((data) => setClicks(data.clicks))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeUrl]);

  useEffect(() => {
    if (canvasRef.current) paintBlobs(canvasRef.current, clicks);
  }, [clicks]);

  // Oldest first so rings bloom in the order the visitor clicked.
  const ripples = [...clicks].reverse().slice(0, 24);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-controls">
        <select id="heatmap-page" value={activeUrl} onChange={(e) => setActiveUrl(e.target.value)} aria-label="Page URL">
          {pages.map((page) => (
            <option key={page.pageUrl} value={page.pageUrl}>
              {page.pageUrl} ({page.clicks} clicks)
            </option>
          ))}
        </select>
        {loading && <span className="hint">Developing plate…</span>}
      </div>
      {error && <div className="error">{error}</div>}
      {pages.length === 0 && !error ? (
        <div className="journey-empty">No plates exposed yet — generate traffic from the demo store.</div>
      ) : (
        <>
          <div className="blueprint">
            <div className="blueprint-bar">
              <span className="mono">PLATE Nº 01 — {activeUrl}</span>
            </div>
            <div className="plot">
              <canvas ref={canvasRef} className="heatmap" style={{ aspectRatio: "16 / 9" }} />
              {ripples.map((click, i) => {
                const { left, top } = dotPosition(click);
                return (
                  <span
                    key={`${click.timestamp}-${i}`}
                    className="ripple"
                    style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.35}s` }}
                    title={`${click.x ?? "?"}px, ${click.y ?? "?"}px · ${new Date(click.timestamp).toLocaleString()}`}
                  />
                );
              })}
              {clicks.map((click, i) => {
                const { left, top } = dotPosition(click);
                return (
                  <span
                    key={`pin-${click.timestamp}-${i}`}
                    className="pin"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  />
                );
              })}
            </div>
          </div>
          <div className="heatmap-meta">
            <span className="hint">{clicks.length} strikes · rings bloom in click order · hover a ring for coordinates</span>
            <span className="heat-legend">faint <span className="heat-gradient" /> intense</span>
          </div>
        </>
      )}
    </div>
  );
}
