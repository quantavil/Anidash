# Anime Details Mobile UI Redesign

## Goal
Improve the mobile UI of the Anime Details page to fix title overlapping issues, reduce vertical scrolling, and improve the visual hierarchy of metadata and action buttons.

## Requirements

### 1. Fix Header Overlap
- The Anime title currently bleeds under the sticky mobile header (`FluidNav`) when scrolled, making it illegible.
- **Solution**: Increase the opacity of the mobile header background (e.g., `bg-surface-1` or `bg-surface-1/95`) to prevent text from showing through.

### 2. Compact Metadata Layout
- Currently, metadata (score, users, type, episodes, status, broadcast) takes up 4-5 stacked lines, pushing down important interactive elements.
- **Solution**: Consolidate metadata into a single, horizontally scrolling container (`overflow-x-auto`, `whitespace-nowrap`).
- Use bullet points (`&bull;`) to separate items (e.g., `⭐ 8.0 • 📺 TV • 24 eps • Currently Airing • Spring 2026`).

### 3. Streamlined User List Tracking Card
- The card containing "STATUS", "PROGRESS", and "YOUR SCORE" is currently very large and vertically stacked.
- **Solution**: Convert this to a horizontal flex row on mobile, keeping labels small and above their respective values.

### 4. Horizontal External Links
- The `ExternalSitesRow` action buttons currently wrap to multiple lines.
- **Solution**: Place the external link buttons inside a horizontally scrolling container (`overflow-x-auto`) to keep them on a single line and save vertical space.

## Affected Components
- `src/routes/anime/[id]/+page.svelte`
- `src/lib/ui/FluidNav.svelte` (Header background opacity)
- `src/lib/ui/ExternalSitesRow.svelte` (Container wrapping)
