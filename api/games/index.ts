import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { games } from "../../shared/schema";
import { insertGameSchema } from "../../shared/schema";
import { z } from "zod";

const { Pool } = pg;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = getDb();
    const input = insertGameSchema.parse(req.body);
    const [newGame] = await db.insert(games).values(input).returning();
    return res.status(201).json(newGame);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join("."),
      });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
