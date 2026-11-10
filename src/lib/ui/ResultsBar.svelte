<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Mic, X } from 'lucide-svelte';
	import { dubStore } from '#lib/stores/dub.svelte.js';
	import type { ViewSection } from '#lib/stores/settings.svelte.js';
	import ViewToggle from './ViewToggle.svelte';

	let { section, children }: { section: ViewSection; children: Snippet } = $props();
</script>

<!-- Result count on the left; the dub-only filter (set in Settings) and layout toggle on the right. -->
<div class="mb-3 flex min-h-8 items-center justify-between gap-3">
	<p class="min-w-0 truncate text-xs text-text-secondary" aria-live="polite">
		{@render children()}
	</p>
	<div class="flex shrink-0 items-center gap-2">
		{#if dubStore.dubMode}
			<button
				type="button"
				onclick={() => dubStore.toggleDubMode()}
				title="Dubbed titles only — click to turn off"
				aria-label="Dub only is on. Turn off"
				class="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
			>
				<Mic size={12} /> Dub<X size={12} class="opacity-70" />
			</button>
		{/if}
		<ViewToggle {section} />
	</div>
</div>
