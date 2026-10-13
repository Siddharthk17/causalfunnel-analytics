import { Router } from "express";
import { Event } from "../models/event.js";
import { timelineQuery } from "../validate.js";

export const overviewRouter = Router();

// GET /api/stats — header numbers for the dashboard. Three cheap counts
// instead of one aggregation so each stays indexed.
overviewRouter.get("/", async (_req, res, next) => {
  try {
    // distinct() would materialize every session id in Node memory;
    // a $count aggregation keeps the working set inside Mongo.
    const [totalEvents, sessionCount, totalClicks, totalPageViews] = await Promise.all([
      Event.countDocuments(),
      Event.aggregate([{ $group: { _id: "$sessionId" } }, { $count: "count" }]),
      Event.countDocuments({ type: "click" }),
      Event.countDocuments({ type: "page_view" }),
    ]);
    res.json({ totalEvents, totalSessions: sessionCount[0]?.count ?? 0, totalClicks, totalPageViews });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/timeline?hours= — per-hour buckets for the activity chart.
// Only non-empty buckets are returned; the dashboard zero-fills the gaps.
overviewRouter.get("/timeline", async (req, res, next) => {
  try {
    const { hours } = timelineQuery.parse(req.query);
    const since = new Date(Date.now() - hours * 3600_000);
    const buckets = await Event.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            hour: { $dateTrunc: { date: "$timestamp", unit: "hour" } },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.hour",
          pageViews: { $sum: { $cond: [{ $eq: ["$_id.type", "page_view"] }, "$count", 0] } },
          clicks: { $sum: { $cond: [{ $eq: ["$_id.type", "click"] }, "$count", 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: "$_id", pageViews: 1, clicks: 1 } },
    ]);
    res.json({ hours, buckets });
  } catch (err) {
    next(err);
  }
});
