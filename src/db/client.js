import "server-only";
import { MongoClient } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";
import { DB_NAME } from "@/db/config";

function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Put the sufra-app connection string in .env.local (and in the Vercel project settings).");
  }
  // A small pool per instance: Vercel runs many instances, and the free Atlas
  // cluster allows 500 connections in total
  const client = new MongoClient(uri, { appName: "sufra", maxPoolSize: 10 });
  // On Vercel, keeps the function alive just long enough to close idle connections
  attachDatabasePool(client);
  return client;
}

// One client per server process, created on first use rather than at import time,
// so importing this file never needs the env var. Kept on globalThis so dev hot
// reloads reuse it instead of opening new connections on every edit.
export function getDb() {
  globalThis.sufraMongo ??= connect();
  return globalThis.sufraMongo.db(DB_NAME);
}
