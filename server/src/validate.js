import { z } from "zod";

// Every external payload is rejected or shaped here before touching mongoose.
// Keeping schemas in one module means the route handlers never repeat rules.

const sessionId = z.string().trim().min(8).max(128);
const pageUrl = z.string().trim().url().max(2048);

export const eventPayload = z
  .object({
    sessionId,
    type: z.enum(["page_view", "click"]),
    pageUrl,
    timestamp: z.string().datetime({ offset: true }).optional(),
    x: z.number().int().min(0).max(10000).optional(),
    y: z.number().int().min(0).max(10000).optional(),
    xNorm: z.number().int().min(0).max(1000).optional(),
    yNorm: z.number().int().min(0).max(1000).optional(),
    viewportW: z.number().int().min(1).max(10000).optional(),
    viewportH: z.number().int().min(1).max(10000).optional(),
    targetLabel: z.string().trim().max(160).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "click" && value.x === undefined && value.xNorm === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "click events require x or xNorm", path: ["x"] });
    }
  });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sessionParams = z.object({
  sessionId: sessionId,
});

export const heatmapQuery = z.object({
  url: pageUrl,
  limit: z.coerce.number().int().min(1).max(2000).default(1000),
});
