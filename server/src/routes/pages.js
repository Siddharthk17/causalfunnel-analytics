import { Router } from "express";
import { Event } from "../models/event.js";

export const pagesRouter = Router();

// GET /api/pages — distinct URLs for the heatmap selector, with totals.
pagesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await Event.aggregate([
      {
        $group: {
          _id: "$pageUrl",
          totalEvents: { $sum: 1 },
          clicks: { $sum: { $cond: [{ $eq: ["$type", "click"] }, 1, 0] } },
          sessions: { $addToSet: "$sessionId" },
        },
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 0,
          pageUrl: "$_id",
          totalEvents: 1,
          clicks: 1,
          sessions: { $size: "$sessions" },
        },
      },
    ]);
    res.json({ pages: rows });
  } catch (err) {
    next(err);
  }
});
