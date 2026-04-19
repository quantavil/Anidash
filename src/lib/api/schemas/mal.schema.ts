// ─── Zod schemas for MAL API responses ───
// Every external response is validated at the boundary.

import { z } from 'zod';

// ─── Primitives ───

const UrlSchema = z.string().url().nullable();

const PictureSchema = z.object({
  medium: z.string().url().nullable(),
  large: z.string().url().nullable(),
});

const GenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const StudioSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const StartSeasonSchema = z.object({
  year: z.number().nullable(),
  season: z.string().nullable(),
});

// ─── User ───

export const MalUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  picture: UrlSchema,
  gender: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  joined_at: z.string().nullable().optional(),
  anime_statistics: z
    .object({
      num_items_watching: z.number().optional(),
      num_items_completed: z.number().optional(),
      num_items_on_hold: z.number().optional(),
      num_items_dropped: z.number().optional(),
      num_items_plan_to_watch: z.number().optional(),
      num_items: z.number().optional(),
      num_days_watched: z.number().optional(),
      num_episodes: z.number().optional(),
      mean_score: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type MalUser = z.infer<typeof MalUserSchema>;

// ─── Token Response ───

export const MalTokenResponseSchema = z.object({
  ok: z.literal(true),
  token_type: z.string(),
  expires_in: z.number(),
  access_token: z.string(),
  refresh_token: z.string().optional(), // MAL sometimes omits on refresh
});

export type MalTokenResponse = z.infer<typeof MalTokenResponseSchema>;

// ─── Anime (lean — for list responses) ───

export const MalAnimeLeanSchema = z.object({
  id: z.number(),
  title: z.string(),
  main_picture: PictureSchema.nullable().optional(),
  mean: z.number().nullable().optional(),
  num_episodes: z.number().optional(),
  genres: z.array(GenreSchema).optional(),
  studios: z.array(StudioSchema).optional(),
  start_season: StartSeasonSchema.nullable().optional(),
  media_type: z.string().optional(),
  status: z.string().optional(),
});

export type MalAnimeLean = z.infer<typeof MalAnimeLeanSchema>;

// ─── User List Status (from GET response) ───

export const MalListStatusSchema = z.object({
  status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']),
  score: z.number(),
  num_episodes_watched: z.number(),
  is_rewatching: z.boolean().optional(),
  updated_at: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  finish_date: z.string().nullable().optional(),
});

export type MalListStatus = z.infer<typeof MalListStatusSchema>;

// ─── User List Entry (node + list_status) ───

export const MalUserListEntrySchema = z.object({
  node: MalAnimeLeanSchema,
  list_status: MalListStatusSchema,
});

export type MalUserListEntry = z.infer<typeof MalUserListEntrySchema>;

// ─── User List Response (paginated) ───

export const MalUserListResponseSchema = z.object({
  data: z.array(MalUserListEntrySchema),
  paging: z
    .object({
      next: z.string().url().optional(),
    })
    .optional(),
});

export type MalUserListResponse = z.infer<typeof MalUserListResponseSchema>;

// ─── Anime Detail (full — for detail page) ───

export const MalAnimeDetailSchema = MalAnimeLeanSchema.extend({
  synopsis: z.string().nullable().optional(),
  related_anime: z
    .array(
      z.object({
        node: z.object({
          id: z.number(),
          title: z.string(),
          main_picture: PictureSchema.nullable().optional(),
          media_type: z.string().optional(),
        }),
        relation_type: z.string(),
        relation_type_formatted: z.string().optional(),
      }),
    )
    .optional(),
  recommendations: z
    .array(
      z.object({
        node: z.object({
          id: z.number(),
          title: z.string(),
          main_picture: PictureSchema.nullable().optional(),
          mean: z.number().nullable().optional(),
          media_type: z.string().optional(),
        }),
        num_recommendations: z.number().optional(),
      }),
    )
    .optional(),
});

export type MalAnimeDetail = z.infer<typeof MalAnimeDetailSchema>;

// ─── Search / Seasonal Response ───

export const MalAnimeSearchResponseSchema = z.object({
  data: z.array(
    z.object({
      node: MalAnimeLeanSchema,
    }),
  ),
  paging: z
    .object({
      next: z.string().url().optional(),
      previous: z.string().url().optional(),
    })
    .optional(),
});

export type MalAnimeSearchResponse = z.infer<typeof MalAnimeSearchResponseSchema>;

// ─── Status Update Payload (for PATCH) ───
// Note: MAL uses `num_watched_episodes` in PATCH (not `num_episodes_watched`)

export const MalStatusUpdateSchema = z.object({
  status: z
    .enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'])
    .optional(),
  score: z.number().min(0).max(10).optional(),
  num_watched_episodes: z.number().min(0).optional(),
  is_rewatching: z.boolean().optional(),
});

export type MalStatusUpdate = z.infer<typeof MalStatusUpdateSchema>;
