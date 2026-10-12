import { Router } from "express";
import { Event } from "../models/event.js";
import { eventPayload } from "../validate.js";

export const eventsRouter = Router();

// POST /api/events — ingestion only. 201 with the stored id so the tracker
// can drop from its retry queue; 400 carries the exact zod failure.
eventsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = eventPayload.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid event", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const stored = await Event.create({
      ...body,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 512) || undefined,
    });
    res.status(201).json({ id: String(stored._id) });
  } catch (err) {
    next(err);
  }
});
