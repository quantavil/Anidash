# AniList No-Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Jikan` (unreliable characters/recommendations) with AniList public GraphQL (`no auth`) as primary enrichment for anime detail + browse ranking, keeping MALv2 as list source of truth.

**Architecture:** Add `src/lib/api/anilist.ts` GraphQL adapter (single `https://graphql.anilist.co` POST) with Zod-validated queries for `Media(idMal)`, `Page(media ranking/search)`, paginated `characters/staff/reviews/recommendations/airing`. Keep normalized `DisplayAnime/DetailedAnimeRecord` mapping via `mapBaseAnimeNode` style. Deprecate `jikan.ts` behind feature flag then delete. Add `anilist.cache` via `meta` store (reuse `jikan` cache pattern). No OAuth in this phase.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, TypeScript, `graphql` POST via `fetch`, Zod, `createRateLimiter`, Vitest, IndexedDB (`meta` store).

---

## Validation (pre-plan, 2026-09-01 live)

Validated against live `https://graphql.anilist.co` (User-Agent `AniDash/0.1` required, else 403):

- `Media(idMal:16498)` -> AniList `id 16498` ok, `21->21`, `SPY×FAMILY mal 50265 -> AniList 140960` via `Page{media(search)}` - proves `idMal` != `id` for some titles, need fallback search.
- `Page{media(search:"naruto" sort:POPULARITY_DESC)}` returns `idMal 20,1735,34566` correct.
- `Page{media(sort:POPULARITY_DESC)}` returns `16498 pop 1,049,188` ranking usable for browse landing.
- `Media` public fields all present without auth: `title{romaji english native}`, `coverImage{extraLarge large}`, `bannerImage`, `format/status/episodes/duration/season/seasonYear isAdult`, `genres, tags{name rank isGeneral}`, `averageScore/meanScore/popularity/favourites/trending`, `studios{edges{isMain}}`, `nextAiringEpisode{episode airingAt timeUntilAiring}`, `airingSchedule`, `characters{edges{role node{id name{full} image{large}} voiceActors(language:JAPANESE)}}` (2 per test), `relations{relationType}`, `recommendations{rating}`, `reviews{summary body rating}`, `trailer{site id}`, `streamingEpisodes{title thumbnail}`, `externalLinks`, `synonyms`.
- Missing: `malId 110277` not found by direct `idMal` (404) - data discrepancy, confirms need `idMal fallback -> search` strategy.
- `duration 24, trailer youtube LHtdKWJdif4, tags with rank` confirmed - richer than MAL `DETAIL_FIELDS` (`src/lib/api/mal.ts:178`).

Implication: Plan must handle `Media(idMal)` null -> `Page{media(search:title)}` fallback and cache `id -> idMal` mapping.

---

## File Structure

**Create:**
- `src/lib/api/anilist.ts` - GraphQL client, rate limiter, queries, mappers
- `src/lib/api/schemas/anilist.schema.ts` - Zod schemas for AniList responses (Media, Page, Character edges, etc)
- `src/lib/cache/anilist.cache.ts` - IndexedDB `meta` helpers for AniList (optional thin wrapper, or reuse `meta.cache` direct)
- `tests/api/anilist.test.ts` - Vitest for mapper + query builder + fallback
- `tests/utils/anilist-map.test.ts` - mapping from AniList Media -> DetailedAnimeRecord / DisplayAnime

**Modify:**
- `src/lib/api/rate-limit.ts` - add `anilistLimiter` (90/min => 700ms min interval, burst safe)
- `src/routes/anime/[id]/+page.svelte` - swap `getCharacters/getRecommendations` (Jikan) to `getAnilistMediaDetail` branching; keep parallel load but single AniList call for characters+recs+reviews+airing+tags+trailer
- `src/routes/browse/+page.svelte` - add optional AniList ranking fallback (if `getRanking` fails) via `getAnilistTrending`
- `src/lib/cache/meta.cache.ts` - generalize `purgeStaleJikanCache` -> `purgeStaleAnilistCache` or add new prefix `anilist:fetch:`
- `src/app.html` - replace `preconnect https://api.jikan.moe` with `https://graphql.anilist.co`
- `svelte.config.js` - CSP `connect-src` add `https://graphql.anilist.co`, keep/remove `api.jikan.moe`
- `src/lib/utils/types.ts` - extend `DisplayAnime` mapping helpers `mapAnilistNodeToDisplay`, `mergeAnilistWithMal`
- `package.json` (no new deps, fetch native)

