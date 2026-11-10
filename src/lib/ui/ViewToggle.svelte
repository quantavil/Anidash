<script lang="ts">
	import { LayoutGrid, List } from 'lucide-svelte';
	import { settingsStore, type ViewMode, type ViewSection } from '#lib/stores/settings.svelte.js';

	let { section }: { section: ViewSection } = $props();

	const MODES: { value: ViewMode; label: string; icon: typeof List }[] = [
		{ value: 'grid', label: 'Grid view', icon: LayoutGrid },
		{ value: 'list', label: 'List view', icon: List }
	];
	const current = $derived(settingsStore.views[section]);
</script>

<div
	class="inline-flex shrink-0 overflow-hidden rounded-md border border-white/5 bg-white/5"
	role="group"
	aria-label="Layout"
>
	{#each MODES as m (m.value)}
		<button
			type="button"
			onclick={() => settingsStore.setView(section, m.value)}
			aria-pressed={current === m.value}
			aria-label={m.label}
			title={m.label}
			class="flex h-8 w-9 cursor-pointer items-center justify-center transition-colors {current ===
			m.value
				? 'bg-primary/20 text-primary'
				: 'text-text-muted hover:bg-white/10 hover:text-text-primary'}"
		>
			<m.icon size={15} />
		</button>
	{/each}
</div>
