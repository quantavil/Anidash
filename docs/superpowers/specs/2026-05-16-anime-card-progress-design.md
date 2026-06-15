# AnimeCard Progress Indicator Redesign

## Goal

Redesign the progress indicator in the `AnimeCard` component to save vertical space and improve aesthetics by replacing the standard progress bar with a thin gradient line below the thumbnail.

## Requirements

### 1. Progress Line

- **Location**: The bottom edge of the thumbnail image container (replacing the existing `border-b`).
- **Visuals**: A 2px high gradient line that fills from left to right based on the completion percentage.
- **Colors**: A gradient from the primary theme color (purple) to a secondary/accent color (e.g., cyan or a lighter purple) to give it "life."
- **Fallback**: If the anime is completed, the line should be a solid success color (green).

### 2. Numerical Progress

- **Location**: Move the numerical "x/y" progress to a subtle overlay at the bottom-left of the thumbnail, near the Dub overlay (if present).
- **Styling**: Small, semi-transparent "glass" background (`backdrop-blur-md`) with white/muted text to keep it readable but unobtrusive.
- **Format**: `watched/total` (e.g., `12/24`). If total is unknown, show `12/?`.

### 3. Space Optimization

- Remove the `EpisodeCounter` component from the bottom info section of the `AnimeCard`.
- This will allow the title and metadata to breathe more or slightly reduce the overall card height.

### 4. Interactive Controls (Optional/Simplified)

- The large `+/-` buttons will be removed from the main card to keep it clean.
- Quick-incrementing progress should be moved to the Details page or a long-press/context menu if needed later (out of scope for this change).

## Technical Approach

- **CSS**: Use a `::after` pseudo-element on the image container or an absolute-positioned `div` at the bottom.
- **Gradient**: `linear-gradient(90deg, var(--color-primary), var(--color-accent))`.
- **Transitions**: Smooth `width` transition (300ms ease-spring) to match the app's existing animations.

## Files Affected

- `src/lib/ui/AnimeCard.svelte`
- `src/lib/ui/EpisodeCounter.svelte` (no longer used in card, but will stay for details page)
