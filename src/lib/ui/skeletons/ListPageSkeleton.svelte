<div class="page" aria-hidden="true">
	<div class="skeleton h-10 w-48"></div>
	<div class="skeleton mt-3 h-4 w-64"></div>
	<div class="mt-8 flex gap-6 border-b border-border pb-4">
		{#each Array(4) as _, i (i)}<div class="skeleton h-4 w-20"></div>{/each}
	</div>
	<div class="mt-5 flex gap-3">
		<div class="skeleton h-11 w-full max-w-md"></div>
		<div class="skeleton h-11 w-40"></div>
	</div>
	<div class="mt-6">
		{#each Array(6) as _, i (i)}
			<div class="flex items-center gap-4 border-b border-border py-4">
				<div class="skeleton h-[66px] w-11 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<div class="skeleton h-4 w-2/5"></div>
					<div class="skeleton h-3 w-1/4"></div>
				</div>
				<div class="skeleton hidden h-11 w-52 sm:block"></div>
			</div>
		{/each}
	</div>
</div>