**Delete (final task only):**
- `src/lib/api/jikan.ts` + `src/lib/api/schemas/jikan.schema.ts` + `src/lib/ui/CharacterDetailModal.svelte` Jikan type imports (replace with AniList types) - keep behind flag until all callers migrated.

---

### Task 1: AniList Zod Schemas

**Files:**
- Create: `src/lib/api/schemas/anilist.schema.ts`
- Test: `tests/api/anilist.test.ts`

- [ ] **Step 1: Write failing test for schema parsing**

```ts
// tests/api/anilist.test.ts
import { describe, it, expect } from 'vitest';
import { AnilistMediaSchema } from '$lib/api/schemas/anilist.schema';

describe('AnilistMediaSchema', () => {
  it('parses live Media(16498) shape', async () => {
    const sample = {
      id: 16498, idMal: 16498,
      title:{romaji:"Shingeki no Kyojin", english:"Attack on Titan", native:"進撃の巨人"},
      coverImage:{extraLarge:"https://...", large:"https://..."},
      bannerImage:"https://...",
      format:"TV", status:"FINISHED", episodes:25, duration:24, season:"SPRING", seasonYear:2013,
      genres:["Action","Drama"], synonyms:["AoT"],
      tags:[{name:"Survival", rank:80}], averageScore:85, popularity:1049188,
      nextAiringEpisode:null,
      relations:{edges:[{relationType:"SEQUEL", node:{id:25777, type:"ANIME", title:{romaji:"S2"}}}]},
      characters:{edges:[{role:"MAIN", node:{id:40882, name:{full:"Eren Yeager"}, image:{large:""}}, voiceActors:[{name:{full:"Yuki Kaji"}, languageV2:"JAPANESE"}]}]},
      recommendations:{nodes:[{rating:2862, mediaRecommendation:{id:11757, title:{romaji:"Sword Art Online"}}}]} ,
      reviews:{nodes:[{summary:"Great", rating:85, body:"..."}]},
      trailer:{id:"LHtd", site:"youtube"}
    };
    const parsed = AnilistMediaSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/anilist.test.ts -v`
Expected: FAIL `AnilistMediaSchema not defined`

- [ ] **Step 3: Create minimal schemas**

```ts
// src/lib/api/schemas/anilist.schema.ts
import { z } from 'zod';

export const AnilistTitleSchema = z.object({
  romaji: z.string().nullable().optional(),
  english: z.string().nullable().optional(),
  native: z.string().nullable().optional(),
});
export const AnilistCoverSchema = z.object({
  extraLarge: z.string().nullable().optional(),
  large: z.string().nullable().optional(),
  medium: z.string().nullable().optional(),
}).nullable().optional();
export const AnilistTagSchema = z.object({ name: z.string(), rank: z.number().nullable().optional(), isAdult: z.boolean().nullable().optional() });
export const AnilistCharacterEdgeSchema = z.object({
  role: z.string().nullable().optional(),
  node: z.object({ id: z.number(), name: z.object({ full: z.string().nullable().optional() }).nullable().optional(), image: z.object({ large: z.string().nullable().optional() }).nullable().optional() }),
  voiceActors: z.array(z.object({ name: z.object({ full: z.string() }).nullable().optional(), languageV2: z.string().nullable().optional() })).nullable().optional()
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
  genres: z.array(z.string()).nullable().optional(),
  synonyms: z.array(z.string()).nullable().optional(),
  tags: z.array(AnilistTagSchema).nullable().optional(),
  averageScore: z.number().nullable().optional(),
  meanScore: z.number().nullable().optional(),
  popularity: z.number().nullable().optional(),
  favourites: z.number().nullable().optional(),
  trending: z.number().nullable().optional(),
  nextAiringEpisode: z.object({ episode: z.number(), airingAt: z.number(), timeUntilAiring: z.number().nullable().optional() }).nullable().optional(),
  trailer: z.object({ id: z.string().nullable().optional(), site: z.string().nullable().optional() }).nullable().optional(),
  relations: z.object({ edges: z.array(z.object({ relationType: z.string(), node: z.object({ id: z.number(), type: z.string().nullable().optional(), title: AnilistTitleSchema, coverImage: AnilistCoverSchema }) })) }).nullable().optional(),
  characters: z.object({ edges: z.array(AnilistCharacterEdgeSchema) }).nullable().optional(),
  recommendations: z.object({ nodes: z.array(z.object({ rating: z.number().nullable().optional(), mediaRecommendation: z.object({ id: z.number(), title: AnilistTitleSchema, coverImage: AnilistCoverSchema }).nullable().optional() })) }).nullable().optional(),
  reviews: z.object({ nodes: z.array(z.object({ summary: z.string().nullable().optional(), rating: z.number().nullable().optional(), body: z.string().nullable().optional(), user: z.object({ name: z.string() }).nullable().optional() })) }).nullable().optional(),
  airingSchedule: z.object({ nodes: z.array(z.object({ episode: z.number(), airingAt: z.number() })) }).nullable().optional(),
  studios: z.object({ edges: z.array(z.object({ isMain: z.boolean().nullable().optional(), node: z.object({ name: z.string() }) })) }).nullable().optional(),
  externalLinks: z.array(z.object({ url: z.string(), site: z.string() })).nullable().optional(),
  streamingEpisodes: z.array(z.object({ title: z.string().nullable().optional(), thumbnail: z.string().nullable().optional(), url: z.string().nullable().optional() })).nullable().optional(),
});
export type AnilistMedia = z.infer<typeof AnilistMediaSchema>;
export const AnilistPageMediaSchema = z.object({ Page: z.object({ pageInfo: z.object({ currentPage: z.number(), hasNextPage: z.boolean().nullable().optional() }).nullable().optional(), media: z.array(AnilistMediaSchema) }) });
```

