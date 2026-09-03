<script lang="ts">
	import Dialog from './Dialog.svelte';

	let {
		open = false,
		onOpenChange,
		title = 'Confirm',
		description = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		dismissible = true,
		onConfirm
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'danger';
		dismissible?: boolean;
		onConfirm?: () => void;
	} = $props();

	function setOpen(value: boolean) {
		open = value;
		onOpenChange?.(value);
	}

	function handleConfirm() {
		onConfirm?.();
		setOpen(false);
	}
</script>

<Dialog {open} onclose={() => setOpen(false)} {dismissible}>
	<h2 class="text-lg font-semibold text-text-primary">{title}</h2>
	<p class="mt-2 text-sm text-text-secondary">{description}</p>
	<div class="mt-6 flex justify-end gap-3">
		<button
			onclick={() => setOpen(false)}
			class="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
		>
			{cancelLabel}
		</button>
		<button
			onclick={handleConfirm}
			class="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors
            {variant === 'danger'
				? 'bg-error hover:bg-error/80'
				: 'bg-primary hover:bg-primary-hover'}"
		>
			{confirmLabel}
		</button>
	</div>
</Dialog>
