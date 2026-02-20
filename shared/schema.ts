import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  playlistId: text("playlist_id").notNull(),
  score: integer("score").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type CreateGameRequest = InsertGame;
export type GameResponse = Game;

export interface PlaylistSong {
  id: string;
  title: string;
  thumbnail: string;
}

export interface PlaylistResponse {
  id: string;
  title: string;
  songs: PlaylistSong[];
}