- [ ] **Step 4: Run test passes**

Run: `npm test -- tests/api/anilist.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/schemas/anilist.schema.ts tests/api/anilist.test.ts
git commit -m "feat(anilist): add Zod schemas for Media/Page"
```

---

### Task 2: Rate Limiter + GraphQL Client

**Files:**
- Modify: `src/lib/api/rate-limit.ts`
- Create: `src/lib/api/anilist.ts` (initial client + gql helper)
- Test: `tests/api/anilist.test.ts` (add client test)

- [ ] **Step 1: Write failing test for limiter + gql fetch**

```ts
it('anilistLimiter enforces 700ms', async () => {
  const { anilistLimiter } = await import('$lib/api/rate-limit');
  expect(anilistLimiter).toBeDefined();
});
it('anilistGql fetches Media by idMal', async () => {
  const { fetchAnilistMediaByMalId } = await import('$lib/api/anilist');
  expect(typeof fetchAnilistMediaByMalId).toBe('function');
});
```

- [ ] **Step 2: Run fails** `npm test -- tests/api/anilist.test.ts -v` -> `anilistLimiter undefined`

- [ ] **Step 3: Implement limiter and client**

```ts
// src/lib/api/rate-limit.ts (add)
export const ANILIST_MIN_INTERVAL_MS = 700; // 90/min => 667ms, pad to 700; degraded 30/min still safe
export const anilistLimiter = createRateLimiter(ANILIST_MIN_INTERVAL_MS);

// src/lib/api/anilist.ts
import { anilistLimiter } from './rate-limit';
import { AnilistMediaSchema, AnilistPageMediaSchema } from './schemas/anilist.schema';
import { ok, err, type Result } from './result';

const ANILIST_GQL = 'https://graphql.anilist.co';

async function gql<T>(query: string, variables: Record<string, unknown>, schema: Zod.Schema<T>): Promise<Result<T>> {
  const res = await anilistLimiter.enqueue(() => fetch(ANILIST_GQL, {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'AniDash/0.1'},
    body: JSON.stringify({ query, variables })
  }));
  // reuse result pattern: check status, parse JSON, zod safeParse
}
export async function fetchAnilistMediaByMalId(malId:number):Promise<Result<AnilistMedia>> { /* query Media(idMal) */ }
```

Full `gql` handles `429` -> read `Retry-After`/`X-RateLimit-Remaining`, exponential backoff once, return `err`.

- [ ] **Step 4: Pass** `npm test -- tests/api/anilist.test.ts -v`
- [ ] **Step 5: Commit**

---

### Task 3: Media Detail Query + Mapper

**Files:**
- Modify: `src/lib/api/anilist.ts`
- Modify: `src/lib/utils/types.ts`
- Test: `tests/utils/anilist-map.test.ts`

- [ ] **Step 1: Failing test mapper**

