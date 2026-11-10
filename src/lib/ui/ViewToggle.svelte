<script lang="ts">
	import { LayoutGrid, List } from 'lucide-svelte';
	import { settingsStore, type ViewSection } from '#lib/stores/settings.svelte.js';
	import ToolbarButton from './ToolbarButton.svelte';

	let { section }: { section: ViewSection } = $props();

	// One button showing the layout it switches to.
	const next = $derived(settingsStore.views[section] === 'grid' ? 'list' : 'grid');
</script>

<ToolbarButton
	icon={next === 'list' ? List : LayoutGrid}
	label="Switch to {next} view"
	class="max-[359px]:hidden"
	onclick={() => settingsStore.setView(section, next)}
/>
