<script lang="ts">
	import { UpSet } from '../../../lib/index.js';
	import { genres, makeData } from '../../demo-data.js';

	const data = makeData();
	let selectedDark = $state<string | null>('Drama&Comedy');
</script>

<div class="grid">
	<section class="dark">
		<h2>Dark theme</h2>
		<code>color="#63b3ed" inactiveColor="#3b4252" highlightColor="#f6ad55" bind:selected</code>
		<div class="chart">
			<UpSet
				{data}
				sets={genres}
				minSize={8}
				color="#63b3ed"
				inactiveColor="#3b4252"
				highlightColor="#f6ad55"
				bind:selected={selectedDark}
			/>
		</div>
	</section>

	<section>
		<h2>Green theme via --upset variables</h2>
		<p class="desc">Set <code>--upset-*</code> variables on any ancestor; the colors follow.</p>
		<code>{`<div style="--upset-bar: #2f855a; --upset-dot-on: #2f855a; --upset-dot-off: #e2e8f0"> <UpSet … /> </div>`}</code>
		<div class="chart" style="--upset-bar: #2f855a; --upset-dot-on: #2f855a; --upset-dot-off: #e2e8f0">
			<UpSet {data} sets={genres} minSize={25} />
		</div>
	</section>

	<section class="themed">
		<h2>CSS custom properties</h2>
		<p class="desc">Default look. The browser tests set the variables on this section to check each one.</p>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={25} />
		</div>
	</section>
</div>
