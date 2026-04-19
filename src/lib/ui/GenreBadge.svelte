<script lang="ts">
	let { name, small = false }: { name: string; small?: boolean } = $props();
</script>

<span
	class="inline-block rounded-full border border-border bg-surface-1 text-text-secondary
    {small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}"
>
	{name}
</span>
