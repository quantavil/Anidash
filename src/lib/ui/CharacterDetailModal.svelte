<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Heart, ExternalLink, X } from 'lucide-svelte';
	import ImageWithFallback from './ImageWithFallback.svelte';
	import type { JikanCharacterEntry } from '$lib/api/schemas/jikan.schema';

	let {
		open = $bindable(false),
		entry
	}: {
		open: boolean;
		entry: JikanCharacterEntry | null;
	} = $props();

	function formatCharacterName(rawName: string): string {
		if (!rawName) return '';
		const parts = rawName.split(',').map((p) => p.trim());
		return parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-all duration-300"
		/>
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-gradient-to-b from-surface-1/95 to-surface-2/90 p-6 shadow-2xl backdrop-blur-2xl overflow-hidden focus:outline-none"
		>
			<!-- Glowing background decoration -->
			<div
				class="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"
			></div>
			<div
				class="absolute -left-20 -bottom-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
			></div>

			{#if entry}
				<div class="relative flex flex-col gap-5 z-10">
					<!-- Close button floating over image -->
					<Dialog.Close
						class="absolute top-3 right-3 z-20 rounded-full bg-black/40 backdrop-blur-md p-2 text-white/80 hover:bg-black/60 hover:text-white transition-all active:scale-95 cursor-pointer"
					>
						<X size={16} />
					</Dialog.Close>

					<!-- Character image: bigger picture! -->
					<div
						class="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-surface-2"
					>
						<ImageWithFallback
							src={entry.character.images?.jpg?.image_url ||
								entry.character.images?.webp?.image_url}
							alt={entry.character.name}
							aspectRatio="3/4"
							fallbackIcon="user"
							class="h-full w-full"
						/>

						<!-- Role badge overlay -->
						<div
							class="absolute bottom-3 left-3 glass-badge px-2.5 py-1 text-xs font-semibold capitalize"
						>
							{entry.role}
						</div>
					</div>

					<!-- Details -->
					<div class="space-y-3">
						<div>
							<Dialog.Title class="text-xl font-bold text-text-primary">
								{formatCharacterName(entry.character.name)}
							</Dialog.Title>
							{#if entry.character.name_kanji}
								<p class="text-sm text-text-muted mt-0.5 font-medium">
									{entry.character.name_kanji}
								</p>
							{/if}
						</div>

						<div class="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
							{#if entry.character.favorites}
								<div
									class="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-warning font-semibold"
								>
									<Heart size={12} fill="currentColor" class="text-warning" />
									<span>{entry.character.favorites.toLocaleString()} favorites</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="mt-2 flex gap-3">
						{#if entry.character.url}
							<a
								href={entry.character.url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 text-primary py-2.5 text-sm font-semibold tracking-wide hover:bg-primary/20 transition-colors"
							>
								<ExternalLink size={16} />
								View on MAL
							</a>
						{/if}

						<Dialog.Close
							class="flex-1 rounded-xl border border-white/10 bg-surface-2 py-2.5 text-sm font-semibold text-text-secondary transition-all hover:bg-white/10 hover:text-text-primary cursor-pointer"
						>
							Close
						</Dialog.Close>
					</div>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
