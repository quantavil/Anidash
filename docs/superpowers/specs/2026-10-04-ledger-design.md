# AniDash ledger design

The earlier journal redesign (warm charcoal, serif headings, coral accent, featured card, planned shelf, decorative copy) was rejected as a generic "cozy editorial" look that used the desktop width poorly. This direction replaces it. No API, auth, cache, or AniList contract changes.

**Principle.** AniDash is a tool used daily on a list of hundreds of titles. Speed of the one-tap action, scannable density and honest data come first; ornament is removed rather than added. Artwork is the main source of colour.

**Language.** Neutral graphite surfaces (`#0c0d0f` to `#25272d`), one lime accent (`#c7f464`) reserved for the primary action, active navigation and progress, with dark ink on top of it. Status hues (lime, blue, teal, amber, rose) identify list status and never decorate. Ratings use amber. Geist for UI, Bricolage Grotesque for page titles and large numerals; tabular numerals for every counter. Hairlines instead of nested cards; flat panels; no gradients, glow or shadows. Motion is limited to press feedback, progress width and dialog entry; all of it honours reduced motion.

**Shell.** At 1100px and wider: a 232px sidebar (brand, command palette trigger, navigation with the watching count, sync state, preferences, connect). From 768 to 1099px: a 72px icon rail. Below 768px: a compact sticky top bar (search, sync, preferences) and a safe-area-aware bottom tab bar. Preferences are a native `<dialog>`, a bottom sheet on phones. Cmd/Ctrl-K opens the palette.

**My List.** Title, one summary line (titles, episodes ahead), status tabs with status dots, search, sort and a view switch. The ledger is container-query driven: on phones it stacks poster, identity, chips and a full-width stepper; from 560px identity sits left and the stepper right; from 880px it is a table row with a sticky sortable header (Title, Progress, MAL, Yours, Status, Updated). The stepper is the one-tap surface: minus, a count with a segmented bar, and an accent plus. MAL community rating and personal score are always labelled separately. Status and score are native selects styled as chips (36px visible, 44px hit area). Grid view uses the shared poster grid with the stepper and chips under each poster; chips stack in narrow cards so labels never truncate.

**Discovery.** Browse and Seasonal share one poster card: a rating badge and a 44px add button sit on the artwork, and an in-list state replaces the button. Filters are scrollable chip rows with an edge fade. Roulette and Seasonal Surprise are two compact actions. Seasonal labels long-running shows "Since YYYY" instead of their original season. Seasonal and the list load more pages as the end of the scroll approaches.

**Stats.** A four-up numeric strip, a proportional status bar with a linked legend, a score histogram, top genres as bars, a continue-watching shelf, and a recent-updates table.

**Detail.** Sticky poster, display-type title, a single facts line, genres, and one controls panel (status, stepper, rating, remove with confirmation).

**Validation.** Svelte check, the full Vitest suite, the Cloudflare build, lint, the isolated production-browser journal and offline-shell checks, and screenshots at 320, 390, 820 and 1440px with an overflow assertion at each.
