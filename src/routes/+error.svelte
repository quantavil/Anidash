<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const status = $derived($page.status);
	const message = $derived($page.error?.message ?? 'Something went wrong');

	const MESSAGES: Record<number, string> = {
		404: "This page doesn't exist",
		500: 'Something went wrong on our end'
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-surface-0 px-4">
	<div class="text-center">
		<div class="mb-4 text-6xl">
			{status === 404 ? '🔍' : '💥'}
		</div>
		<h1 class="text-4xl font-bold text-text-primary">{status}</h1>
		<p class="mt-2 text-lg text-text-secondary">
			{MESSAGES[status] ?? message}
		</p>
		<div class="mt-6 flex justify-center gap-3">
			<button
				onclick={() => goto('/')}
				class="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
			>
				Go Home
			</button>
			<button
				onclick={() => history.back()}
				class="rounded-lg border border-border bg-surface-1 px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2"
			>
				Go Back
			</button>
		</div>
	</div>
</div>
