import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventsRouter } from "./routes/events.js";
import { sessionsRouter } from "./routes/sessions.js";
import { pagesRouter } from "./routes/pages.js";
import { heatmapsRouter } from "./routes/heatmaps.js";
import { overviewRouter } from "./routes/overview.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
  app.use(express.json({ limit: "64kb" }));
  app.use(morgan("tiny"));

  // Ingestion is the only abuse surface (no auth by assignment scope),
  // so it alone gets a tight per-IP budget.
  app.use("/api/events", rateLimit({ windowMs: 60_000, limit: 600 }), eventsRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/pages", pagesRouter);
  app.use("/api/heatmaps", heatmapsRouter);
  app.use("/api/stats", overviewRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Unknown /api/* paths answer JSON so fetch clients never parse an HTML 404.
  app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

  // Demo shop + tracker served same-origin so adblockers and CORS
  // never interfere with the reviewer's first click-through.
  app.use("/tracker.js", express.static(path.join(repoRoot, "tracker", "causalfunnel.js")));
  app.use("/demo", express.static(path.join(repoRoot, "demo")));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.name === "ZodError") return res.status(400).json({ error: "invalid input" });
    // express.json failures must not surface as 500s: the client sent bytes
    // we refuse, which is a 4xx by definition.
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "malformed json" });
    if (err?.type === "entity.too.large") return res.status(413).json({ error: "payload too large" });
    console.error(err);
    res.status(500).json({ error: "internal error" });
  });

  return app;
}
