<script lang="ts">
	import { getUrlParam, setUrlParam } from '$lib/utils/url-state';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { formatListStatus } from '$lib/utils/format';

	type TabKey = 'all' | 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

	let { counts }: { counts: Record<string, number> } = $props();

	const tabs: { key: TabKey; label: string }[] = [
		'watching',
		'plan_to_watch',
		'completed',
		'on_hold',
		'dropped',
		'all'
	].map((k) => ({
		key: k as TabKey,
		label: k === 'all' ? 'All' : formatListStatus(k)
	}));

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

	function getCount(key: TabKey): number {
		if (key === 'all') return userListStore.totalCount;
		return counts[key] ?? 0;
	}
</script>

<div
	class="journal-tabs flex overflow-x-auto scrollbar-none"
	role="tablist"
	aria-label="Anime list status tabs"
>
	{#each tabs as tab, idx (tab.key)}
		{@const isActive = currentTab === tab.key}
		<button
			role="tab"
			aria-selected={isActive}
			tabindex={isActive ? 0 : -1}
			onclick={() => selectTab(tab.key)}
			onkeydown={(e) => handleKeydown(e, idx)}
			class="journal-tab {isActive ? 'selected' : ''}"
		>
			{tab.label}
			<span class="tab-count">
				{getCount(tab.key)}
			</span>
		</button>
	{/each}
</div>

<style>
	.journal-tabs {
		border-bottom: 1px solid var(--color-border);
		gap: 22px;
	}
	.journal-tab {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		min-height: 48px;
		padding: 0 3px;
		border-bottom: 2px solid transparent;
		color: var(--color-text-secondary);
		font-size: 13px;
		cursor: pointer;
	}
	.journal-tab:hover {
		color: var(--color-text-primary);
	}
	.journal-tab.selected {
		color: var(--color-text-primary);
		border-bottom-color: var(--color-primary);
	}
	.tab-count {
		font-size: 11px;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 640px) {
		.journal-tabs {
			gap: 20px;
			margin-right: -18px;
			padding-right: 18px;
		}
		.journal-tab {
			font-size: 12px;
		}
	}
</style>
