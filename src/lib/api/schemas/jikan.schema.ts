// ─── Zod schemas for Jikan v4 API responses ───

import { z } from 'zod';

// ─── Common ───

const JikanPaginationSchema = z.object({
	last_visible_page: z.number(),
	has_next_page: z.boolean(),
	items: z
		.object({
			total: z.number(),
			count: z.number(),
			per_page: z.number()
		})
		.optional()
});

// ─── Episodes ───

export const JikanEpisodeSchema = z.object({
	mal_id: z.number(),
	url: z.string().url().nullable().optional(),
	title: z.string().nullable().optional(),
	title_japanese: z.string().nullable().optional(),
	title_romanji: z.string().nullable().optional(),
	aired: z
		.object({
			from: z.string().nullable().optional(),
			to: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	filler: z.boolean().optional(),
	recap: z.boolean().optional(),
	forum_url: z.string().url().nullable().optional()
});

export const JikanEpisodesResponseSchema = z.object({
	data: z.array(JikanEpisodeSchema),
	pagination: JikanPaginationSchema.optional()
});

export type JikanEpisode = z.infer<typeof JikanEpisodeSchema>;
export type JikanEpisodesResponse = z.infer<typeof JikanEpisodesResponseSchema>;

// ─── Characters ───

const JikanCharacterSchema = z.object({
	mal_id: z.number(),
	url: z.string().url().optional(),
	images: z
		.object({
			jpg: z
				.object({
					image_url: z.string().url().nullable().optional()
				})
				.optional(),
			webp: z
				.object({
					image_url: z.string().url().nullable().optional()
				})
				.optional()
		})
		.optional(),
	name: z.string(),
	name_kanji: z.string().nullable().optional(),
	nicknames: z.array(z.string()).optional(),
	favorites: z.number().optional(),
	about: z.string().nullable().optional()
});

export const JikanCharacterEntrySchema = z.object({
	role: z.string(),
	character: JikanCharacterSchema
});

export const JikanCharactersResponseSchema = z.object({
	data: z.array(JikanCharacterEntrySchema),
	pagination: JikanPaginationSchema.optional()
});

export type JikanCharacterEntry = z.infer<typeof JikanCharacterEntrySchema>;
export type JikanCharactersResponse = z.infer<typeof JikanCharactersResponseSchema>;

// ─── Recommendations ───

export const JikanRecommendationEntrySchema = z.object({
	mal_id: z.number().optional(),
	url: z.string().url().optional(),
	votes: z.number().optional(),
	entry: z.object({
		mal_id: z.number(),
		url: z.string().url().optional(),
		images: z
			.object({
				jpg: z
					.object({
						image_url: z.string().url().nullable().optional()
					})
					.optional()
			})
			.optional(),
		title: z.string()
	}),
	content: z.string().nullable().optional(),
	date: z.string().nullable().optional(),
	user: z
		.object({
			url: z.string().url().optional(),
			username: z.string()
		})
		.optional()
});

export const JikanRecommendationsResponseSchema = z.object({
	data: z.array(JikanRecommendationEntrySchema),
	pagination: JikanPaginationSchema.optional()
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
	rating: z.string().nullable().optional()
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
