import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { Event } from "./models/event.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/causalfunnel";
// Seeded traffic has to carry the origin it was served from, otherwise the
// heatmap page picker offers localhost URLs that no visitor can reach.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://causalfunnel-api-fr2d.onrender.com").replace(/\/$/, "");

const PAGES = {
  home: `${SITE_ORIGIN}/demo/`,
  product: `${SITE_ORIGIN}/demo/product.html`,
  checkout: `${SITE_ORIGIN}/demo/checkout.html`,
};

// Only sessions we generated are ever deleted, so running this against a live
// database never touches real traffic.
const SEED_PREFIX = "seed-";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// mulberry32 — a small deterministic PRNG so repeated seeds produce the same
// shape and the demo does not churn on every run.
function makeRandom(seed) {
  let state = seed;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20261013);

function pickWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function jitter(centre, spread) {
  return centre + (random() - 0.5) * 2 * spread;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const DEVICES = [
  { label: "desktop", viewportW: 1440, viewportH: 900, weight: 5 },
  { label: "laptop", viewportW: 1280, viewportH: 800, weight: 4 },
  { label: "mobile", viewportW: 390, viewportH: 844, weight: 2 },
];

// Normalised 0-1 centres taken from the real demo layouts, so the heatmap
// lands on the actual buttons rather than scattering at random.
const CLICK_ZONES = {
  home: {
    desktop: [
      { label: "View featured product", x: 0.28, y: 0.5, weight: 5 },
      { label: "Add to cart", x: 0.49, y: 0.87, weight: 6 },
      { label: "Add to cart", x: 0.18, y: 0.87, weight: 3 },
      { label: "Add to cart", x: 0.81, y: 0.87, weight: 2 },
      { label: "PRODUCT", x: 0.79, y: 0.1, weight: 2 },
      { label: "CHECKOUT", x: 0.9, y: 0.1, weight: 1 },
    ],
    mobile: [
      { label: "View featured product", x: 0.5, y: 0.38, weight: 5 },
      { label: "Add to cart", x: 0.5, y: 0.62, weight: 5 },
      { label: "PRODUCT", x: 0.82, y: 0.05, weight: 2 },
    ],
  },
  product: {
    desktop: [
      { label: "Add to cart", x: 0.41, y: 0.79, weight: 6 },
      { label: "Buy now", x: 0.63, y: 0.79, weight: 4 },
      { label: "Trailhead Backpack 22L", x: 0.64, y: 0.22, weight: 1 },
    ],
    mobile: [
      { label: "Add to cart", x: 0.3, y: 0.82, weight: 5 },
      { label: "Buy now", x: 0.7, y: 0.82, weight: 4 },
    ],
  },
  checkout: {
    desktop: [
      { label: "Pay ₹2,499", x: 0.51, y: 0.86, weight: 7 },
      { label: "NAME", x: 0.51, y: 0.53, weight: 2 },
      { label: "UPI ID", x: 0.51, y: 0.71, weight: 1 },
    ],
    mobile: [
      { label: "Pay ₹2,499", x: 0.5, y: 0.89, weight: 7 },
      { label: "NAME", x: 0.5, y: 0.6, weight: 2 },
    ],
  },
};

const JOURNEYS = [
  { name: "single page browse", weight: 30, pages: ["home"] },
  { name: "product interest", weight: 26, pages: ["home", "product"] },
  { name: "checkout abandoned", weight: 18, pages: ["home", "product", "checkout"] },
  { name: "full conversion", weight: 14, pages: ["home", "product", "checkout"] },
  { name: "direct to product", weight: 12, pages: ["product"] },
];

function buildClick(device, page, viewportW, viewportH) {
  const family = device.label === "mobile" ? "mobile" : "desktop";
  const zone = pickWeighted(CLICK_ZONES[page][family]);
  const spread = family === "mobile" ? 0.035 : 0.025;
  const xNorm = clamp(Math.round(jitter(zone.x, spread) * 1000), 0, 1000);
  const yNorm = clamp(Math.round(jitter(zone.y, spread) * 1000), 0, 1000);
  return {
    x: Math.round((xNorm / 1000) * viewportW),
    y: Math.round((yNorm / 1000) * viewportH),
    xNorm,
    yNorm,
    viewportW,
    viewportH,
    targetLabel: zone.label,
  };
}

// Traffic skews toward working hours; without this the activity chart is a
// flat line and the 24h view looks broken.
function hourWeight(hour) {
  if (hour >= 9 && hour <= 13) return 6;
  if (hour >= 14 && hour <= 19) return 8;
  if (hour >= 20 && hour <= 23) return 4;
  return 2;
}

const BUSINESS_HOURS = [
  { hour: 9, weight: 4 }, { hour: 10, weight: 6 }, { hour: 11, weight: 7 },
  { hour: 12, weight: 5 }, { hour: 13, weight: 6 }, { hour: 14, weight: 6 },
  { hour: 15, weight: 7 }, { hour: 16, weight: 8 }, { hour: 17, weight: 7 },
  { hour: 18, weight: 6 }, { hour: 19, weight: 5 }, { hour: 20, weight: 3 },
];

// Nudge quiet-hour events into the working day. Moving the clock backwards
// only keeps every timestamp in the past — pushing forward would place events
// after now, where the activity chart cannot plot them and the wire lies.
function biasToWorkingHours(timestamp) {
  const shifted = new Date(timestamp);
  shifted.setHours(pickWeighted(BUSINESS_HOURS).hour, shifted.getMinutes(), shifted.getSeconds(), 0);
  if (shifted.getTime() > Date.now()) shifted.setDate(shifted.getDate() - 1);
  return shifted;
}

function buildSession(sessionIndex) {
  const device = pickWeighted(DEVICES);
  const journey = pickWeighted(JOURNEYS);
  const sessionId = `${SEED_PREFIX}${String(sessionIndex + 1).padStart(3, "0")}`;

  let clock = Date.now() - Math.round(random() * SEVEN_DAYS_MS);
  const events = [];

  journey.pages.forEach((page, pageIndex) => {
    clock -= Math.round(2000 + random() * 90_000);
    events.push({
      sessionId,
      type: "page_view",
      pageUrl: PAGES[page],
      timestamp: new Date(clock),
      userAgent: `seed/${device.label}`,
    });

    // Conversions click Pay; everyone else fidgets once or twice.
    const isFinalPage = pageIndex === journey.pages.length - 1;
    const converts = journey.name === "full conversion" && page === "checkout";
    const clickCount = converts
      ? 1 + Math.round(random())
      : isFinalPage
        ? 1 + Math.round(random() * 2)
        : Math.round(random() * 2);

    for (let i = 0; i < clickCount; i++) {
      clock += 900 + Math.round(random() * 75_000);
      events.push({
        sessionId,
        type: "click",
        pageUrl: PAGES[page],
        timestamp: new Date(clock),
        ...buildClick(device, page, device.viewportW, device.viewportH),
        userAgent: `seed/${device.label}`,
      });
    }
  });

  return events;
}

const SESSION_COUNT = Number(process.env.SEED_SESSIONS || 34);

await connectDatabase(MONGODB_URI);
await Event.deleteMany({ sessionId: { $regex: `^${SEED_PREFIX}` } });

const documents = [];
for (let i = 0; i < SESSION_COUNT; i++) {
  documents.push(...buildSession(i));
}

// Bias timestamps into daylight hours so the hourly buckets are not flat.
for (const event of documents) {
  if (hourWeight(event.timestamp.getHours()) === 2 && random() < 0.75) {
    event.timestamp = biasToWorkingHours(event.timestamp);
  }
}

documents.sort((a, b) => a.timestamp - b.timestamp);

// A visit recorded after now is not data, it is a clock bug.
const now = Date.now();
const future = documents.filter((event) => event.timestamp.getTime() > now);
if (future.length > 0) {
  await disconnectDatabase();
  throw new Error(`${future.length} seeded events land in the future — refusing to write them`);
}

await Event.insertMany(documents);

const clicks = documents.filter((event) => event.type === "click").length;
console.log(
  `seeded ${SESSION_COUNT} sessions, ${documents.length} events (${clicks} clicks) across ${SITE_ORIGIN}`
);
await disconnectDatabase();
process.exit(0);