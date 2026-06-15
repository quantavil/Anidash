<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Check, ChevronDown } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { formatListStatus, STATUS_COLORS } from '$lib/utils/format';
	import { tick } from 'svelte';

	import type { AnimeStatus } from '$lib/cache/db';

	let {
		malId,
		status,
		class: className = ''
	}: {
		malId: number;
		status: AnimeStatus;
		class?: string;
	} = $props();

	const ALL_STATUSES: AnimeStatus[] = [
		'watching',
		'completed',
		'on_hold',
		'dropped',
		'plan_to_watch'
	];

	function handleSelect(newStatus: AnimeStatus) {
		if (newStatus !== status) {
			userListStore.setStatus(malId, newStatus);
		}
	}

	function handleRemove() {
		userListStore.removeFromList(malId);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div onclick={(e) => e.stopPropagation()}>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all hover:opacity-80 focus:outline-none {STATUS_COLORS[
				status
			]?.badge} {className}"
		>
			<span class="h-1.5 w-1.5 rounded-full {STATUS_COLORS[status]?.dot}"></span>
			{formatListStatus(status)}
			<ChevronDown size={12} class="opacity-60" />
		</DropdownMenu.Trigger>

		<DropdownMenu.Portal>
			<DropdownMenu.Content class="glass-dropdown" sideOffset={4} align="start">
				{#each ALL_STATUSES as s, _idx (_idx)}
					<DropdownMenu.Item class="glass-dropdown-item" onSelect={() => handleSelect(s)}>
						<span class="h-2 w-2 shrink-0 rounded-full {STATUS_COLORS[s]?.dot}"></span>
						<span class="flex-1">{formatListStatus(s)}</span>
						{#if s === status}
							<Check size={14} class="text-text-muted" />
						{/if}
					</DropdownMenu.Item>
				{/each}

				<DropdownMenu.Separator class="my-1 block h-px bg-border" />

				<DropdownMenu.Item
					class="glass-dropdown-item !text-error hover:bg-error/20!"
					onSelect={handleRemove}
				>
					<span class="h-2 w-2 shrink-0 rounded-full bg-error"></span>
					<span class="flex-1">Remove</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
</div>
