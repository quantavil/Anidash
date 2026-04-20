# Anime Recommender Design

## Goal
Provide a feature that helps users decide what to watch next by recommending anime either from their "Plan to Watch" list or from the current season's lineup.

## Approaches Considered

**Approach A: "Smart Pick" Widget on the Home Page**
A new section on the root `/` page (or above the anime grid) that surfaces a "What to Watch Next" card. It randomly alternates between:
- **PTW Roulette:** A highly-rated or random anime from the user's local "Plan to Watch" list.
- **Seasonal Highlight:** A popular anime from the current season.

**Approach B: Interactive "Suggest Anime" Modal (Recommended)**
A magic wand button that opens a focused modal with a single recommendation, letting the user "Reroll" if they don't like it.
- **Location:** A new "🪄 Suggest" button in the main navigation or TabBar.
- **Logic:** The modal has a toggle for the source ("Plan to Watch" vs "Current Season").
  - If "Plan to Watch" is selected, it randomly picks an item from the user's PTW list.
  - If "Current Season" is selected, it fetches the current season from the MAL API and picks one of the top most popular ones.
  - A "Reroll" button allows cycling to another suggestion.
- **Why this?** It's focused, fun, and doesn't clutter the main list views.

**Approach C: Dedicated `/discover` Page**
Create a new route (`/discover`) that provides multiple rows of recommendations (e.g., "From your PTW", "Top Seasonal", "Because you liked [X]"). This is more complex but scalable.

## Recommended Design Details (Approach B)

1. **Component:** Create `src/lib/ui/RecommenderModal.svelte`.
2. **Trigger:** Add a prominent button (e.g., a "Sparkles" icon) to `src/lib/ui/FluidNav.svelte` (or `TabBar.svelte`).
3. **Data Sources:** 
   - *PTW*: Use Svelte 5 derived state to pick from `userListStore.planToWatch`.
   - *Seasonal*: Use `getSeasonal()` and `getCurrentSeason()` from existing helpers, caching the result locally while the modal is open.
4. **UI:** Present the anime using the existing `AnimeCard` or a larger `SearchResultCard` style, with a big "Reroll" button below it.

