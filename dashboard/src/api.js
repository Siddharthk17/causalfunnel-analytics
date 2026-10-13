const CONFIGURED = import.meta.env.VITE_API_URL;
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(window.location.hostname);

// Falling back to localhost in a hosted build produces a dashboard that looks
// fine but silently talks to the visitor's own machine, so it is treated as a
// configuration error instead.
export const API_BASE = (CONFIGURED || (LOCAL ? "http://localhost:4000" : "")).replace(/\/$/, "");
export const API_MISCONFIGURED = API_BASE === "";

async function request(path) {
  if (API_MISCONFIGURED) {
    throw new Error("VITE_API_URL is not set — this build has no API to talk to");
  }
  const res = await fetch(API_BASE + path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed: ${res.status}`);
  }
  return res.json();
}

export const fetchStats = () => request("/api/stats");
export const fetchSessions = (page = 1, limit = 20) => request(`/api/sessions?page=${page}&limit=${limit}`);
export const fetchSession = (sessionId) => request(`/api/sessions/${encodeURIComponent(sessionId)}`);
export const fetchPages = () => request("/api/pages");
export const fetchHeatmap = (pageUrl) => request(`/api/heatmaps?url=${encodeURIComponent(pageUrl)}`);
export const fetchTimeline = (hours = 24) => request(`/api/stats/timeline?hours=${hours}`);
export const fetchRecent = (limit = 30) => request(`/api/events/recent?limit=${limit}`);
