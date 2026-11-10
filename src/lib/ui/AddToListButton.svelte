<script lang="ts">
	import type { DisplayAnime } from '#lib/utils/types.js';
	import { userListStore } from '#lib/stores/userlist.svelte.js';
	import { authStore } from '#lib/auth/auth.svelte.js';
	import { toast } from 'svelte-sonner';
	import { Plus } from 'lucide-svelte';

	// Dashed "add to Plan to Watch" button shared by the search cards and rows.
	let { anime, class: className = '' }: { anime: DisplayAnime; class?: string } = $props();

	let adding = $state(false);

	async function handleAdd(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!authStore.isAuthenticated) {
			toast.info('Please login to add to your list');
			authStore.login();
			return;
		}
		adding = true;
		const result = await userListStore.addToList(
			anime.malId,
			'plan_to_watch',
			anime.titleEnglish,
			anime.title,
			anime.mainPicture,
			anime.genres
		);
		adding = false;
		if (result.ok) {
			toast.success(`Added ${anime.title} to Plan to Watch`);
		} else {
			toast.error(result.error.message || 'Failed to add anime');
		}
	}
</script>

<button
	onclick={handleAdd}
	disabled={adding}
	aria-label="Add {anime.title} to Plan to Watch"
	class="relative z-[2] flex items-center justify-center gap-1 rounded-md border border-dashed border-primary/40 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 {className}"
>
	{#if adding}
		<div
			class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
		<span>Adding...</span>
	{:else}
		<Plus size={12} />
		<span>Add to List</span>
	{/if}
</button>
