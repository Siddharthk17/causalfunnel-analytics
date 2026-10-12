export function shortId(sessionId) {
  return sessionId.length > 18 ? sessionId.slice(0, 8) + "…" + sessionId.slice(-4) : sessionId;
}

export function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString();
}

export function gapLabel(previousIso, currentIso) {
  if (!previousIso) return "session start";
  const seconds = Math.max(0, Math.round((new Date(currentIso) - new Date(previousIso)) / 1000));
  if (seconds < 1) return "same moment";
  if (seconds < 60) return `+${seconds}s later`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `+${minutes}m ${seconds % 60}s later`;
  return `+${Math.floor(minutes / 60)}h ${minutes % 60}m later`;
}

export function dotPosition(click) {
  // Prefer viewport-normalized coords; fall back to raw pixels on a 1280×800 grid.
  const left = click.xNorm !== undefined ? (click.xNorm / 1000) * 100 : ((click.x ?? 0) / 1280) * 100;
  const top = click.yNorm !== undefined ? (click.yNorm / 1000) * 100 : ((click.y ?? 0) / 800) * 100;
  return { left: Math.min(100, Math.max(0, left)), top: Math.min(100, Math.max(0, top)) };
}
