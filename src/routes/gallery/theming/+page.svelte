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

	<section class="themed">
		<h2>CSS custom properties</h2>
		<code>no colour props; --upset-bar, --upset-dot-off, ... set on an ancestor</code>
		<div class="chart">
			<UpSet {data} sets={genres} minSize={25} />
		</div>
	</section>
</div>
