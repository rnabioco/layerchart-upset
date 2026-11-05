<script lang="ts">
	import img from '../../docs/upset.png';

	let { data } = $props();
	const html = $derived(data.html.replace('src="upset.png"', `src="${img}"`));

	async function copy(e: MouseEvent) {
		const btn = (e.target as Element).closest<HTMLButtonElement>('button.copy');
		const code = btn?.parentElement?.querySelector('pre');
		if (!btn || !code) return;
		try {
			await navigator.clipboard.writeText(code.textContent ?? '');
			btn.textContent = 'Copied';
		} catch {
			btn.textContent = 'Press Ctrl+C';
			const range = document.createRange();
			range.selectNodeContents(code);
			getSelection()?.removeAllRanges();
			getSelection()?.addRange(range);
		}
		setTimeout(() => (btn.textContent = 'Copy'), 1500);
	}
</script>

<svelte:head>
	<title>layerchart-upset</title>
</svelte:head>

<!-- Copy buttons live inside the prerendered HTML, so one delegated handler serves them all. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<main class="docs" onclick={copy}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</main>

<style>
	.docs {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1rem 1.5rem 4rem;
		line-height: 1.55;
	}
	.docs :global(img) {
		max-width: 100%;
	}
	.docs :global(h1),
	.docs :global(h2) {
		margin-top: 1.8em;
		line-height: 1.2;
	}
	.docs :global(h1) {
		margin-top: 0.5em;
	}
	.docs :global(h2) {
		border-bottom: 1px solid var(--rule);
		padding-bottom: 0.2em;
	}
	.docs :global(pre) {
		overflow-x: auto;
		padding: 0.8rem 1rem;
		background: var(--code-bg) !important; /* shiki sets its own */
		border-radius: 6px;
		font-size: 0.85em;
	}
	.docs :global(.code) {
		position: relative;
	}
	.docs :global(.copy) {
		position: absolute;
		top: 0.4rem;
		right: 0.5rem;
		font: inherit;
		font-size: 0.75em;
		padding: 0.15rem 0.5rem;
		color: var(--muted);
		background: var(--bg);
		border: 1px solid var(--rule);
		border-radius: 4px;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.docs :global(.code:hover .copy),
	.docs :global(.copy:focus-visible) {
		opacity: 1;
	}
	@media (hover: none) {
		.docs :global(.copy) {
			opacity: 1;
		}
	}
	.docs :global(code) {
		background: var(--code-bg);
		padding: 0.1em 0.3em;
		border-radius: 3px;
		font-size: 0.9em;
	}
	.docs :global(pre code) {
		background: none;
		padding: 0;
	}
	.docs :global(table) {
		border-collapse: collapse;
		display: block;
		overflow-x: auto;
		font-size: 0.9em;
	}
	.docs :global(th),
	.docs :global(td) {
		border: 1px solid var(--rule);
		padding: 0.3rem 0.6rem;
		text-align: left;
		vertical-align: top;
	}
	.docs :global(a) {
		color: var(--link);
	}
</style>
