<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something went wrong');

	const MESSAGES: Record<number, string> = {
		404: "This page doesn't exist",
		500: 'Something went wrong on our end'
	};
</script>

<div class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-md text-center">
		<p
			class="num font-[family-name:var(--font-display)] text-8xl font-bold tracking-tighter text-primary"
		>
			{status}
		</p>
		<h1 class="mt-2 text-xl font-semibold text-text-primary">{MESSAGES[status] ?? message}</h1>
		<div class="mt-8 flex justify-center gap-3">
			<button class="btn btn-primary" onclick={() => goto('/')}>Go home</button>
			<button class="btn" onclick={() => history.back()}>Go back</button>
		</div>
	</div>
</div>
