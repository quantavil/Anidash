# AniDash watch journal

The user approved the charcoal/ivory/vermilion watch-journal mockup and explicitly requested implementation, more depth, visible ratings, and ergonomic phone/tablet/desktop layouts. Build real UI with existing data; remove the generated mockup. No fake content, new enrichment calls, or API/auth/cache contract changes.

Palette: ink #181917, raised #222420, inset #121410, ivory #f1eee5, stone #b4b5aa, coral #f08b73, gold #e6c578. Retain Outfit for readable UI; use the local Georgia serif stack for editorial headings without another font download. Restrained gradients and inset edge lighting establish depth; artwork remains the main source of colour. No continuous decorative motion or fullscreen blur.

My List defaults to Watching and journal view. First watching entry is featured only without search; remaining entries are compact rows. Grid is an optional URL-backed view. MAL community rating and editable personal rating always have distinct labels. Native 0–10 score select avoids half-star ambiguity. Episode controls call existing store mutations, including completion prompt and PTW transition. Unknown episode totals show unknown, never fake progress. Preserve ordering semantics.

Desktop: integrated top navigation, main journal and planned-list shelf. Tablet: generous feature and rows, shelf flows below. Phone: small feature artwork, full-width episode action, stacked row controls, fixed safe-area-aware bottom navigation. All primary controls >=44px; 320px layouts and long titles must not overflow. Page heading sizes are fluid. Public welcome replaces automatic login modal. Startup keeps navigation visible while private data initializes.

Validation: Svelte check, full Vitest suite, Cloudflare build, browser screenshots at 390/820/1440px plus 320px overflow check, score/episode/status/search/view interactions with seeded isolated browser data, offline reloads of /, /browse, /stats against a production server. No claimed performance score without measurements.
