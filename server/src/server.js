import "dotenv/config";
import { buildApp } from "./app.js";
import { connectDatabase } from "./db.js";

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/causalfunnel";

async function boot(attempt = 1) {
  try {
    await connectDatabase(MONGODB_URI);
    console.log("mongo connected");
  } catch (err) {
    // Mongo in docker often boots slower than the api; back off and retry
    // for ~30s before giving up so compose needs no healthcheck ordering.
    if (attempt >= 6) {
      console.error("mongo unreachable:", err.message);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return boot(attempt + 1);
  }
  const app = buildApp();
  const listener = app.listen(PORT, () => console.log(`api listening on :${PORT}`));
  // A port conflict otherwise throws an unhandled 'error' with a bare stack.
  listener.on("error", (err) => {
    console.error(`failed to listen on :${PORT}: ${err.message}`);
    process.exit(1);
  });
}

boot();
