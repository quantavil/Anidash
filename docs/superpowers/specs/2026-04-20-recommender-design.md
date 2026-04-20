# Anime Recommender Design

## Goal
Provide a feature that helps users decide what to watch next by recommending a random anime either from their "Plan to Watch" list or from the current season's lineup.

## Approach
Instead of the current empty state on the `/browse` page when no search is active, we will show two large, clickable widgets side-by-side (stacking vertically on mobile for PWA compatibility).

### The Widgets
1. **🎲 Random from Plan to Watch:** Picks a random anime the user has saved for later.
2. **🌸 Random from Current Season:** Picks a random popular anime airing right now.

### UI / UX
- **Design:** The widgets will feature a glassmorphism style (blurred background) overlaid on a subtle anime-themed background image or gradient to look premium and "alive."
- **Responsiveness:** Side-by-side on desktop, stacked on mobile. Fully responsive and compatible with the PWA.
- **Behavior:** Clicking either widget calculates the random anime from the chosen source and navigates directly to that anime's detail page (`/anime/[id]`).
- **Navigation:** Standard browser back button behavior will apply (returning the user back to the `/browse` page).

## Implementation Details
1. **Data Sources:** 
   - *PTW*: Use Svelte 5 derived state to pick from `userListStore.planToWatch`.
   - *Seasonal*: Use `getSeasonal()` and `getCurrentSeason()` from existing helpers.
2. **Component:** Create `src/lib/ui/RecommenderWidgets.svelte` containing the two widgets.
3. **Integration:** Update `src/routes/browse/+page.svelte` to conditionally render `RecommenderWidgets` when `!hasSearched` and `!query` and `results.length === 0`.
4. **Styling:** Use Tailwind's `backdrop-blur`, semi-transparent backgrounds, and potentially a subtle Ken Burns effect or gradient for the anime reflection.
