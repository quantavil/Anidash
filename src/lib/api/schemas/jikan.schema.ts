// ─── Zod schemas for Jikan v4 API responses ───

import { z } from 'zod';

// ─── Common ───

const JikanPaginationSchema = z.object({
	last_visible_page: z.number().nullable().optional(),
	has_next_page: z.boolean().nullable().optional(),
	items: z
		.object({
			total: z.number().nullable().optional(),
			count: z.number().nullable().optional(),
			per_page: z.number().nullable().optional()
		})
		.nullable()
		.optional()
});

const JikanImagesSchema = z.object({
	jpg: z
		.object({
			image_url: z.string().nullable().optional(),
			large_image_url: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	webp: z
		.object({
			image_url: z.string().nullable().optional(),
			large_image_url: z.string().nullable().optional()
		})
		.nullable()
		.optional()
});

// ─── Characters ───

const JikanCharacterSchema = z.object({
	mal_id: z.number(),
	url: z.string().nullable().optional(),
	images: JikanImagesSchema.nullable().optional(),
	name: z.string(),
	name_kanji: z.string().nullable().optional(),
	nicknames: z.array(z.string()).nullable().optional(),
	favorites: z.number().nullable().optional(),
	about: z.string().nullable().optional()
});

export const JikanCharacterEntrySchema = z.object({
	role: z.string(),
	character: JikanCharacterSchema
});

export const JikanCharactersResponseSchema = z.object({
	data: z.array(JikanCharacterEntrySchema),
	pagination: JikanPaginationSchema.nullable().optional()
});

export type JikanCharacterEntry = z.infer<typeof JikanCharacterEntrySchema>;

// ─── Recommendations ───

export const JikanRecommendationEntrySchema = z.object({
	mal_id: z.number().nullable().optional(),
	url: z.string().nullable().optional(),
	votes: z.number().nullable().optional(),
	entry: z.object({
		mal_id: z.number(),
		url: z.string().nullable().optional(),
		images: JikanImagesSchema.nullable().optional(),
		title: z.string()
	}),
	content: z.string().nullable().optional(),
	date: z.string().nullable().optional(),
	user: z
		.object({
			url: z.string().nullable().optional(),
			username: z.string()
		})
		.nullable()
		.optional()
});

export const JikanRecommendationsResponseSchema = z.object({
	data: z.array(JikanRecommendationEntrySchema),
	pagination: JikanPaginationSchema.nullable().optional()
});

export type JikanRecommendationEntry = z.infer<typeof JikanRecommendationEntrySchema>;

// ─── Anime Search (Jikan) ───

export const JikanAnimeSchema = z.object({
	mal_id: z.number(),
	url: z.string().url().optional(),
	images: JikanImagesSchema.nullable().optional(),
	title: z.string(),
	title_english: z.string().nullable().optional(),
	type: z.string().nullable().optional(),
	episodes: z.number().nullable().optional(),
	status: z.string().nullable().optional(),
	score: z.number().nullable().optional(),
	synopsis: z.string().nullable().optional(),
	genres: z
		.array(
			z.object({
				mal_id: z.number(),
				name: z.string()
			})
		)
		.optional(),
	studios: z
		.array(
			z.object({
				mal_id: z.number(),
				name: z.string()
			})
		)
		.optional(),
	season: z.string().nullable().optional(),
	year: z.number().nullable().optional(),
	rating: z.string().nullable().optional(),
	members: z.number().optional()
});

export type JikanAnime = z.infer<typeof JikanAnimeSchema>;

export const JikanSearchResponseSchema = z.object({
	data: z.array(JikanAnimeSchema),
	pagination: JikanPaginationSchema.optional()
});

// ─── Genres ───

export const JikanGenreSchema = z.object({
	mal_id: z.number(),
	name: z.string(),
	url: z.string().url().optional(),
	count: z.number().optional()
});

export const JikanGenresResponseSchema = z.object({
	data: z.array(JikanGenreSchema)
});
