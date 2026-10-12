import { Router } from "express";
import { Event } from "../models/event.js";
import { pagination, sessionParams } from "../validate.js";

export const sessionsRouter = Router();

// GET /api/sessions — one row per sessionId with counts. Aggregation keeps
// this O(sessions) regardless of event volume; page/limit cap the response.
sessionsRouter.get("/", async (req, res, next) => {
  try {
    const { page, limit } = pagination.parse(req.query);
    const skip = (page - 1) * limit;

    const rows = await Event.aggregate([
      {
        $group: {
          _id: "$sessionId",
          totalEvents: { $sum: 1 },
          pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ["$type", "click"] }, 1, 0] } },
          firstSeen: { $min: "$timestamp" },
          lastSeen: { $max: "$timestamp" },
          pages: { $addToSet: "$pageUrl" },
        },
      },
      { $sort: { lastSeen: -1 } },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                sessionId: "$_id",
                totalEvents: 1,
                pageViews: 1,
                clicks: 1,
                firstSeen: 1,
                lastSeen: 1,
                pageCount: { $size: "$pages" },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const { rows: sessions, total } = rows[0];
    res.json({ sessions, totalSessions: total[0]?.count ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:sessionId — the ordered user journey, oldest first.
// Capped at 500 events: a journey longer than that is a bot or a bug.
sessionsRouter.get("/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = sessionParams.parse(req.params);
    const limit = Math.min(Number(req.query.limit) || 500, 500);
    const events = await Event.find({ sessionId }).sort({ timestamp: 1 }).limit(limit).lean();
    if (events.length === 0) return res.status(404).json({ error: "session not found" });
    res.json({ sessionId, events });
  } catch (err) {
    next(err);
  }
});
