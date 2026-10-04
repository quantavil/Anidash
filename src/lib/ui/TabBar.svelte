<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { STATUS_META, STATUS_ORDER } from './status';

	type TabKey = 'all' | 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

	let { counts }: { counts: Record<string, number> } = $props();

	const tabs: { key: TabKey; label: string; color?: string }[] = [
		...STATUS_ORDER.map((s) => ({
			key: s as TabKey,
			label: STATUS_META[s].label,
			color: STATUS_META[s].color
		})),
		{ key: 'all', label: 'All' }
	];

	const currentTab = $derived(getUrlParam(page.url, 'tab', 'watching') as TabKey);

	function selectTab(key: TabKey) {
		goto(setUrlParam(page.url, 'tab', key === 'watching' ? '' : key), {
			keepFocus: true,
			noScroll: true
		});
	}

	// WAI-ARIA tabs: one tab stop, arrows/Home/End move between tabs.
	function handleKeydown(e: KeyboardEvent, index: number) {
		const last = tabs.length - 1;
		const next =
			e.key === 'ArrowRight'
				? (index + 1) % tabs.length
				: e.key === 'ArrowLeft'
					? (index - 1 + tabs.length) % tabs.length
					: e.key === 'Home'
						? 0
						: e.key === 'End'
							? last
							: -1;
		if (next === -1) return;
		e.preventDefault();
		selectTab(tabs[next].key);
		(e.currentTarget as HTMLElement).parentElement
			?.querySelectorAll<HTMLElement>('[role="tab"]')
			[next]?.focus();
	}

	const getCount = (key: TabKey) => (key === 'all' ? userListStore.totalCount : (counts[key] ?? 0));
</script>

<div class="tabs scrollbar-none" role="tablist" aria-label="Anime list status tabs">
	{#each tabs as tab, idx (tab.key)}
		{@const selected = currentTab === tab.key}
		<button
			role="tab"
			aria-selected={selected}
			tabindex={selected ? 0 : -1}
			onclick={() => selectTab(tab.key)}
			onkeydown={(e) => handleKeydown(e, idx)}
			class="tab"
			class:selected
		>
			{#if tab.color}<span class="status-dot" style:--dot={tab.color}></span>{/if}
			{tab.label}
			<span class="count num">{getCount(tab.key)}</span>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		border-bottom: 1px solid var(--color-border);
		/* Last tab fades out at the edge so overflow is discoverable on phones. */
		mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
	}
	@media (min-width: 900px) {
		.tabs {
			mask-image: none;
		}
	}
	.tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		min-height: 46px;
		padding: 0 12px;
		color: var(--color-text-secondary);
		font-size: 14px;
		font-weight: 500;
		transition: color 0.15s;
	}
	.tab:hover {
		color: var(--color-text-primary);
	}
	.tab.selected {
		color: var(--color-text-primary);
	}
	.tab.selected::after {
		content: '';
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: -1px;
		height: 2px;
		border-radius: 2px 2px 0 0;
		background: var(--color-primary);
	}
	.count {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.tab.selected .count {
		color: var(--color-text-secondary);
	}
</style>
