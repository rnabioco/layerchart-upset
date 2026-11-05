<script lang="ts">
	import { resolve } from '$app/paths';
	import { topics } from './topics.js';
</script>

<p class="lede">Optional settings on the same dataset (600 items, 6 genres), grouped by topic.</p>

<ul class="topics">
	{#each topics as t (t.slug)}
		<li><a href={resolve(`/gallery/${t.slug}`)}>{t.title}</a> — {t.blurb}</li>
	{/each}
</ul>
