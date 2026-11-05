export { default as UpSet } from './UpSet.svelte';
export { computeUpset, fromIntersections, intersectionId, membersOf, queryCounts, stackSegments, summarize, toCSV } from './upset.js';
export { exportSVG, exportPNG } from './export.js';
export type { ExportOptions } from './export.js';
export type {
	AnnotationContext,
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
	Summary,
	UpSetReport,
	UpSetResult,
	UpSetMode,
	UpSetScale
} from './upset.js';
