<script lang="ts">
	import img from '../../docs/upset.png';

	let { data } = $props();
	const html = $derived(data.html.replace('src="upset.png"', `src="${img}"`));
</script>

<svelte:head>
	<title>layerchart-upset</title>
</svelte:head>

<main class="docs">
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
		background: var(--code-bg);
		border-radius: 6px;
		font-size: 0.85em;
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
