<script lang="ts">
  import { AlertDialog } from 'bits-ui';

  let {
    open = false,
    onOpenChange,
    title = 'Confirm',
    description = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger';
    onConfirm?: () => void;
  } = $props();

  function handleConfirm() {
    onConfirm?.();
    onOpenChange?.(false);
  }
</script>

<AlertDialog.Root {open} onOpenChange={onOpenChange}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <AlertDialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
      <AlertDialog.Title class="text-lg font-semibold text-text-primary">
        {title}
      </AlertDialog.Title>
      <AlertDialog.Description class="mt-2 text-sm text-text-secondary">
        {description}
      </AlertDialog.Description>
      <div class="mt-6 flex justify-end gap-3">
        <AlertDialog.Cancel
          class="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
        >
          {cancelLabel}
        </AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={handleConfirm}
          class="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors
            {variant === 'danger'
              ? 'bg-error hover:bg-error/80'
              : 'bg-primary hover:bg-primary-hover'}"
        >
          {confirmLabel}
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>