<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';

	// The theme itself lives on <html data-theme>, set before paint by app.html; this only flips and remembers it.
	let dark = $state(false);
	onMount(() => {
		dark = document.documentElement.dataset.theme === 'dark';
	});
	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* private mode: the choice just lasts for this page */
		}
	}
</script>

<button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" title="Dark mode" onclick={toggle}>
	<Sun class="sun" size={16} aria-hidden="true" />
	<Moon class="moon" size={16} aria-hidden="true" />
</button>

<style>
	button {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.4rem;
		color: inherit;
		background: none;
		border: 1px solid var(--rule);
		border-radius: 6px;
		cursor: pointer;
	}
	button:hover {
		background: var(--code-bg);
	}
	/* the icon shows what a click switches to, so it follows the page theme, not the component state */
	button :global(.moon) {
		display: none;
	}
	:global(:root[data-theme='dark']) button :global(.sun) {
		display: none;
	}
	:global(:root[data-theme='dark']) button :global(.moon) {
		display: block;
	}
</style>
