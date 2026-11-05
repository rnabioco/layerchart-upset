// Ordered gallery topics. Read by the gallery layout, the index page and scripts/gallery.mjs
// (which parses this file, so keep each entry on the `{ slug: '…', title: '…', blurb: '…' }` shape).
export const topics = [
	{ slug: 'basics', title: 'Basics', blurb: 'Modes, sorting, filtering, set order and colors.' },
	{
		slug: 'interaction',
		title: 'Interaction',
		blurb: 'Selection, tooltips, controlled mode and set selection.'
	},
	{
		slug: 'layout',
		title: 'Layout',
		blurb: 'Sizing, axis titles, maxWidth, fit and percent axes.'
	},
	{
		slug: 'data',
		title: 'Data',
		blurb: 'Precomputed intersections, empty combinations and export.'
	},
	{ slug: 'scales', title: 'Scales', blurb: 'Linear, log and symlog size scales.' },
	{ slug: 'filters', title: 'Filters', blurb: 'Hidden counts and filter controls.' },
	{ slug: 'theming', title: 'Theming', blurb: 'Dark theme and CSS custom properties.' }
] as const;
