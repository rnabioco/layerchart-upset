export const genres = ['Drama', 'Comedy', 'Action', 'Thriller', 'Romance', 'Sci-Fi'];
const weights = [0.5, 0.4, 0.25, 0.2, 0.15, 0.1];

/** Deterministic pseudo-random genre membership (movies-like toy data). */
export function makeData(n = 600, seed = 42) {
	const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
	return Array.from({ length: n }, (_, i) => {
		// `era` is derived from the index (no random draw), so the genre memberships are unchanged.
		const row: Record<string, unknown> = { id: i, era: i < 200 ? '1990s' : i < 420 ? '2000s' : '2010s' };
		genres.forEach((g, j) => (row[g] = rand() < weights[j]));
		// `rating` is a pure function of the index and the memberships (no random draw), so nothing above changes.
		const noise = ((i * 7919) % 101) / 101 + ((i * 104729) % 53) / 53 - 1; // about -1..1
		row.rating = Math.round((5 + 0.5 * genres.filter((g) => row[g]).length + 1.6 * noise) * 10) / 10;
		return row;
	});
}
