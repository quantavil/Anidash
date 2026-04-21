<script lang="ts">
	let { size = 24, class: clazz = '' }: { size?: number | string; class?: string } = $props();

	// Generate a unique ID to prevent `display: none` bugs in mobile layouts
	// where hidden parent nodes invalidate shared SVG def IDs for visible siblings.
	const gradientId = 'logo-glow-' + Math.random().toString(36).slice(2, 9);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="none"
	class={clazz}
>
	<defs>
		<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="var(--color-primary)" />
			<stop offset="100%" stop-color="var(--color-info)" />
		</linearGradient>
	</defs>
	
	<g fill="url(#{gradientId})">
		<!-- The 'A' shape -->
		<path d="M12 2l-9 19h4.5L12 11l4.5 10H21L12 2z" />
		<!-- The 'Dash' across -->
		<path d="M7.5 16h9l2-4h-13z" opacity="0.6" />
	</g>
</svg>
