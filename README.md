# AniDash

A personal anime watch journal connected to MyAnimeList. Track episodes, keep your own ratings, and find your next series in a responsive interface built around your actual collection. Current release: **0.1.3**.

## The watch journal

- **Journal and poster views.** The default journal pairs a featured watching entry with compact progress rows and a Plan to Watch shelf. Switch to the poster grid while keeping your filters and sort order.
- **Ratings you can read and edit.** MAL community ratings and your personal scores have separate labels. Update your score, status, or episode count directly from the list.
- **Comfortable on every screen.** Warm charcoal surfaces, ivory editorial headings, coral actions, and gold ratings give the interface depth. Locally hosted Outfit, visible keyboard focus, and large touch controls support desktop, tablet, and phone use.
- **Local edits and queued sync.** Changes update immediately in IndexedDB and queue for MAL. Starting a planned title moves it to Watching. Last Updated order changes after MAL acknowledges the edit.
- **Discovery and details.** Search MAL, explore popular and seasonal anime, identify English dubs, and view characters, recommendations, review excerpts, tags, trailers, and airing information where available.
- **Personal statistics and preferences.** Explore score and format distributions, and choose English or Romaji titles.

The service worker keeps the app shell available after an online visit. Previously cached list data remains usable offline and edits can wait for reconnection. New searches and uncached details require a connection; cross-origin artwork is not precached by the service worker.

## Data and architecture

AniDash uses Svelte 5 runes, SvelteKit 2, Tailwind CSS v4, IndexedDB, Zod, and the Cloudflare adapter. The frontend runs as a client-rendered app with same-origin server routes for MAL authentication and API access.

**MyAnimeList API v2** supplies authentication, list sync, search, rankings, seasonal results, and core anime details. **AniList GraphQL** is the sole detail enrichment source: one validated, rate-limited `Media(idMal)` request per anime, with in-flight deduplication and a seven-day cache. Missing matches stay empty; there is no title-search fallback or Jikan integration.

Popular and seasonal results use separate 24-hour stale-while-revalidate caches. The MAL-Dubs dataset has a 24-hour cache. Review excerpts and synopses render as plain text; trailer embeds accept validated YouTube IDs only.

## Run locally

Use the Node version in [.node-version](.node-version), currently **24.15.0**.

```sh
npm ci
```

Create a web application in [MyAnimeList API settings](https://myanimelist.net/apiconfig). Register `http://localhost:5173/auth/callback` and your production callback URL. AniDash sends the current origin plus `/auth/callback`, so localhost, `127.0.0.1`, and preview domains each need their exact callback registered if used for login.

Set both public client IDs in `wrangler.toml` to the same value:

```toml
[vars]
VITE_MAL_CLIENT_ID = "your_mal_client_id"
MAL_CLIENT_ID = "your_mal_client_id"
```

For the local Vite frontend, create `.env`:

```dotenv
VITE_MAL_CLIENT_ID=your_mal_client_id
```

Create `.dev.vars` for the local Cloudflare server secret:

```dotenv
MAL_CLIENT_SECRET=your_mal_client_secret
```

Both local files are gitignored. Server credentials come from `platform.env` through the Cloudflare platform proxy. Restart the dev server after changing `.dev.vars`.

```sh
npm run dev
```

Open [localhost:5173](http://localhost:5173).

## Verification

```sh
VITE_MAL_CLIENT_ID=dummy npm run check
VITE_MAL_CLIENT_ID=dummy npm test
VITE_MAL_CLIENT_ID=dummy npm run build
npm run lint
```

The dummy client ID supports build and test verification; use your registered ID for actual login. Vitest covers API, authentication, cache, sync, and utility behavior. [Browser checks](tests/browser/README.md) exercise ratings, episode edits, status changes, responsive layouts at 320/390/820/1440px, and offline navigation to `/`, `/browse`, and `/stats` in isolated Chromium contexts.

See [AGENTS.md](AGENTS.md) for the engineering contract and [the design specification](docs/superpowers/specs/2026-10-04-watch-journal-design.md) for the watch journal direction. Deployed PageSpeed improvements have not yet been measured.

## Deploy to Cloudflare Pages

Connect the repository with these settings:

| Setting          | Value                    |
| ---------------- | ------------------------ |
| Framework preset | SvelteKit                |
| Build command    | `npm run build`          |
| Output directory | `.svelte-kit/cloudflare` |
| Node version     | From `.node-version`     |

`wrangler.toml` supplies the matching public client IDs and Cloudflare compatibility settings. Add `MAL_CLIENT_SECRET` as a **Secret** in Cloudflare for each environment that needs login. Never commit it or expose it through a `VITE_` variable. Register each deployment's callback URL in MAL before using login there.

Pushes to `main` trigger the connected Cloudflare Pages deployment.

## License

[GNU General Public License v3.0 or later](LICENSE).
