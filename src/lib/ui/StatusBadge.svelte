<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Play, Check, Bookmark, Pause, XCircle, Trash2 } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import type { AnimeStatus } from '$lib/cache/db';

	let {
		malId,
		status,
		showLabel = false,
		class: className = ''
	}: {
		malId: number;
		status: AnimeStatus;
		showLabel?: boolean;
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

	let open = $state(false);
	let rootEl: HTMLElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();

	const ActiveIcon = $derived(STATUS_CONFIG[status]?.icon ?? Play);

	function handleSelect(newStatus: AnimeStatus) {
		if (newStatus !== status) {
			userListStore.setStatus(malId, newStatus);
		}
		open = false;
	}

	function handleRemove() {
		userListStore.removeFromList(malId);
		open = false;
	}

	function handleToggle() {
		open = !open;
	}

	// Dismiss on outside click / Esc while open.
	$effect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (rootEl && !rootEl.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				open = false;
				triggerEl?.focus();
			}
		};
		window.addEventListener('pointerdown', onPointer);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('pointerdown', onPointer);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div bind:this={rootEl} class="relative inline-block" onclick={(e) => e.stopPropagation()}>
	<button
		bind:this={triggerEl}
		onclick={handleToggle}
		aria-expanded={open}
		aria-haspopup="menu"
		class="group flex items-center justify-center border shadow-md transition-all duration-200 ease-spring hover:scale-105 active:scale-95 focus:outline-none {showLabel
			? 'px-3 py-1.5 gap-2 rounded-xl'
			: 'h-7 w-7 rounded-full'} {STATUS_CONFIG[status]?.badgeClass} {className}"
		title="{STATUS_CONFIG[status]?.label} (Click to change status)"
		aria-label="Status: {STATUS_CONFIG[status]?.label}"
	>
		<ActiveIcon
			size={13}
			fill={status === 'completed' || status === 'dropped' ? 'none' : 'currentColor'}
			class="transition-transform group-hover:scale-110 shrink-0"
		/>
		{#if showLabel}
			<span class="font-medium">{STATUS_CONFIG[status]?.label}</span>
		{/if}
	</button>

	{#if open}
		<div
			role="menu"
			transition:fade={{ duration: 120 }}
			class="absolute left-0 top-full z-50 mt-1.5 min-w-[130px] rounded-xl border border-white/10 bg-surface-1/95 p-1.5 shadow-2xl backdrop-blur-2xl"
		>
			{#each ALL_STATUSES as s (s)}
				{@const cfg = STATUS_CONFIG[s]}
				<button
					role="menuitem"
					onclick={() => handleSelect(s)}
					class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors hover:bg-white/10 cursor-pointer
					{s === status ? 'bg-white/15 text-text-primary font-semibold' : 'text-text-secondary'}"
				>
					<cfg.icon
						size={13}
						fill={s === 'completed' || s === 'dropped' ? 'none' : 'currentColor'}
						class={cfg.iconClass}
					/>
					<span class="flex-1 text-left">{cfg.label}</span>
					{#if s === status}
						<Check size={13} class="text-primary ml-1" />
					{/if}
				</button>
			{/each}

			<div class="my-1 h-px bg-white/10"></div>

			<button
				role="menuitem"
				onclick={handleRemove}
				class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-error transition-colors hover:bg-error/20 cursor-pointer"
			>
				<Trash2 size={13} />
				<span class="flex-1 text-left">Remove</span>
			</button>
		</div>
	{/if}
</div>
