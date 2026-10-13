import { useCallback, useEffect, useState } from "react";
import { fetchSession, fetchSessions } from "./api.js";
import { Overview } from "./components/Overview.jsx";
import { SessionList } from "./components/SessionList.jsx";
import { SessionDetail } from "./components/SessionDetail.jsx";
import { Heatmap } from "./components/Heatmap.jsx";
import "./styles.css";

const TABS = [
  { id: "overview", index: "01", label: "Overview" },
  { id: "sessions", index: "02", label: "Sessions" },
  { id: "heatmap", index: "03", label: "Heatmap" },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [journey, setJourney] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiUp, setApiUp] = useState(true);
  const now = useClock();

  const loadSessions = useCallback(() => {
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
    loadSessions();
    const timer = setInterval(loadSessions, 10000);
    return () => clearInterval(timer);
  }, [loadSessions]);

  const selectSession = (sessionId) => {
    setSelectedId(sessionId);
    setJourneyLoading(true);
    fetchSession(sessionId)
      .then((data) => setJourney(data.events))
      .catch((err) => setError(err.message))
      .finally(() => setJourneyLoading(false));
  };

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-rule">
          <div className="masthead-row">
            <div className="wordmark">
              Causal<em>Funnel</em>
            </div>
            <div className={apiUp ? "edition" : "edition down"}>
              <div className="live num">{apiUp ? "LIVE" : "OFFLINE"}</div>
              <div className="num">
                {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                {now.toLocaleTimeString(undefined, { hour12: false })}
              </div>
            </div>
          </div>
        </div>
        <nav className="index-tabs">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              className={tab === entry.id ? "active" : ""}
              onClick={() => setTab(entry.id)}
            >
              <span className="n">{entry.index}</span>
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {error && <div className="error">{error}</div>}
        {tab === "overview" && <Overview />}
        {tab === "sessions" && (
          <>
            <div className="section-head">
              <h1>
                Every visit, <span className="accent">replayed.</span>
              </h1>
              <p>Pick a ticket to walk the exact path a visitor took — newest first.</p>
            </div>
            <section className="card">
              <div className="ledger">
                <SessionList sessions={sessions} selectedId={selectedId} onSelect={selectSession} />
              </div>
              <SessionDetail sessionId={selectedId} events={journey} loading={journeyLoading} />
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                <span className="num">
                  Page {page} · {totalSessions} sessions
                </span>
                <button disabled={sessions.length < 20} onClick={() => setPage((p) => p + 1)}>
                  Next →
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "heatmap" && (
          <>
            <div className="section-head">
              <h1>
                Where fingers <span className="accent">land.</span>
              </h1>
              <p>Rings bloom in click order — watch the sequence, not just the pile.</p>
            </div>
            <section className="card">
              <Heatmap />
            </section>
          </>
        )}
      </main>

      <footer className="colophon">
        <span>CAUSALFUNNEL FIELD EDITION · VOL. 01</span>
        <span className="num">
          {totalSessions} SESSIONS ON RECORD
        </span>
      </footer>
    </div>
  );
}
