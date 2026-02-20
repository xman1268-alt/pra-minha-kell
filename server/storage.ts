import { games, type Game, type InsertGame } from "../shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  getLeaderboard(playlistId: string): Promise<Game[]>;
}

export class DatabaseStorage implements IStorage {
  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async getLeaderboard(playlistId: string): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.playlistId, playlistId))
      .orderBy(desc(games.score))
      .limit(10);
  }
}

export const storage = new DatabaseStorage();
