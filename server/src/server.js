import "dotenv/config";
import { buildApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./db.js";

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/causalfunnel";
// 6 attempts with backoff covers docker-compose's slow mongo boot. Serverless
// cold starts must fail fast instead, so platforms set this to 1.
const CONNECT_ATTEMPTS = Number(process.env.DB_CONNECT_ATTEMPTS || 6);

async function boot(attempt = 1) {
  try {
    await connectDatabase(MONGODB_URI);
    console.log("mongo connected");
  } catch (err) {
    if (attempt >= CONNECT_ATTEMPTS) {
      console.error(`mongo unreachable after ${attempt} attempt(s): ${err.message}`);
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    return boot(attempt + 1);
  }

  const listener = buildApp().listen(PORT, () => console.log(`api listening on :${PORT}`));
  // A port conflict otherwise throws an unhandled 'error' with a bare stack.
  listener.on("error", (err) => {
    console.error(`failed to listen on :${PORT}: ${err.message}`);
    process.exit(1);
  });

  // Hosted platforms restart on SIGTERM; draining first avoids cutting live
  // requests and leaves no half-closed socket for the next boot.
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      console.log(`${signal} received, draining`);
      listener.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    });
  }
}

boot();