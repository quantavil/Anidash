<script lang="ts">
  let { size = 24, class: clazz = '' }: { size?: number | string; class?: string } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={clazz}
>
  <defs>
    <linearGradient id="logo-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--color-primary)" />
      <stop offset="100%" stop-color="var(--color-info)" />
    </linearGradient>
  </defs>
  <!-- Stylized A / Play Shape -->
  <path d="M3 21l9-18 9 18" stroke="url(#logo-glow)" />
  <path d="M8 14h8" stroke="url(#logo-glow)" />
  <!-- Dynamic Dash -->
  <path d="M12 6L18 6" stroke="url(#logo-glow)" fill="none" opacity="0.5" />
</svg>
