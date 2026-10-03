// ─── Zod schemas for AniList GraphQL API (no-auth) ───
// Mirrors exactly what MEDIA_DETAIL_QUERY requests. No OAuth fields.

import { z } from 'zod';

const AnilistTitleSchema = z.object({
	romaji: z.string().nullable().optional(),
	english: z.string().nullable().optional()
});

const AnilistCoverSchema = z
	.object({
		large: z.string().nullable().optional(),
		medium: z.string().nullable().optional()
	})
	.nullable()
	.optional();

const NameSchema = z.object({ full: z.string().nullable().optional() }).nullable().optional();

// `MediaTag` exposes `isAdult`, not `isGeneral` (querying it 400s).
export const AnilistTagSchema = z.object({
	name: z.string(),
	rank: z.number().nullable().optional(),
	isAdult: z.boolean().nullable().optional()
});

const AnilistCharacterEdgeSchema = z.object({
	role: z.string().nullable().optional(),
	node: z.object({
		id: z.number(),
		name: NameSchema,
		image: z.object({ large: z.string().nullable().optional() }).nullable().optional(),
		favourites: z.number().nullable().optional()
	}),
	voiceActors: z
		.array(
			z.object({
				id: z.number().nullable().optional(),
				name: NameSchema,
				languageV2: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional()
});

export const AnilistMediaSchema = z.object({
	id: z.number(),
	idMal: z.number().nullable().optional(),
	tags: z.array(AnilistTagSchema).nullable().optional(),
	nextAiringEpisode: z
		.object({
			episode: z.number(),
			airingAt: z.number()
		})
		.nullable()
		.optional(),
	trailer: z
		.object({ id: z.string().nullable().optional(), site: z.string().nullable().optional() })
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
							idMal: z.number().nullable().optional(),
							title: AnilistTitleSchema,
							coverImage: AnilistCoverSchema
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
					body: z.string().nullable().optional(),
					user: z.object({ name: z.string().nullable().optional() }).nullable().optional()
				})
			)
		})
		.nullable()
		.optional()
});

export type AnilistMedia = z.infer<typeof AnilistMediaSchema>;
