<script lang="ts">
	let { size = 28, class: clazz = '' }: { size?: number | string; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	class={clazz}
	aria-hidden="true"
	><rect width="32" height="32" rx="9" fill="var(--color-primary)" /><path
		d="m10 9.5 6.5 6.5-6.5 6.5m6-13 6.5 6.5-6.5 6.5"
		stroke="var(--color-on-primary)"
		stroke-width="2.8"
		stroke-linecap="round"
		stroke-linejoin="round"
	/></svg
>
