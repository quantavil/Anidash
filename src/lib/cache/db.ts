// ─── IndexedDB schema, connection, migrations ───
// Single source of truth for all IDB access patterns.

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { logger } from '$lib/utils/logger';

// ─── Types ───

export interface BaseAnimeRecord {
	malId: number;
	title: string;
	titleEnglish: string | null;
	mainPicture: { medium: string | null; large: string | null } | null;
	mean: number | null;
	numEpisodes: number;
	genres: { id: number; name: string }[];
	studios: { id: number; name: string }[];
	startSeason: { year: number | null; season: string | null } | null;
	mediaType: string;
	animeStatus: string;
	numListUsers: number;
	numScoringUsers: number;
}

export interface AnimeRecord extends BaseAnimeRecord {
	synopsis: string | null;
	broadcast: { day_of_the_week: string; start_time?: string } | null;
	relatedAnime: RelatedAnimeRecord[] | null;
	recommendations: RecommendationRecord[] | null;
	isDetail: boolean; // true = full detail fetched, false = lean list data
	cachedAt: number; // epoch ms
}

export interface RelatedAnimeRecord {
	id: number;
	title: string;
	mainPicture: { medium: string | null; large: string | null } | null;
	mediaType: string | null;
	relationType: string;
}

export interface RecommendationRecord {
	id: number;
	title: string;
	mainPicture: { medium: string | null; large: string | null } | null;
	mean: number | null;
	numRecommendations: number;
}

export type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface UserListRecord extends BaseAnimeRecord {
	// User status
	status: AnimeStatus;
	score: number;
	numWatchedEpisodes: number;
	isRewatching: boolean;
	updatedAt: string | null;
	startDate: string | null;
	finishDate: string | null;
}

export interface MetaRecord {
	key: string;
	value: unknown;
	updatedAt: number;
}

export interface SyncQueueRecord {
	malId: number;
	payload: Record<string, unknown>;
	timestamp: number; // epoch ms
}

// ─── DB Schema ───

interface AniDashDB extends DBSchema {
	anime: {
		key: number; // malId
		value: AnimeRecord;
		indexes: {
			'by-cachedAt': number;
			'by-mediaType': string;
		};
	};
	userList: {
		key: number; // malId
		value: UserListRecord;
		indexes: {
			'by-status': string;
			'by-updatedAt': string;
		};
	};
	meta: {
		key: string;
		value: MetaRecord;
	};
	syncQueue: {
		key: number; // malId
		value: SyncQueueRecord;
		indexes: {
			'by-timestamp': number;
		};
	};
}

// ─── Connection ───

const DB_NAME = 'anidash';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AniDashDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AniDashDB>> {
	if (!dbPromise) {
		dbPromise = openDB<AniDashDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				// Version 1: initial schema
				if (oldVersion < 1) {
					// Anime store
					const animeStore = db.createObjectStore('anime', { keyPath: 'malId' });
					animeStore.createIndex('by-cachedAt', 'cachedAt');
					animeStore.createIndex('by-mediaType', 'mediaType');

					// User list store
					const listStore = db.createObjectStore('userList', { keyPath: 'malId' });
					listStore.createIndex('by-status', 'status');
					listStore.createIndex('by-updatedAt', 'updatedAt');

					// Meta store
					db.createObjectStore('meta', { keyPath: 'key' });
				}

				if (oldVersion < 2) {
					// Offline Sync Queue store
					const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'malId' });
					syncQueueStore.createIndex('by-timestamp', 'timestamp');
				}
			},
			blocked() {
				logger.warn('AniDash DB upgrade blocked — close other tabs');
			},
			blocking() {
				logger.warn('AniDash DB blocking — this tab is blocking an upgrade');
			},
			terminated() {
				console.error('AniDash DB connection terminated unexpectedly');
				dbPromise = null;
			}
		});
	}
	return dbPromise;
}

/** Close the DB connection (useful for logout cleanup) */
export async function closeDB(): Promise<void> {
	if (dbPromise) {
		const db = await dbPromise;
		db.close();
		dbPromise = null;
	}
}

/** Delete the entire database (for logout or reset) */
export async function deleteDB(): Promise<void> {
	await closeDB();
	dbPromise = null;
	await indexedDB.deleteDatabase(DB_NAME);
}
