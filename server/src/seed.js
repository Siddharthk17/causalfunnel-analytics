import "dotenv/config";
import { connectDatabase } from "./db.js";
import { Event } from "./models/event.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/causalfunnel";

// Sample traffic so the dashboard isn't empty on first open. Safe to rerun:
// it wipes only documents tagged with the demo seed sessions.
const SEED_SESSIONS = ["seed-alpha-0001", "seed-beta-0002", "seed-gamma-0003"];
const HOME = "http://localhost:4000/demo/";
const PRODUCT = "http://localhost:4000/demo/product.html";
const CHECKOUT = "http://localhost:4000/demo/checkout.html";

function minutesAgo(base, minutes) {
  return new Date(base - minutes * 60_000);
}

const now = Date.now();
const journeys = [
  {
    sessionId: SEED_SESSIONS[0],
    steps: [
      { type: "page_view", pageUrl: HOME, at: minutesAgo(now, 42) },
      { type: "click", pageUrl: HOME, at: minutesAgo(now, 41), x: 620, y: 210, xNorm: 484, yNorm: 263, viewportW: 1280, viewportH: 800, targetLabel: "View featured product" },
      { type: "page_view", pageUrl: PRODUCT, at: minutesAgo(now, 40) },
      { type: "click", pageUrl: PRODUCT, at: minutesAgo(now, 38), x: 880, y: 540, xNorm: 688, yNorm: 675, viewportW: 1280, viewportH: 800, targetLabel: "Add to cart" },
      { type: "page_view", pageUrl: CHECKOUT, at: minutesAgo(now, 36) },
      { type: "click", pageUrl: CHECKOUT, at: minutesAgo(now, 34), x: 280, y: 460, xNorm: 219, yNorm: 575, viewportW: 1280, viewportH: 800, targetLabel: "Pay ₹2,499" },
    ],
  },
  {
    sessionId: SEED_SESSIONS[1],
    steps: [
      { type: "page_view", pageUrl: HOME, at: minutesAgo(now, 90) },
      { type: "click", pageUrl: HOME, at: minutesAgo(now, 88), x: 320, y: 410, xNorm: 250, yNorm: 513, viewportW: 1280, viewportH: 800, targetLabel: "Add to cart" },
      { type: "click", pageUrl: HOME, at: minutesAgo(now, 87), x: 335, y: 425, xNorm: 262, yNorm: 531, viewportW: 1280, viewportH: 800, targetLabel: "Add to cart" },
    ],
  },
  {
    sessionId: SEED_SESSIONS[2],
    steps: [
      { type: "page_view", pageUrl: PRODUCT, at: minutesAgo(now, 12) },
      { type: "click", pageUrl: PRODUCT, at: minutesAgo(now, 10), x: 890, y: 545, xNorm: 695, yNorm: 681, viewportW: 1280, viewportH: 800, targetLabel: "Buy now" },
      { type: "page_view", pageUrl: CHECKOUT, at: minutesAgo(now, 9) },
    ],
  },
];

await connectDatabase(MONGODB_URI);
await Event.deleteMany({ sessionId: { $in: SEED_SESSIONS } });
for (const journey of journeys) {
  await Event.insertMany(
    journey.steps.map(({ at, ...step }) => ({ ...step, sessionId: journey.sessionId, timestamp: at, userAgent: "seed-script" }))
  );
}
console.log(`seeded ${journeys.length} sessions`);
process.exit(0);
