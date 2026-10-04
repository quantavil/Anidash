<script lang="ts">
	let { size = 24, class: clazz = '' }: { size?: number | string; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 28"
	fill="none"
	class={clazz}
	aria-hidden="true"
	><path d="M4 2h16v24l-8-5-8 5V2Z" fill="var(--color-primary)" /><path
		d="m9 8 7 4-7 4V8Z"
		fill="var(--color-surface-0)"
	/></svg
>
