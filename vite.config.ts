import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The site (docs home, demo, gallery) builds to plain static files in build/, published on GitHub Pages
			// by .github/workflows/docs.yml with BASE_PATH=/layerchart-upset. Unset in dev and in tests.
			adapter: adapter({ pages: 'build', assets: 'build' }),
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` }
		})
	]
});
