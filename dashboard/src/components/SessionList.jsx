import { shortId } from "../format.js";

export function SessionList({ sessions, selectedId, onSelect }) {
  if (sessions.length === 0) {
    return (
      <div className="journey-empty">
        No sessions yet. Open <span className="mono">/demo/</span> in another tab,
        click around the store, then refresh this list.
      </div>
    );
  }
  return (
    <div>
      {sessions.map((session) => (
        <button
          key={session.sessionId}
          className={session.sessionId === selectedId ? "session-row selected" : "session-row"}
          onClick={() => onSelect(session.sessionId)}
        >
          <div className="id mono" title={session.sessionId}>{shortId(session.sessionId)}</div>
          <div className="meta">
            {session.totalEvents} events · {session.pageViews} views · {session.clicks} clicks
            <span className="badge">{session.pageCount} pages</span>
          </div>
          <div className="meta">last seen {new Date(session.lastSeen).toLocaleString()}</div>
        </button>
      ))}
    </div>
  );
}
