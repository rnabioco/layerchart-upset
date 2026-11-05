<script lang="ts">
	import { onMount } from 'svelte';

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
	<svg class="sun" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
	</svg>
	<svg class="moon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
	</svg>
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
	.moon {
		display: none;
	}
	:global(:root[data-theme='dark']) .sun {
		display: none;
	}
	:global(:root[data-theme='dark']) .moon {
		display: block;
	}
</style>
