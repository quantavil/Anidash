<script lang="ts">
	import { userListStore } from '$lib/stores/userlist.svelte';
	import type { AnimeStatus } from '$lib/cache/db';
	import { Trash2 } from 'lucide-svelte';

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

	const statuses: { value: AnimeStatus; label: string; letter: string; color: string }[] = [
		{ value: 'watching', label: 'Watching', letter: 'W', color: '#aa98fa' },
		{ value: 'plan_to_watch', label: 'PTW', letter: 'P', color: '#81b6ef' },
		{ value: 'completed', label: 'Completed', letter: 'C', color: '#71c9b0' },
		{ value: 'on_hold', label: 'On Hold', letter: 'H', color: '#e4bf72' },
		{ value: 'dropped', label: 'Dropped', letter: 'D', color: '#d9859b' }
	];
	const active = $derived(statuses.find((item) => item.value === status) ?? statuses[0]);
	const menuId = $props.id();
	let menu: HTMLDivElement;
	let trigger: HTMLButtonElement;
	let open = $state(false);
	let left = $state(0);
	let top = $state(0);

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		if (open) {
			menu.hidePopover();
			return;
		}
		const rect = trigger.getBoundingClientRect();
		left = Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184));
		top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 294));
		menu.showPopover();
		menu
			.querySelector<HTMLButtonElement>(`[data-status="${status}"]`)
			?.focus({ preventScroll: true });
	}
	function select(value: AnimeStatus) {
		if (value !== status) userListStore.setStatus(malId, value);
		menu.hidePopover();
		trigger.focus();
	}
	function navigate(event: KeyboardEvent) {
		const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button')];
		const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
		let next: number;
		if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
		else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = buttons.length - 1;
		else return;
		event.preventDefault();
		buttons[next]?.focus({ preventScroll: true });
	}
	$effect(() => {
		if (!open) return;
		const dismiss = () => menu.hidePopover();
		window.addEventListener('resize', dismiss);
		window.addEventListener('scroll', dismiss, true);
		return () => {
			window.removeEventListener('resize', dismiss);
			window.removeEventListener('scroll', dismiss, true);
		};
	});
</script>

<div class="status-control" style:--status-color={active.color}>
	<button
		bind:this={trigger}
		type="button"
		class="status-trigger {className}"
		class:labelled={showLabel}
		onclick={toggle}
		aria-expanded={open}
		aria-haspopup="menu"
		aria-controls={menuId}
		aria-label="Status: {active.label}"
		title="{active.label} · change status"
	>
		<span class="status-square" aria-hidden="true">{active.letter}</span>
		{#if showLabel}<span>{active.label}</span>{/if}
	</button>
	<div
		bind:this={menu}
		id={menuId}
		popover="auto"
		role="menu"
		tabindex="-1"
		aria-label="Change status"
		class="status-menu"
		style:left={`${left}px`}
		style:top={`${top}px`}
		ontoggle={(event) => (open = event.newState === 'open')}
		onkeydown={navigate}
	>
		{#each statuses as item (item.value)}
			<button
				type="button"
				role="menuitem"
				aria-label={item.label}
				data-status={item.value}
				class:active={status === item.value}
				style:--status-color={item.color}
				onclick={(event) => {
					event.stopPropagation();
					select(item.value);
				}}
			>
				<span class="status-square" aria-hidden="true">{item.letter}</span>
				<span>{item.value === 'plan_to_watch' ? 'Planned' : item.label}</span>
			</button>
		{/each}
		<div class="divider"></div>
		<button
			type="button"
			role="menuitem"
			class="remove"
			onclick={(event) => {
				event.stopPropagation();
				userListStore.removeFromList(malId);
				menu.hidePopover();
			}}><Trash2 size={16} aria-hidden="true" /><span>Remove</span></button
		>
	</div>
</div>

<style>
	.status-control {
		display: inline-flex;
		position: relative;
		flex-shrink: 0;
	}
	.status-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		min-width: 44px;
		height: 44px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
	}
	.status-trigger.labelled {
		width: auto;
		gap: 8px;
		padding: 0 8px;
		font-size: 12px;
	}
	.status-trigger:hover,
	.status-trigger[aria-expanded='true'] {
		background: var(--color-surface-3);
	}
	.status-square {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
		color: var(--status-color);
		background: color-mix(in srgb, var(--status-color) 13%, #15131c);
		border: 1px solid color-mix(in srgb, var(--status-color) 45%, #202027);
	}
	.status-menu {
		position: fixed;
		inset: auto;
		margin: 0;
		padding: 4px;
		width: 176px;
		border: 1px solid #3d374c;
		border-radius: 10px;
		background: #17171d;
		color: var(--color-text-secondary);
		box-shadow: 0 10px 24px #0009;
	}
	.status-menu button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 44px;
		padding: 0 10px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		text-align: left;
		font-size: 12px;
		cursor: pointer;
	}
	.status-menu button:hover,
	.status-menu button.active {
		background: #2a2433;
	}
	.status-menu button.active {
		color: var(--color-text-primary);
	}
	.status-trigger:focus-visible,
	.status-menu button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}
	.divider {
		height: 1px;
		background: var(--color-border);
		margin: 4px 0;
	}
	.status-menu button.remove {
		color: var(--color-error);
	}
</style>
