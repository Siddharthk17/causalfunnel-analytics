import { formatTime, gapLabel } from "../format.js";

export function SessionDetail({ sessionId, events, loading }) {
  if (loading) return <div className="journey-empty">Loading journey…</div>;
  if (!sessionId) {
    return <div className="journey-empty">Select a session on the left to replay its journey.</div>;
  }
  return (
    <div className="journey">
      {events.map((event, index) => (
        <div key={event._id || index} className={`event ${event.type}`}>
          <div className="marker">{event.type === "click" ? "◉" : "○"}</div>
          <div className="body">
            <div className="kind">{event.type === "click" ? "click" : "page view"} · {gapLabel(events[index - 1]?.timestamp, event.timestamp)}</div>
            <div className="url mono">{event.pageUrl}</div>
            <div className="detail">
              {formatTime(event.timestamp)}
              {event.type === "click" && (event.x !== undefined || event.xNorm !== undefined) &&
                ` · at ${event.x ?? "?"}px, ${event.y ?? "?"}px` +
                (event.targetLabel ? ` on “${event.targetLabel}”` : "")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
