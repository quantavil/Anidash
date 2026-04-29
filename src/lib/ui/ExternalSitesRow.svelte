<script lang="ts">
	import { EXTERNAL_SITES } from '$lib/utils/external-sites';
	import { mirrorsStore } from '$lib/stores/mirrors.svelte';
	import { ChevronDown } from 'lucide-svelte';

	let { animeTitle }: { animeTitle: string } = $props();

	function handleMirrorSelect(e: MouseEvent, siteName: string, domain: string) {
		mirrorsStore.setPreferredDomain(siteName, domain);
		// It bubbles to the front immediately for the next render
	}
</script>

{#each EXTERNAL_SITES as site}
	{@const sortedDomains = mirrorsStore.getSortedDomains(site.name, site.domains)}
	{@const primaryDomain = sortedDomains[0]}
	<div
		class="ext-group"
		style="--site-color: {site.color};"
	>
		<!-- Primary Link -->
		<a
			href={site.searchUrl(primaryDomain, animeTitle)}
			target="_blank"
			rel="noopener noreferrer"
			title="Search on {site.name}"
			class="ext-main {site.domains.length <= 1 ? 'rounded-full' : 'rounded-l-full'}"
		>
			<img
				src={site.iconUrl(primaryDomain)}
				alt={site.name}
				class="h-3.5 w-3.5 rounded-sm"
				onerror={(e) => {
					(e.currentTarget as HTMLImageElement).style.display = 'none';
				}}
			/>
			{site.name}
		</a>

		<!-- Dropdown Trigger for Mirrors -->
		{#if site.domains.length > 1}
			<div class="relative flex items-center border-l border-white/10">
				<button class="ext-trigger rounded-r-full">
					<ChevronDown size={12} />
				</button>
				
				<!-- Dropdown Menu -->
				<div class="glass-dropdown absolute left-0 top-full z-50 mt-2 hidden flex-col group-hover:flex">
					<div class="px-2 py-1 mb-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
						Alternative Mirrors
					</div>
					{#each sortedDomains as domain, i}
						<a
							href={site.searchUrl(domain, animeTitle)}
							target="_blank"
							rel="noopener noreferrer"
							onclick={(e) => handleMirrorSelect(e, site.name, domain)}
							class="ext-mirror"
						>
							<span>{domain}</span>
							{#if i === 0}
								<span class="text-[9px] font-semibold text-primary">Primary</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/each}
