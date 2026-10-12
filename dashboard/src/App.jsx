import { useCallback, useEffect, useState } from "react";
import { fetchSession, fetchSessions, fetchStats } from "./api.js";
import { SessionList } from "./components/SessionList.jsx";
import { SessionDetail } from "./components/SessionDetail.jsx";
import { Heatmap } from "./components/Heatmap.jsx";
import "./styles.css";

export default function App() {
  const [tab, setTab] = useState("sessions");
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [journey, setJourney] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiUp, setApiUp] = useState(true);

  const loadOverview = useCallback(() => {
    fetchStats().then(setStats).catch(() => setApiUp(false));
    fetchSessions(page)
      .then((data) => {
        setSessions(data.sessions);
        setTotalSessions(data.totalSessions);
        setApiUp(true);
      })
      .catch((err) => {
        setError(err.message);
        setApiUp(false);
      });
  }, [page]);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(loadOverview, 10000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  const selectSession = (sessionId) => {
    setSelectedId(sessionId);
    setJourneyLoading(true);
    fetchSession(sessionId)
      .then((data) => setJourney(data.events))
      .catch((err) => setError(err.message))
      .finally(() => setJourneyLoading(false));
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">Causal<span>Funnel</span> Analytics</div>
        <div className={apiUp ? "status" : "status down"}>
          <span className="dot" />{apiUp ? "api connected" : "api unreachable — is :4000 running?"}
        </div>
      </header>
      <main className="layout">
        {error && <div className="error">{error}</div>}
        <section className="stats">
          <div className="stat"><div className="label">Sessions</div><div className="value">{stats?.totalSessions ?? "—"}</div></div>
          <div className="stat"><div className="label">Events</div><div className="value">{stats?.totalEvents ?? "—"}</div></div>
          <div className="stat"><div className="label">Page views</div><div className="value">{stats?.totalPageViews ?? "—"}</div></div>
          <div className="stat"><div className="label">Clicks</div><div className="value">{stats?.totalClicks ?? "—"}</div></div>
        </section>
        <nav className="tabs">
          <button className={tab === "sessions" ? "active" : ""} onClick={() => setTab("sessions")}>Sessions</button>
          <button className={tab === "heatmap" ? "active" : ""} onClick={() => setTab("heatmap")}>Heatmap</button>
        </nav>
        <section className="panel">
          {tab === "sessions" ? (
            <>
              <div className="panel-head">
                <div><h2>Sessions</h2><p>Newest first · auto-refreshes every 10s</p></div>
                <button onClick={loadOverview} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 7, padding: "6px 12px", cursor: "pointer" }}>Refresh</button>
              </div>
              <div className="split">
                <div className="sessions">
                  <SessionList sessions={sessions} selectedId={selectedId} onSelect={selectSession} />
                </div>
                <SessionDetail sessionId={selectedId} events={journey} loading={journeyLoading} />
              </div>
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                <span>Page {page} · {totalSessions} sessions</span>
                <button disabled={sessions.length < 20} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            </>
          ) : (
            <>
              <div className="panel-head"><div><h2>Click heatmap</h2><p>Where visitors actually click on each page</p></div></div>
              <Heatmap />
            </>
          )}
        </section>
      </main>
    </>
  );
}
