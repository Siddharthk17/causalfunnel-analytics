import { useEffect, useState } from "react";
import { fetchHeatmap, fetchPages } from "../api.js";
import { dotPosition } from "../format.js";

export function Heatmap() {
  const [pages, setPages] = useState([]);
  const [activeUrl, setActiveUrl] = useState("");
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-controls">
        <select value={activeUrl} onChange={(e) => setActiveUrl(e.target.value)} aria-label="Page URL">
          {pages.map((page) => (
            <option key={page.pageUrl} value={page.pageUrl}>
              {page.pageUrl} ({page.clicks} clicks)
            </option>
          ))}
        </select>
        {loading && <span className="hint">Loading clicks…</span>}
      </div>
      {error && <div className="error">{error}</div>}
      {pages.length === 0 && !error ? (
        <div className="journey-empty">No page data yet — generate traffic from <span className="mono">/demo/</span> first.</div>
      ) : (
        <>
          <div className="canvas">
            <div className="frame-bar"><span>● ● ●</span><span className="mono">{activeUrl}</span></div>
            {clicks.map((click, index) => {
              const { left, top } = dotPosition(click);
              return (
                <span
                  key={index}
                  className="dot"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={`${click.x ?? "?"}px, ${click.y ?? "?"}px · ${new Date(click.timestamp).toLocaleString()}`}
                />
              );
            })}
          </div>
          <p className="hint">
            {clicks.length} clicks plotted. Positions use normalized viewport coords so dots line up
            across screen sizes; hover any dot for its raw pixel position and time.
          </p>
        </>
      )}
    </div>
  );
}
