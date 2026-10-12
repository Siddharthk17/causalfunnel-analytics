import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["page_view", "click"], index: true },
    pageUrl: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    x: { type: Number, min: 0, max: 10000 },
    y: { type: Number, min: 0, max: 10000 },
    xNorm: { type: Number, min: 0, max: 1000 },
    yNorm: { type: Number, min: 0, max: 1000 },
    viewportW: { type: Number, min: 1, max: 10000 },
    viewportH: { type: Number, min: 1, max: 10000 },
    targetLabel: { type: String, maxlength: 160 },
    userAgent: { type: String, maxlength: 512 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

// Session timeline reads hit this; heatmap reads hit the second.
eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ pageUrl: 1, type: 1, timestamp: -1 });

export const Event = mongoose.model("Event", eventSchema);
