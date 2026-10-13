import { useEffect, useState } from "react";
import { fetchPages, fetchRecent, fetchStats, fetchTimeline } from "../api.js";
import { ActivityChart } from "./ActivityChart.jsx";
import { EventSplit } from "./EventSplit.jsx";
import { clockTime, pageName, shortId } from "../format.js";

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

function describeEvent(event) {
  const page = pageName(event.pageUrl);
  if (event.type === "click") {
    return (
      <>
        <b>{shortId(event.sessionId)}</b> clicked{event.targetLabel ? <> “{event.targetLabel}”</> : null} on {page}
      </>
    );
  }
  return (
    <>
      <b>{shortId(event.sessionId)}</b> opened {page}
    </>
  );
}

export function Overview() {
  const [range, setRange] = useState(RANGES[0]);
  const [stats, setStats] = useState(null);
  const [pages, setPages] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [wire, setWire] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([fetchStats(), fetchPages(), fetchTimeline(range.hours)])
      .then(([overview, pageList, timeline]) => {
        setStats(overview);
        setPages(pageList.pages);
        setBuckets(timeline.buckets);
      })
      .catch((err) => setError(err.message));
  }, [range]);

  useEffect(() => {
    let alive = true;
    const pull = () => fetchRecent(14).then((data) => alive && setWire(data.events)).catch(() => {});
    pull();
    const timer = setInterval(pull, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const maxClicks = Math.max(1, ...pages.map((p) => p.clicks));
  const perSession = (total) =>
    stats && stats.totalSessions > 0 ? `${(total / stats.totalSessions).toFixed(1)} / session` : "no sessions yet";

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="section-head">
        <h1>
          The shop floor, <span className="accent">at a glance.</span>
        </h1>
        <p>Every heartbeat from the demo store, set in type while it happens.</p>
      </div>

      <section className="headline-stats">
        <div className="headline-stat">
          <div className="k">Sessions</div>
          <div className="v num">{stats?.totalSessions ?? "—"}</div>
          <div className="s">unique visitors tracked</div>
        </div>
        <div className="headline-stat">
          <div className="k">Events</div>
          <div className="v num">{stats?.totalEvents ?? "—"}</div>
          <div className="s">{stats ? perSession(stats.totalEvents) : ""}</div>
        </div>
        <div className="headline-stat">
          <div className="k">Page views</div>
          <div className="v num">{stats?.totalPageViews ?? "—"}</div>
          <div className="s">{stats ? perSession(stats.totalPageViews) : ""}</div>
        </div>
        <div className="headline-stat">
          <div className="k">Clicks</div>
          <div className="v signal num">{stats?.totalClicks ?? "—"}</div>
          <div className="s">{stats ? perSession(stats.totalClicks) : ""}</div>
        </div>
      </section>

      <div className="deck">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="kicker">Fig. 01 — Traffic</span>
              <h2>Activity</h2>
              <p>Views and clicks per hour</p>
            </div>
            <div className="range-toggle">
              {RANGES.map((option) => (
                <button
                  key={option.label}
                  className={option.label === range.label ? "active" : ""}
                  onClick={() => setRange(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <ActivityChart buckets={buckets} hours={range.hours} />
          <div className="card-head">
            <div>
              <span className="kicker">Fig. 02 — The wire</span>
              <h2>Live events</h2>
            </div>
          </div>
          <div className="wire">
            {wire.length === 0 && <div className="journey-empty">The wire is quiet — open the demo store.</div>}
            {wire.map((event) => (
              <div key={event._id} className="wire-item">
                <span className={event.type === "click" ? "stamp click" : "stamp view"}>
                  {event.type === "click" ? "CLICK" : "VIEW"}
                </span>
                <span className="what">{describeEvent(event)}</span>
                <time className="num">{clockTime(event.timestamp)}</time>
              </div>
            ))}
          </div>
        </section>

        <div>
          <section className="card">
            <div className="card-head">
              <div>
                <span className="kicker">Fig. 03 — Split</span>
                <h2>Event split</h2>
              </div>
            </div>
            <EventSplit pageViews={stats?.totalPageViews ?? 0} clicks={stats?.totalClicks ?? 0} />
          </section>
          <section className="card">
            <div className="card-head">
              <div>
                <span className="kicker">Fig. 04 — Standings</span>
                <h2>Top pages</h2>
                <p>Ranked by click volume</p>
              </div>
            </div>
            <div className="page-table">
              {pages.map((page, i) => (
                <div key={page.pageUrl} className="page-row" title={page.pageUrl}>
                  <span className="rank num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="url mono">{pageName(page.pageUrl)}</span>
                  <span className="stat"><b className="num">{page.clicks}</b> clicks</span>
                  <span className="stat"><b className="num">{page.sessions}</b> sess</span>
                  <span className="stat"><b className="num">{page.totalEvents}</b> evts</span>
                  <span className="bar"><i style={{ width: `${Math.round((page.clicks / maxClicks) * 100)}%` }} /></span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
