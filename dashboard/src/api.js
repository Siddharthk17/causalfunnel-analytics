const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path) {
  const res = await fetch(BASE + path);
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
