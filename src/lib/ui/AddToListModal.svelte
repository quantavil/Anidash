<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Plus, Star } from 'lucide-svelte';
	import { userListStore } from '$lib/stores/userlist.svelte';
	import { formatMediaType } from '$lib/utils/format';
	import { toast } from 'svelte-sonner';
	import ImageWithFallback from './ImageWithFallback.svelte';

	type AnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

	let {
		open = false,
		onOpenChange,
		malId,
		title: animeTitle = '',
		titleEnglish = null,
		picture = null,
		mean = null,
		mediaType = '',
		numEpisodes = 0
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		malId: number;
		title?: string;
		titleEnglish?: string | null;
		picture?: string | null;
		mean?: number | null;
		mediaType?: string;
		numEpisodes?: number;
	} = $props();

	let selectedStatus = $state<AnimeStatus>('plan_to_watch');
	let adding = $state(false);

	const statusOptions: { key: AnimeStatus; label: string }[] = [
		{ key: 'watching', label: 'Watching' },
		{ key: 'completed', label: 'Completed' },
		{ key: 'on_hold', label: 'On Hold' },
		{ key: 'dropped', label: 'Dropped' },
		{ key: 'plan_to_watch', label: 'Plan to Watch' }
	];

	async function handleAdd() {
		adding = true;
		const result = await userListStore.addToList(malId, selectedStatus, titleEnglish);
		adding = false;

		if (result.ok) {
			toast.success(`Added "${animeTitle}" to your list`);
			onOpenChange?.(false);
		} else {
			toast.error('Failed to add anime — try again');
		}
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface-1 p-6 shadow-2xl"
		>
			<!-- Anime preview -->
			<div class="flex gap-4">
				<ImageWithFallback
					src={picture}
					alt={animeTitle}
					class="h-28 w-20 shrink-0 rounded-lg inline-block"
				/>

				<div class="min-w-0 flex-1">
					<Dialog.Title class="text-base font-semibold text-text-primary">
						{animeTitle}
					</Dialog.Title>
					<div class="mt-1 flex items-center gap-2 text-xs text-text-muted">
						{#if mediaType}
							<span>{formatMediaType(mediaType)}</span>
						{/if}
						{#if numEpisodes}
							<span>· {numEpisodes} eps</span>
						{/if}
						{#if mean}
							<span>· ★ {mean.toFixed(1)}</span>
						{/if}
					</div>

					<!-- Status picker -->
					<div class="mt-4 space-y-1.5">
						<p class="text-xs font-medium text-text-secondary">Add to list as:</p>
						<div class="flex flex-wrap gap-1.5">
							{#each statusOptions as opt}
								<button
									onclick={() => (selectedStatus = opt.key)}
									class="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors
                    {selectedStatus === opt.key
										? 'border-primary bg-primary/15 text-primary'
										: 'border-border bg-surface-2 text-text-muted hover:border-primary/40 hover:text-text-secondary'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-5 flex justify-end gap-3">
				<Dialog.Close
					class="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3"
				>
					Cancel
				</Dialog.Close>
				<button
					onclick={handleAdd}
					disabled={adding}
					class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
				>
					<Plus size={14} />
					{adding ? 'Adding…' : 'Add to List'}
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
