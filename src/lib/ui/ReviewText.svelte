<script lang="ts">
	import { formatReviewExcerpt } from '$lib/utils/review-text';

	let { body }: { body: string } = $props();
	let expanded = $state(false);
	const fullText = $derived(formatReviewExcerpt(body, body.length));
	const preview = $derived(formatReviewExcerpt(fullText, 240));
</script>

<p
	class="review-body mt-2 text-sm leading-relaxed text-text-secondary break-words [overflow-wrap:anywhere]"
>
	{expanded ? fullText : preview}
</p>
{#if fullText !== preview}
	<button
		type="button"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
		class="mt-1 min-h-11 min-w-11 text-xs font-medium text-primary-hover hover:text-text-primary cursor-pointer"
		>{expanded ? 'Show less' : 'Read full review'}</button
	>
{/if}
