export { default as UpSet } from './UpSet.svelte';
export { computeUpset, fromIntersections, membersOf, queryCounts, stackSegments, toCSV } from './upset.js';
export { exportSVG, exportPNG } from './export.js';
export type { ExportOptions } from './export.js';
export type {
	CsvOptions,
	Intersection,
	PrecomputedIntersection,
	PrecomputedOptions,
	SetInfo,
	TooltipContext,
	UpSetFilters,
	UpSetOptions,
	UpSetQuery,
	StackBy,
	StackResult,
	UpSetReport,
	UpSetResult,
	UpSetMode,
	UpSetScale
} from './upset.js';
