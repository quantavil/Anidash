<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Play, Check, Bookmark, Pause, XCircle, Trash2 } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
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
		'plan_to_watch',
		'on_hold',
		'dropped'
	];

	const STATUS_CONFIG = {
		watching: {
			label: 'Watching',
			icon: Play,
			badgeClass:
				'bg-primary/25 text-[#bfb5ff] border-primary/50 hover:bg-primary/35 shadow-[0_0_12px_rgba(139,126,248,0.3)]',
			iconClass: 'text-primary'
		},
		completed: {
			label: 'Completed',
			icon: Check,
			badgeClass:
				'bg-success/25 text-success border-success/50 hover:bg-success/35 shadow-[0_0_12px_rgba(34,197,94,0.3)]',
			iconClass: 'text-success'
		},
		plan_to_watch: {
			label: 'PTW',
			icon: Bookmark,
			badgeClass:
				'bg-info/25 text-info border-info/50 hover:bg-info/35 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
			iconClass: 'text-info'
		},
		on_hold: {
			label: 'On Hold',
			icon: Pause,
			badgeClass:
				'bg-warning/25 text-warning border-warning/50 hover:bg-warning/35 shadow-[0_0_12px_rgba(234,179,8,0.3)]',
			iconClass: 'text-warning'
		},
		dropped: {
			label: 'Dropped',
			icon: XCircle,
			badgeClass:
				'bg-error/25 text-error border-error/50 hover:bg-error/35 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
			iconClass: 'text-error'
		}
	};

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
			class="group flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition-all duration-300 ease-spring hover:scale-110 active:scale-95 focus:outline-none {STATUS_CONFIG[
				status
			]?.badgeClass} {className}"
			title="{STATUS_CONFIG[status]?.label} (Click to change status)"
			aria-label="Status: {STATUS_CONFIG[status]?.label}"
		>
			{@const ActiveIcon = STATUS_CONFIG[status]?.icon}
			<ActiveIcon
				size={13}
				fill={status === 'completed' || status === 'dropped' ? 'none' : 'currentColor'}
				class="transition-transform group-hover:scale-110"
			/>
		</DropdownMenu.Trigger>

		<DropdownMenu.Portal>
			<DropdownMenu.Content
				class="glass-dropdown min-w-[130px] p-1.5 backdrop-blur-2xl border border-white/10 bg-surface-1/95 rounded-2xl shadow-2xl z-50"
				sideOffset={6}
				align="start"
			>
				{#each ALL_STATUSES as s (s)}
					{@const cfg = STATUS_CONFIG[s]}
					<DropdownMenu.Item
						class="glass-dropdown-item flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all hover:bg-white/10
						{s === status ? '!bg-white/15 !text-text-primary font-semibold' : 'text-text-secondary'}"
						onSelect={() => handleSelect(s)}
					>
						<cfg.icon
							size={13}
							fill={s === 'completed' || s === 'dropped' ? 'none' : 'currentColor'}
							class={cfg.iconClass}
						/>
						<span class="flex-1">{cfg.label}</span>
						{#if s === status}
							<Check size={13} class="text-primary ml-1" />
						{/if}
					</DropdownMenu.Item>
				{/each}

				<DropdownMenu.Separator class="my-1 block h-px bg-white/10" />

				<DropdownMenu.Item
					class="glass-dropdown-item flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer text-error! hover:bg-error/20! transition-all"
					onSelect={handleRemove}
				>
					<Trash2 size={13} class="text-error" />
					<span class="flex-1">Remove</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
</div>

