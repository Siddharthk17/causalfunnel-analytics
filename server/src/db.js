import mongoose from "mongoose";

let connected = false;

// Serverless platforms (Vercel) recycle the process per request, so a buffered
// query would hang until the function times out instead of surfacing an error.
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

export async function connectDatabase(uri) {
  if (connected) return mongoose.connection;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 8000),
    // Pool stays small on serverless: every concurrent instance opens its own
    // pool, and shared Atlas clusters cap total connections.
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 5),
  });
  connected = true;
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (!connected) return;
  connected = false;
  await mongoose.connection.close();
}