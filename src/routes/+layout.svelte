<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import './theme.css';
	import ThemeToggle from './ThemeToggle.svelte';

	let { children } = $props();

	const links = [
		{ href: resolve('/'), label: 'Docs', exact: true },
		{ href: resolve('/demo'), label: 'Demo' },
		{ href: resolve('/gallery'), label: 'Gallery' }
	];
	const current = (l: { href: string; exact?: boolean }) => {
		const path = page.url.pathname.replace(/\/$/, '');
		const href = l.href.replace(/\/$/, '');
		return (l.exact ? path === href : path === href || path.startsWith(`${href}/`)) ? 'page' : undefined;
	};
</script>

<div class="site">
	<header>
		<a class="brand" href={resolve('/')}>layerchart-upset</a>
		<nav aria-label="Site">
			{#each links as l (l.href)}
				<a href={l.href} aria-current={current(l)}>{l.label}</a>
			{/each}
			<a href="https://www.npmjs.com/package/layerchart-upset">npm</a>
			<a href="https://github.com/rnabioco/layerchart-upset">GitHub</a>
			<ThemeToggle />
		</nav>
	</header>
	{@render children()}
</div>

<style>
	.site {
		font-family: system-ui, sans-serif;
		color: var(--fg);
	}
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--bg);
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1.5rem;
		padding: 0.8rem 1.5rem;
		border-bottom: 1px solid var(--rule);
	}
	.brand {
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1.1rem;
	}
	nav a {
		color: var(--link);
		text-decoration: none;
	}
	nav a[aria-current='page'] {
		color: inherit;
		font-weight: 600;
	}
	nav a:hover {
		text-decoration: underline;
	}
</style>
