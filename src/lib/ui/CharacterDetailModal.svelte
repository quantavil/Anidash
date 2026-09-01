<script lang="ts">
	import { Heart, ExternalLink, X } from 'lucide-svelte';
	import Dialog from './Dialog.svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import { formatCharacterName } from '$lib/utils/format';

	type AnilistCharacterEntry = {
		id: number;
		name: string;
		image: string | null;
		role: string | null;
		voiceActor: string | null;
		favourites: number | null;
	};

	let {
		open = $bindable(false),
		entry
	}: {
		open: boolean;
		entry: AnilistCharacterEntry | null;
	} = $props();
</script>

<Dialog bind:open wide>
	{#if entry}
		<div class="relative flex flex-col gap-5">
			<!-- Close button floating over image -->
			<button
				onclick={() => (open = false)}
				class="absolute top-3 right-3 z-20 rounded-full bg-black/40 backdrop-blur-md p-2 text-white/80 hover:bg-black/60 hover:text-white transition-all active:scale-95 cursor-pointer"
				aria-label="Close character details"
			>
				<X size={16} />
			</button>

			<!-- Character image -->
			<div
				class="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-surface-2"
			>
				<ImageWithFallback
					src={entry.image}
					alt={entry.name}
					aspectRatio="3/4"
					fallbackIcon="user"
					class="h-full w-full"
				/>

				<!-- Role badge overlay -->
				<div
					class="absolute bottom-3 left-3 glass-badge px-2.5 py-1 text-xs font-semibold capitalize"
				>
					{entry.role ?? 'UNKNOWN'}
				</div>
			</div>

			<!-- Details -->
			<div class="space-y-3">
				<div>
					<h2 class="text-xl font-bold text-text-primary">
						{formatCharacterName(entry.name)}
					</h2>
					{#if entry.voiceActor}
						<p class="text-sm text-text-muted mt-0.5 font-medium">VA: {entry.voiceActor}</p>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
					{#if entry.favourites}
						<div
							class="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-warning font-semibold"
						>
							<Heart size={12} fill="currentColor" class="text-warning" />
							<span>{entry.favourites.toLocaleString()} favourites</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="mt-2 flex gap-3">
				<a
					href="https://anilist.co/character/{entry.id}"
					target="_blank"
					rel="noopener noreferrer"
					class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 text-primary py-2.5 text-sm font-semibold tracking-wide hover:bg-primary/20 transition-colors"
				>
					<ExternalLink size={16} />
					View on AniList
				</a>

				<button
					onclick={() => (open = false)}
					class="flex-1 rounded-xl border border-white/10 bg-surface-2 py-2.5 text-sm font-semibold text-text-secondary transition-all hover:bg-white/10 hover:text-text-primary cursor-pointer"
				>
					Close
				</button>
			</div>
		</div>
	{/if}
</Dialog>
