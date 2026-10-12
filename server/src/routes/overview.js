import { Router } from "express";
import { Event } from "../models/event.js";

export const overviewRouter = Router();

// GET /api/stats — header numbers for the dashboard. Three cheap counts
// instead of one aggregation so each stays indexed.
overviewRouter.get("/", async (_req, res, next) => {
  try {
    const [totalEvents, totalSessions, totalClicks, totalPageViews] = await Promise.all([
      Event.countDocuments(),
      Event.distinct("sessionId").then((ids) => ids.length),
      Event.countDocuments({ type: "click" }),
      Event.countDocuments({ type: "page_view" }),
    ]);
    res.json({ totalEvents, totalSessions, totalClicks, totalPageViews });
  } catch (err) {
    next(err);
  }
});
