import { pageName, sessionDuration, shortId, timeAgo } from "../format.js";

export function SessionList({ sessions, selectedId, onSelect }) {
  if (sessions.length === 0) {
    return (
      <div className="journey-empty">
        No sessions yet — open the demo store and click around.
      </div>
    );
  }
  return (
    <div>
      {sessions.map((session, index) => {
        // API sends chronological encounters; dedupe here keeps visit order.
        const route = [...new Set((session.pages ?? []).map(pageName))];
        return (
          <button
            key={session.sessionId}
            className={session.sessionId === selectedId ? "ticket selected" : "ticket"}
            onClick={() => onSelect(session.sessionId)}
          >
            <span className="stub num">{String(index + 1).padStart(2, "0")}</span>
            <span className="perf" />
            <span className="detail">
              <span className="id mono" title={session.sessionId}>{shortId(session.sessionId)}</span>
              <span className="meta num" style={{ display: "block" }}>
                {session.totalEvents} events · {sessionDuration(session.firstSeen, session.lastSeen)} · {timeAgo(session.lastSeen)}
              </span>
              {route.length > 0 && (
                <span className="route">
                  {route.map((name, i) => (
                    <span key={`${name}-${i}`} style={{ display: "contents" }}>
                      {i > 0 && <span className="arrow">→</span>}
                      <span className={i === route.length - 1 ? "stop last" : "stop"}>{name}</span>
                    </span>
                  ))}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
