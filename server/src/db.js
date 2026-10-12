import mongoose from "mongoose";

let connected = false;

export async function connectDatabase(uri) {
  if (connected) return mongoose.connection;
  // Fail fast at boot so docker healthchecks catch a bad URI instead of
  // serving 500s. Retry loop lives in server.js, not here.
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  connected = true;
  return mongoose.connection;
}
