<script lang="ts">
	import { Mic, X } from 'lucide-svelte';
	import { dubStore } from '#lib/stores/dub.svelte.js';
</script>

<!-- Reminder that the dub-only filter (set in Settings) is hiding titles; takes no space when off. -->
{#if dubStore.dubMode}
	<button
		type="button"
		onclick={() => dubStore.toggleDubMode()}
		aria-label="Dub only is on. Turn off"
		class="mb-3 flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
	>
		<Mic size={12} /> Dubbed only <X size={12} class="opacity-70" />
	</button>
{/if}
