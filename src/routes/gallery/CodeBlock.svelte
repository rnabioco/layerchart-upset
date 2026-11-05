<script lang="ts">
	// A collapsed, syntax-highlighted code block. `html` is shiki output from `examples.server.ts`.
	let { html, label = 'Show code' }: { html?: string | null; label?: string } = $props();
</script>

{#if html}
	<details class="code">
		<summary>{label}</summary>
		{@html html}
	</details>
{/if}

<style>
	.code {
		margin: 0.75rem 0 0;
		font-size: 12px;
	}
	summary {
		cursor: pointer;
		color: var(--muted);
		user-select: none;
	}
	.code :global(pre) {
		margin: 0.5rem 0 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--rule);
		border-radius: 6px;
		overflow-x: auto;
		line-height: 1.5;
		tab-size: 2;
	}
	.code :global(pre code) {
		display: block;
		margin: 0;
		padding: 0;
		background: none;
		white-space: pre;
		font-size: 12px;
	}
</style>
