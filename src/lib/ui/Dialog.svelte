<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		/** Alert-style dialogs cannot be dismissed via Esc / backdrop click. */
		dismissible = true,
		wide = false,
		onclose,
		children
	}: {
		open?: boolean;
		dismissible?: boolean;
		wide?: boolean;
		onclose?: () => void;
		children?: Snippet;
	} = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();

	// Sync the reactive `open` flag with the imperative <dialog> API.
	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	// Lock page scroll while open.
	$effect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	function handleCancel(e: Event) {
		if (!dismissible) e.preventDefault();
	}

	function handleClose() {
		open = false;
		onclose?.();
	}

	// Clicks that land on the dialog box itself are backdrop/padding clicks.
	function handleClick(e: MouseEvent) {
		if (dismissible && e.target === dialogEl) dialogEl?.close();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="anidash-dialog {wide ? 'anidash-dialog-wide' : ''}"
	aria-modal="true"
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleClick}
>
	{@render children?.()}
</dialog>
