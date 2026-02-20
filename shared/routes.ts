import { z } from 'zod';
import { insertGameSchema, games } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  playlist: {
    get: {
      method: 'GET' as const,
      path: '/api/playlist/:id' as const,
      responses: {
        200: z.object({
          id: z.string(),
          title: z.string(),
          songs: z.array(z.object({
            id: z.string(),
            title: z.string(),
            thumbnail: z.string()
          }))
        }),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
  },
  games: {
    create: {
      method: 'POST' as const,
      path: '/api/games' as const,
      input: insertGameSchema,
      responses: {
        201: z.custom<typeof games.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    leaderboard: {
      method: 'GET' as const,
      path: '/api/games/leaderboard/:playlistId' as const,
      responses: {
        200: z.array(z.custom<typeof games.$inferSelect>()),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type PlaylistResponseSchema = z.infer<typeof api.playlist.get.responses[200]>;
export type GameResponseSchema = z.infer<typeof api.games.create.responses[201]>;
export type LeaderboardResponseSchema = z.infer<typeof api.games.leaderboard.responses[200]>;
export type GameInput = z.infer<typeof api.games.create.input>;
