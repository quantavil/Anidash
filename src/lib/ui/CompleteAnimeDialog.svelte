<script lang="ts">
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';

	let {
		open = $bindable(false),
		malId = $bindable<number | null>(null)
	}: {
		open: boolean;
		malId: number | null;
	} = $props();

	function handleConfirmComplete() {
		if (malId !== null) {
			userListStore.markCompleted(malId);
		}
		malId = null;
	}
</script>

<ConfirmDialog
	{open}
	onOpenChange={(v) => {
		open = v;
		if (!v) malId = null;
	}}
	title="Mark as Completed?"
	description="You've watched all episodes. Mark this anime as completed?"
	confirmLabel="Mark Completed"
	onConfirm={handleConfirmComplete}
/>
