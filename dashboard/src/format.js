export function shortId(sessionId) {
  return sessionId.length > 18 ? sessionId.slice(0, 8) + "…" + sessionId.slice(-4) : sessionId;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString();
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

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function sessionDuration(firstIso, lastIso) {
  const seconds = Math.max(0, Math.round((new Date(lastIso) - new Date(firstIso)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function sessionHue(sessionId) {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function pageName(pageUrl) {
  try {
    const path = new URL(pageUrl).pathname.replace(/\/+$/, "");
    const last = path.split("/").pop();
    return last || "home";
  } catch {
    return pageUrl;
  }
}

export function hourTick(iso) {
  return new Date(iso).toLocaleString(undefined, { hour: "numeric" });
}

export function clockTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

export function dotPosition(click) {
  // Prefer viewport-normalized coords; fall back to raw pixels on a 1280×800 grid.
  const left = click.xNorm !== undefined ? (click.xNorm / 1000) * 100 : ((click.x ?? 0) / 1280) * 100;
  const top = click.yNorm !== undefined ? (click.yNorm / 1000) * 100 : ((click.y ?? 0) / 800) * 100;
  return { left: Math.min(100, Math.max(0, left)), top: Math.min(100, Math.max(0, top)) };
}
