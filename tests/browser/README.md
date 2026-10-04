# Browser verification

These checks use isolated Chromium storage and intercepted requests; they never modify a real account.

Build and serve the production app:

```sh
VITE_MAL_CLIENT_ID=dummy bun run build
VITE_MAL_CLIENT_ID=dummy bun run preview -- --host 127.0.0.1 --port 4173
```

Install Python Playwright in a virtual environment and Chromium, then run:

```sh
python tests/browser/original-ui.py http://127.0.0.1:4173
python tests/browser/inline-layouts.py http://127.0.0.1:4173
python tests/browser/detail-content.py http://127.0.0.1:4173
python tests/browser/offline-shell.py http://127.0.0.1:4173
```

The UI check verifies the retained welcome, original poster/detail screens at 320, 390, 820, and 1440px, filtering, short local searches without a stuck loader, sorting, episode edits, and keyboard rating persistence and clearing, 44px rating targets, compact discovery actions, full-width genre filters, and complete seasonal-picker requests, and the AniList-only recommendation grid with safe external links and a single enrichment request. Screenshots are saved in `/tmp/anidash-restored-checks`. The offline check verifies reloads of `/`, `/browse`, and `/stats` and excludes API/auth/cross-origin resources from the shell cache. Run `check` and `build` sequentially because both generate SvelteKit files.

The detail-content check verifies bounded, keyboard-scrollable tags, all loaded tags being reachable, and complete safe plain-text review expansion/collapse without additional enrichment calls.

The inline-layouts check verifies that prequels/sequels and discovery actions share the same row at all four widths, with equal heights, no overlap, and usable settings targets. The original-ui check also asserts cumulative rating gradients, neutral cells above the selected score, tiny status letters outside artwork, and keyboard status selection in an unclipped mobile popover.
