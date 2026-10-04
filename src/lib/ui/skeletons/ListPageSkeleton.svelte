<div class="journal-skeleton" aria-hidden="true">
	<div class="skeleton-heading"></div>
	<div class="skeleton-tabs"></div>
	<div class="skeleton-search"></div>
	<div class="skeleton-feature">
		<div class="skeleton-poster"></div>
		<div class="skeleton-copy">
			<div></div>
			<div></div>
			<div></div>
		</div>
	</div>
	{#each Array(3) as _, i (i)}<div class="skeleton-row">
			<div></div>
			<span></span>
		</div>{/each}
</div>

<style>
	.journal-skeleton {
		padding: 40px 0;
		max-width: 100%;
	}
	.skeleton-heading {
		height: 66px;
		width: 240px;
		border-radius: 8px;
		margin-bottom: 28px;
		background: var(--color-surface-2);
	}
	.skeleton-tabs {
		height: 48px;
		width: 100%;
		border-bottom: 1px solid var(--color-border);
		background: linear-gradient(90deg, var(--color-surface-2), transparent);
	}
	.skeleton-search {
		height: 48px;
		width: min(440px, 100%);
		background: var(--color-surface-2);
		border-radius: 8px;
		margin: 24px 0;
	}
	.skeleton-feature {
		display: flex;
		gap: 24px;
		height: 320px;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 16px;
		background: var(--color-surface-1);
	}
	.skeleton-poster {
		width: 200px;
		border-radius: 8px;
		background: var(--color-surface-2);
	}
	.skeleton-copy {
		flex: 1;
		align-self: center;
	}
	.skeleton-copy div {
		height: 24px;
		margin: 16px 0;
		max-width: 300px;
		border-radius: 4px;
		background: var(--color-surface-2);
	}
	.skeleton-copy div:last-child {
		height: 44px;
		margin-top: 48px;
	}
	.skeleton-row {
		height: 140px;
		display: flex;
		align-items: center;
		gap: 18px;
		border-bottom: 1px solid var(--color-border);
	}
	.skeleton-row div {
		width: 66px;
		height: 88px;
		border-radius: 6px;
		background: var(--color-surface-2);
	}
	.skeleton-row span {
		width: 45%;
		height: 24px;
		background: var(--color-surface-2);
		border-radius: 4px;
	}
	@media (max-width: 640px) {
		.journal-skeleton {
			padding: 28px 0;
		}
		.skeleton-heading {
			height: 48px;
		}
		.skeleton-feature {
			height: 300px;
			gap: 14px;
			padding: 16px;
		}
		.skeleton-poster {
			width: 72px;
			height: 100px;
		}
	}
</style>
