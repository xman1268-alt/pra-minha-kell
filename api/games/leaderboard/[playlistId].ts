import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { games } from "../../../shared/schema";
import { desc, eq } from "drizzle-orm";

const { Pool } = pg;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { playlistId } = req.query;

  if (!playlistId || typeof playlistId !== "string") {
    return res.status(400).json({ message: "playlistId is required" });
  }

  try {
    const db = getDb();
    const leaderboard = await db
      .select()
      .from(games)
      .where(eq(games.playlistId, playlistId))
      .orderBy(desc(games.score))
      .limit(10);

    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
