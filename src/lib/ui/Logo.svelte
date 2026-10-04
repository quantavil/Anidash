<script lang="ts">
	let { size = 24, class: clazz = '' }: { size?: number | string; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class={clazz}
	aria-hidden="true"
	><path d="m12 3 9 18h-5l-4-9-4 9H3L12 3Z" fill="var(--color-primary)" /><path
		d="m10 16 2-4 2 4h-4Z"
		fill="var(--color-surface-0)"
	/></svg
>
