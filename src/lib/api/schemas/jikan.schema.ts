// ─── Zod schemas for Jikan v4 API responses ───

import { z } from 'zod';

// ─── Common ───

const JikanPaginationSchema = z.object({
	last_visible_page: z.number().optional().nullable(),
	has_next_page: z.boolean().optional().nullable(),
	items: z
		.object({
			total: z.number().optional().nullable(),
			count: z.number().optional().nullable(),
			per_page: z.number().optional().nullable()
		})
		.optional()
		.nullable()
});

// ─── Characters ───

const JikanCharacterSchema = z.object({
	mal_id: z.number(),
	url: z.string().optional().nullable(),
	images: z
		.object({
			jpg: z
				.object({
					image_url: z.string().optional().nullable()
				})
				.optional()
				.nullable(),
			webp: z
				.object({
					image_url: z.string().optional().nullable()
				})
				.optional()
				.nullable()
		})
		.optional()
		.nullable(),
	name: z.string(),
	name_kanji: z.string().nullable().optional(),
	nicknames: z.array(z.string()).optional().nullable(),
	favorites: z.number().optional().nullable(),
	about: z.string().nullable().optional()
});

export const JikanCharacterEntrySchema = z.object({
	role: z.string(),
	character: JikanCharacterSchema
});

export const JikanCharactersResponseSchema = z.object({
	data: z.array(JikanCharacterEntrySchema),
	pagination: JikanPaginationSchema.optional().nullable()
});

export type JikanCharacterEntry = z.infer<typeof JikanCharacterEntrySchema>;
export type JikanCharactersResponse = z.infer<typeof JikanCharactersResponseSchema>;

// ─── Recommendations ───

export const JikanRecommendationEntrySchema = z.object({
	mal_id: z.number().optional().nullable(),
	url: z.string().optional().nullable(),
	votes: z.number().optional().nullable(),
	entry: z.object({
		mal_id: z.number(),
		url: z.string().optional().nullable(),
		images: z
			.object({
				jpg: z
					.object({
						image_url: z.string().optional().nullable()
					})
					.optional()
					.nullable()
			})
			.optional()
			.nullable(),
		title: z.string()
	}),
	content: z.string().nullable().optional(),
	date: z.string().nullable().optional(),
	user: z
		.object({
			url: z.string().optional().nullable(),
			username: z.string()
		})
		.optional()
		.nullable()
});

export const JikanRecommendationsResponseSchema = z.object({
	data: z.array(JikanRecommendationEntrySchema),
	pagination: JikanPaginationSchema.optional().nullable()
});

export type JikanRecommendationEntry = z.infer<typeof JikanRecommendationEntrySchema>;
export type JikanRecommendationsResponse = z.infer<typeof JikanRecommendationsResponseSchema>;
// ─── Anime Search (Jikan) ───

export const JikanAnimeSchema = z.object({
	mal_id: z.number(),
	url: z.string().url().optional(),
	images: z
		.object({
			jpg: z
				.object({
					image_url: z.string().url().nullable().optional(),
					large_image_url: z.string().url().nullable().optional()
				})
				.optional(),
			webp: z
				.object({
					image_url: z.string().url().nullable().optional(),
					large_image_url: z.string().url().nullable().optional()
				})
				.optional()
		})
		.optional(),
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

export type JikanSearchResponse = z.infer<typeof JikanSearchResponseSchema>;

// ─── Genres ───

export const JikanGenreSchema = z.object({
	mal_id: z.number(),
	name: z.string(),
	url: z.string().url().optional(),
	count: z.number().optional()
});

export type JikanGenre = z.infer<typeof JikanGenreSchema>;

export const JikanGenresResponseSchema = z.object({
	data: z.array(JikanGenreSchema)
});

export type JikanGenresResponse = z.infer<typeof JikanGenresResponseSchema>;