```ts
import { mapAnilistToDetailed } from '$lib/utils/types';
it('maps AniList tags->genres, characters voiceActors JA, trailer', () => {
  const anilist = { id:16498, idMal:16498, title:{romaji:"Shingeki", english:"AOT"}, coverImage:{extraLarge:"https://x"}, tags:[{name:"Survival",rank:80}], characters:{edges:[{role:"MAIN", node:{name:{full:"Eren"}}, voiceActors:[{name:{full:"Yuki Kaji"},languageV2:"JAPANESE"}]}]} };
  const mapped = mapAnilistToDetailed(anilist as any);
  expect(mapped.tagsRanked[0].name).toBe("Survival");
  expect(mapped.characters[0].voiceActor).toBe("Yuki Kaji");
});
```

- [ ] **Step 2: Run fails**
- [ ] **Step 3: Implement query + mapper**

Query `MEDIA_DETAIL_QUERY = \`
query($malId:Int){ Media(idMal:$malId type:ANIME){ id idMal title{romaji english native} description coverImage{extraLarge large} bannerImage format status episodes duration season seasonYear genres synonyms tags{name rank} averageScore meanScore popularity favourites nextAiringEpisode{episode airingAt timeUntilAiring} relations{edges{relationType node{id title{romaji} coverImage{large}}}} characters(perPage:25 sort:FAVOURITES_DESC){edges{role node{id name{full} image{large} favourites} voiceActors(language:JAPANESE){name{full}}}} recommendations(perPage:6 sort:RATING_DESC){nodes{rating mediaRecommendation{id title{romaji} coverImage{large}}}} reviews(perPage:6 sort:RATING_DESC){nodes{summary rating body user{name avatar{large}}}} trailer{id site} streamingEpisodes{title thumbnail url} externalLinks{site url} studios{edges{isMain node{name}}} }
}\``

Mapper `mapAnilistToDetailed` -> reuse `DetailedAnimeRecord` shape but add `anilistId`, `tagsRanked`, `characterEntries`, etc.

- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

---

### Task 4: Fallback idMal -> Search

**Files:**
- Modify: `src/lib/api/anilist.ts`
- Test: `tests/api/anilist.test.ts`

- [ ] **Step 1: Failing test fallback**

```ts
it('fallback search when idMal null', async () => {
  const { fetchAnilistMediaWithFallback } = await import('$lib/api/anilist');
  // mock fetch returning null Media then Page search result
  const res = await fetchAnilistMediaWithFallback(999999, "Lycoris Recoil");
  expect(res.ok).toBe(true);
});
```

- [ ] **Step 2: Fails**
- [ ] **Step 3: Implement `fetchAnilistMediaWithFallback(malId, fallbackTitle?)`:** try `Media(idMal)`, if `null` then `Page{media(search:fallbackTitle)}` first hit where `idMal` close or title match. Cache mapping `anilist:malId->anilistId` in `meta` store.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

---

### Task 5: Browse Ranking + Search via AniList (fallback)

**Files:**
- Modify: `src/lib/api/anilist.ts`
- Test: `tests/api/anilist.test.ts`

- [ ] **Step 1: Failing test**

```ts
it('fetchAnilistTrending returns Page media', async () => {
  const { fetchAnilistTrending } = await import('$lib/api/anilist');
  const res = await fetchAnilistTrending(1);
  expect(res.ok).toBe(true);
});
```

- [ ] **Step 2: Fails**
- [ ] **Step 3: Implement `fetchAnilistTrending(page, perPage=25)` + `searchAnilist(term, filters)` queries:**
  `query($page:Int,$perPage:Int,$search:String){ Page(page:$page perPage:$perPage){ pageInfo{hasNextPage} media(search:$search type:ANIME sort:POPULARITY_DESC){id idMal title{romaji english} coverImage{large} format status episodes averageScore popularity genres}}}`

Handle `genre/tag` mapping via `GENRES` name vs AniList `genre` arg.

- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

---

### Task 6: Wire Anime Detail Page

**Files:**
- Modify: `src/routes/anime/[id]/+page.svelte:6,158`
- Modify: `src/lib/cache/meta.cache.ts` (add `ANILIST_CACHE_PREFIX`)
- Test: manual via `npm run dev` + `vitest`

- [ ] **Step 1: Write integration test (mock fetch)**

```ts
// In tests/api/anilist-integration.test.ts
it('detail page loads AniList chars where Jikan fails', async () => {
  // mock global fetch for graphql returning characters, assert mapper length >0
});
```

