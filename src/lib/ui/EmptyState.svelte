<script lang="ts">
	let { title, hint, href, cta }: { title: string; hint: string; href?: string; cta?: string } =
		$props();
</script>

<div class="empty">
	<h2>{title}</h2>
	<p>{hint}</p>
	{#if href && cta}<a class="btn btn-primary" {href}>{cta}</a>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 56px 24px;
		border: 1px dashed var(--color-border-strong);
		border-radius: var(--radius-l);
		text-align: center;
	}
	h2 {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	p {
		max-width: 360px;
		margin-bottom: 14px;
		color: var(--color-text-secondary);
		font-size: 14px;
	}
</style>
