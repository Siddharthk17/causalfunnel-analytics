/* CausalFunnel tracker v1.0.0 — dependency-free, <2kb gz intent.
   Usage: <script src="https://api.you.com/tracker.js" data-api="https://api.you.com" defer></script>
   Why an IIFE with no globals except window.causalfunnel: host pages must never
   break because analytics failed, and must never collide with host code. */
(function () {
  "use strict";

  var script = document.currentScript;
  var CONFIGURED = (script && script.getAttribute("data-api")) || window.__CF_API__;
  // Prefer the page's own origin: the demo store is served by the API itself,
  // so same-origin is correct on any host and needs no configuration. The
  // localhost fallback only applies to file:// pages, where origin is "null".
  var API_BASE = CONFIGURED || (window.location.origin !== "null" ? window.location.origin : "http://localhost:4000");
  var ENDPOINT = API_BASE.replace(/\/$/, "") + "/api/events";
  var SESSION_KEY = "cf_session_id";
  var FLUSH_DELAY_MS = 300;

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function readSession() {
    try {
      var existing = window.localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
    } catch (_e) {
      /* localStorage blocked (private mode) — fall through to cookie */
    }
    var match = document.cookie.match(/(?:^|;\s*)cf_session_id=([^;]*)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    return null;
  }

  function storeSession(id) {
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch (_e) {
      /* ignore — cookie below is the fallback */
    }
    try {
      var expiry = new Date(Date.now() + 180 * 864e5).toUTCString();
      document.cookie = "cf_session_id=" + encodeURIComponent(id) + "; path=/; max-age=15552000; expires=" + expiry + "; SameSite=Lax";
    } catch (_e2) {
      /* cookies blocked — session simply won't persist, events still send */
    }
  }

  var sessionId = readSession();
  if (!sessionId) {
    sessionId = uuid();
    storeSession(sessionId);
  }

  var queue = [];
  var flushTimer = null;

  function postNow(payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "omit",
      }).catch(function () {});
    } catch (_e) {
      /* tracker must never throw into the host page */
    }
  }

  function flush() {
    flushTimer = null;
    if (queue.length === 0) return;
    var batch = queue.splice(0, queue.length);
    for (var i = 0; i < batch.length; i++) postNow(batch[i]);
  }

  function enqueue(event) {
    queue.push(event);
    if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  }

  function baseEvent(type) {
    return {
      sessionId: sessionId,
      type: type,
      pageUrl: window.location.href,
      timestamp: new Date().toISOString(),
    };
  }

  function trackPageView() {
    enqueue(baseEvent("page_view"));
  }

  function trackClick(e) {
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var event = baseEvent("click");
    event.x = Math.round(e.clientX);
    event.y = Math.round(e.clientY);
    event.viewportW = vw;
    event.viewportH = vh;
    // Normalized 0–1000 scale so clicks line up on the heatmap even when
    // reviewer screens differ from the visitor's. Raw pixels kept for audit.
    if (vw > 0) event.xNorm = Math.round((e.clientX / vw) * 1000);
    if (vh > 0) event.yNorm = Math.round((e.clientY / vh) * 1000);
    var t = e.target;
    if (t && t.getAttribute) {
      var label = t.getAttribute("aria-label") || t.innerText || t.value || t.tagName;
      if (label) event.targetLabel = String(label).slice(0, 120);
    }
    enqueue(event);
  }

  // page_view fires once per load. SPA hosts can call window.causalfunnel.page()
  // after each route change — polling history would add weight for no benefit here.
  if (document.readyState === "complete") trackPageView();
  else window.addEventListener("DOMContentLoaded", trackPageView);

  // Capture phase so clicks inside shadow DOM / stopped propagation still record.
  document.addEventListener("click", trackClick, { capture: true, passive: true });

  window.addEventListener("pagehide", flush);

  window.causalfunnel = window.causalfunnel || {
    page: trackPageView,
    session: function () {
      return sessionId;
    },
  };
})();