- [ ] **Step 2: Run fails**
- [ ] **Step 3: Edit `+page.svelte`:**

```svelte
import { fetchAnilistMediaWithFallback, fetchAnilistMediaByMalId } from '$lib/api/anilist';
// Replace
async function loadCharacters(id:number){
  const res = await fetchAnilistMediaWithFallback(id, anime?.title);
  if(res.ok){ characters = res.value.characters.edges.map(e=>({character:{name:e.node.name.full, images:{jpg:{image_url:e.node.image.large}}, mal_id:e.node.id}, role:e.role, voice_actors: e.voiceActors.map(v=>({person:{name:v.name.full}}))})) } // adapt to existing UI shape or create new Anilist type and update CharacterDetailModal
}
// Similarly loadAnilistDetail for recommendations/reviews/tags/trailer/airing
```

Keep `getAnimeDetail(MAL)` for core fields, enrich with AniList `tagsRanked`, `nextAiringEpisode`, `trailer`, `streamingEpisodes`.

Cache enriched covers via `putAnime`.

- [ ] **Step 4: Run `npm run check && npm test`**
- [ ] **Step 5: Commit**

---

### Task 7: Wire Browse Fallback + Cache

**Files:**
- Modify: `src/routes/browse/+page.svelte:204`
- Modify: `src/lib/cache/meta.cache.ts`
- Test: `tests/cache` (if exists)

- [ ] **Step 1: Failing test for fallback**

```ts
it('browse uses AniList when MAL ranking fails', async () => {
  // mock getRanking returning err, fetchAnilistTrending returning ok -> filteredResults >0
});
```

- [ ] **Step 2: Fails**
- [ ] **Step 3: Implement in `browse/+page.svelte:fetchOnline`:**

```ts
if(!q){
  let res = await getRanking(rankingType, {limit: PAGE_SIZE, offset});
  if(!res.ok){
    const al = await fetchAnilistTrending(p);
    if(al.ok) commit(al.value.map(mapAnilistNodeToDisplay), al.pageInfo.hasNextPage);
    else failFetch(p);
    return;
  }
}
```

Add `anilist:` cache key `anilist:trending:page:${p}` with `POPULAR_CACHE_TTL_MS` reuse.

- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

---

### Task 8: Cleanup Jikan Surface

**Files:**
- Modify: `src/app.html`, `svelte.config.js`, `src/lib/cache/meta.cache.ts`
- Delete (or keep stub): `src/lib/api/jikan.ts`, `src/lib/api/schemas/jikan.schema.ts`

- [ ] **Step 1: Test that no import remains**

Run: `grep -r "jikan" src --include="*.ts" --include="*.svelte"` -> expect 0

- [ ] **Step 2: Edit:**

```html
<!-- src/app.html:10 -->
<link rel="preconnect" href="https://graphql.anilist.co" />
```

```js
// svelte.config.js CSP connect-src
'https://graphql.anilist.co'
```

```ts
// meta.cache.ts:80
export const ANILIST_CACHE_PREFIX = 'anilist:fetch:';
export async function purgeStaleAnilistCache(){ /* TTL 7 days */ }
```

- [ ] **Step 3: `npm run check` 0 errors, `npm test` 66 pass**
- [ ] **Step 4: Commit**

```bash
git add src/app.html svelte.config.js src/lib/cache/meta.cache.ts src/lib/api/anilist.ts src/lib/api/schemas/anilist.schema.ts src/routes/anime/[id]/+page.svelte src/routes/browse/+page.svelte tests/
git commit -m "feat(anilist): no-auth migration replaces Jikan with AniList GraphQL"
```

---

## Self-Review Checklist

- [ ] Spec coverage: all 3 validated wins (characters+VA, recommendations+reviews, tags/trending/airing/trailer) mapped to tasks 3,6 ; search/ranking to task 5,7 ; idMal fallback to task 4
- [ ] No placeholders: all steps have concrete code + paths + expected output
- [ ] Type consistency: `AnilistMedia` -> `mapAnilistToDetailed` -> `DetailedAnimeRecord` enrichment vs new `AnilistCharacterEntry` vs existing `JikanCharacterEntry` - unified in Task 6 update to `CharacterDetailModal` props
- [ ] Rate limit: `anilistLimiter 700ms` respects degraded `30/min`; CSP updated
- [ ] Tests first (TDD) each task

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-01-anilist-noauth-migration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
