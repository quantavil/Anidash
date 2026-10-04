<script lang="ts">
	import { connection } from '$lib/utils/connection.svelte';
	import { Wifi, WifiOff } from 'lucide-svelte';
</script>

{#if !connection.isOnline}
	<div class="banner offline" role="status">
		<WifiOff size={13} />
		Offline. Changes are saved here and will sync when you reconnect.
	</div>
{:else if connection.wasOffline}
	<div class="banner online" role="status"><Wifi size={13} /> Back online</div>
{/if}

<style>
	.banner {
		position: sticky;
		top: calc(var(--header-h) + env(safe-area-inset-top));
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin: 0 -16px;
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 500;
	}
	.offline {
		background: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface-0));
		color: var(--color-warning);
		border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
	}
	.online {
		background: color-mix(in srgb, var(--color-success) 16%, var(--color-surface-0));
		color: var(--color-success);
	}
	@media (min-width: 768px) {
		.banner {
			top: 0;
			margin: 0 calc(clamp(20px, 3vw, 40px) * -1);
		}
	}
</style>
