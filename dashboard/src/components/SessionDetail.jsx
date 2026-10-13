import { clockTime, formatTime, gapLabel, pageName } from "../format.js";

export function SessionDetail({ sessionId, events, loading }) {
  if (loading) return <div className="journey-empty">Pulling the record…</div>;
  if (!sessionId) {
    return <div className="journey-empty">Punch a ticket above to read its journey.</div>;
  }
  return (
    <div className="journey">
      {events.map((event, index) => (
        <div key={event._id || index} className={`entry ${event.type}`}>
          <div className="when num">{clockTime(event.timestamp)}</div>
          <div className="rail">
            <div className="dot" />
          </div>
          <div className="body">
            <div className="kind">
              {event.type === "click" ? "click" : "page view"}
              <span className="gap">{gapLabel(events[index - 1]?.timestamp, event.timestamp)}</span>
            </div>
            <div className="url mono">{pageName(event.pageUrl)}</div>
            <div className="detail" title={formatTime(event.timestamp)}>
              {event.type === "click" && (event.x !== undefined || event.xNorm !== undefined) &&
                `${event.x ?? "?"}px, ${event.y ?? "?"}px` +
                (event.targetLabel ? ` · “${event.targetLabel}”` : "")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
