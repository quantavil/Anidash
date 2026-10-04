<script lang="ts">
	import Dialog from './Dialog.svelte';
	import ScoreInput from './ScoreInput.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	const target = $derived(userListStore.ratingTargetId);
	const entry = $derived(target === null ? undefined : userListStore.getEntry(target));
</script>

<Dialog
	label="Rate completed anime"
	open={entry !== undefined}
	onclose={() => userListStore.dismissRatingPrompt()}
>
	{#if entry}
		<div class="completion-rating">
			<h2>How was it?</h2>
			<p>{entry.titleEnglish || entry.title}</p>
			<ScoreInput malId={entry.malId} score={entry.score} />
			<button class="rating-done" onclick={() => userListStore.dismissRatingPrompt()}
				>{entry.score > 0 ? 'Done' : 'Later'}</button
			>
		</div>
	{/if}
</Dialog>

<style>
	:global(.anidash-dialog:has(.completion-rating)) {
		padding: 16px;
	}
	.completion-rating h2 {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.035em;
	}
	.completion-rating p {
		color: var(--color-text-secondary);
		margin: 8px 0 24px;
		overflow-wrap: anywhere;
	}
	.rating-done {
		display: block;
		min-width: 80px;
		min-height: 44px;
		margin: 18px 0 0 auto;
		padding: 0 18px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-2);
		cursor: pointer;
	}
</style>
