import { Router } from "express";
import { Event } from "../models/event.js";
import { heatmapQuery } from "../validate.js";

export const heatmapsRouter = Router();

// GET /api/heatmaps?url= — click points for one page, newest first.
// Frontend positions dots from xNorm/yNorm so mixed viewports still align.
heatmapsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = heatmapQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "url query param is required" });
    }
    const { url, limit } = parsed.data;
    const clicks = await Event.find({ pageUrl: url, type: "click" })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select({ _id: 0, x: 1, y: 1, xNorm: 1, yNorm: 1, viewportW: 1, viewportH: 1, timestamp: 1, sessionId: 1 })
      .lean();
    res.json({ pageUrl: url, clicks });
  } catch (err) {
    next(err);
  }
});
