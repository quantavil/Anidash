<script lang="ts">
	import { Dices } from 'lucide-svelte';
	import ToolbarButton from './ToolbarButton.svelte';

	let { count, onclick }: { count: number; onclick: () => void } = $props();
</script>

<ToolbarButton
	icon={Dices}
	text="Random"
	label="Random pick from the {count} shown"
	disabled={count === 0}
	{onclick}
/>
