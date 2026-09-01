// ─── Zod schemas for AniList GraphQL API (no-auth) ───
// Public Media + Page only. No OAuth fields.

import { z } from 'zod';

export const AnilistTitleSchema = z.object({
	romaji: z.string().nullable().optional(),
	english: z.string().nullable().optional(),
	native: z.string().nullable().optional()
});

export const AnilistCoverSchema = z
	.object({
		extraLarge: z.string().nullable().optional(),
		large: z.string().nullable().optional(),
		medium: z.string().nullable().optional(),
		color: z.string().nullable().optional()
	})
	.nullable()
	.optional();

export const AnilistTagSchema = z.object({
	name: z.string(),
	rank: z.number().nullable().optional(),
	isAdult: z.boolean().nullable().optional(),
	isGeneral: z.boolean().nullable().optional()
});

export const AnilistCharacterEdgeSchema = z.object({
	role: z.string().nullable().optional(),
	node: z.object({
		id: z.number(),
		name: z.object({ full: z.string().nullable().optional() }).nullable().optional(),
		image: z.object({ large: z.string().nullable().optional() }).nullable().optional(),
		favourites: z.number().nullable().optional()
	}),
	voiceActors: z
		.array(
			z.object({
				id: z.number().nullable().optional(),
				name: z.object({ full: z.string().nullable().optional() }).nullable().optional(),
				languageV2: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional()
});

export const AnilistMediaSchema = z.object({
	id: z.number(),
	idMal: z.number().nullable().optional(),
	title: AnilistTitleSchema,
	description: z.string().nullable().optional(),
	coverImage: AnilistCoverSchema,
	bannerImage: z.string().nullable().optional(),
	format: z.string().nullable().optional(),
	status: z.string().nullable().optional(),
	episodes: z.number().nullable().optional(),
	duration: z.number().nullable().optional(),
	season: z.string().nullable().optional(),
	seasonYear: z.number().nullable().optional(),
	isAdult: z.boolean().nullable().optional(),
	genres: z.array(z.string()).nullable().optional(),
	synonyms: z.array(z.string()).nullable().optional(),
	tags: z.array(AnilistTagSchema).nullable().optional(),
	averageScore: z.number().nullable().optional(),
	meanScore: z.number().nullable().optional(),
	popularity: z.number().nullable().optional(),
	favourites: z.number().nullable().optional(),
	trending: z.number().nullable().optional(),
	nextAiringEpisode: z
		.object({
			episode: z.number(),
			airingAt: z.number(),
			timeUntilAiring: z.number().nullable().optional()
		})
		.nullable()
		.optional(),
	trailer: z
		.object({ id: z.string().nullable().optional(), site: z.string().nullable().optional() })
		.nullable()
		.optional(),
	relations: z
		.object({
			edges: z.array(
				z.object({
					relationType: z.string(),
					node: z.object({
						id: z.number(),
						type: z.string().nullable().optional(),
						format: z.string().nullable().optional(),
						title: AnilistTitleSchema,
						coverImage: AnilistCoverSchema
					})
				})
			)
		})
		.nullable()
		.optional(),
	characters: z
		.object({ edges: z.array(AnilistCharacterEdgeSchema) })
		.nullable()
		.optional(),
	recommendations: z
		.object({
			nodes: z.array(
				z.object({
					rating: z.number().nullable().optional(),
					mediaRecommendation: z
						.object({
							id: z.number(),
							title: AnilistTitleSchema,
							coverImage: AnilistCoverSchema,
							format: z.string().nullable().optional(),
							averageScore: z.number().nullable().optional()
						})
						.nullable()
						.optional()
				})
			)
		})
		.nullable()
		.optional(),
	reviews: z
		.object({
			nodes: z.array(
				z.object({
					summary: z.string().nullable().optional(),
					rating: z.number().nullable().optional(),
					ratingAmount: z.number().nullable().optional(),
					body: z.string().nullable().optional(),
					user: z.object({ name: z.string().nullable().optional(), avatar: z.object({ large: z.string().nullable().optional() }).nullable().optional() }).nullable().optional()
				})
			)
		})
		.nullable()
		.optional(),
	airingSchedule: z
		.object({ nodes: z.array(z.object({ episode: z.number(), airingAt: z.number() })) })
		.nullable()
		.optional(),
	studios: z
		.object({
			edges: z.array(z.object({ isMain: z.boolean().nullable().optional(), node: z.object({ name: z.string() }) }))
		})
		.nullable()
		.optional(),
	externalLinks: z.array(z.object({ url: z.string(), site: z.string(), icon: z.string().nullable().optional() })).nullable().optional(),
	streamingEpisodes: z.array(z.object({ title: z.string().nullable().optional(), thumbnail: z.string().nullable().optional(), url: z.string().nullable().optional(), site: z.string().nullable().optional() })).nullable().optional()
});

export type AnilistMedia = z.infer<typeof AnilistMediaSchema>;

export const AnilistPageMediaSchema = z.object({
	Page: z.object({
		pageInfo: z
			.object({
				total: z.number().nullable().optional(),
				currentPage: z.number().nullable().optional(),
				lastPage: z.number().nullable().optional(),
				hasNextPage: z.boolean().nullable().optional(),
				perPage: z.number().nullable().optional()
			})
			.nullable()
			.optional(),
		media: z.array(AnilistMediaSchema)
	})
});

export type AnilistPageMedia = z.infer<typeof AnilistPageMediaSchema>;
