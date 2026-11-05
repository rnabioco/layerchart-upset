# Issue specs

Drafts, one per issue, in the order they should land. Each has acceptance criteria, target paths, expected test
names and non-goals. Numbering continues from v0.3.0 (#7); `S1` is the first to implement.

Cross-cutting non-goals: no UI widget per prop; no download buttons inside the component (return strings/Blobs);
no change to the grid template or `.upset-scroll` structure (issue-7 width tests depend on it); additive only
before 1.0 unless noted.

---

## S1 — Log / symlog / linear size scale  *(implemented in this branch)*

**API** (`src/lib/UpSet.svelte`, `src/lib/upset.ts`, `src/lib/index.ts`)

```ts
type UpSetScale = 'linear' | 'log' | 'symlog';
scale?: UpSetScale        // $bindable, default 'linear'; both bar panels
setScale?: UpSetScale     // set-size panel override, defaults to `scale`
scaleToggle?: boolean     // render the toggle button, default false
onscalechange?: (next: UpSetScale, previous: UpSetScale) => void
```

**Acceptance**
- Default output is unchanged (linear, no toggle, no new DOM except `data-scale` on `.upset`).
- `log`: domain `[0.5, top]` with `top` rounded up to a power of 10; no `nice`; size <= 0 draws no bar but keeps
  label, `data-n`, `aria-label`, focusability. Bar height is monotone in log(size).
- `symlog`: `scaleSymlog().constant(1)`, domain `[0, top]`, ticks `0, 1, 10, 100, ...`.
- Ticks go through `formatSize`; explicit `yTicks` wins, non-positive values dropped under `log`.
- Set panel gets a small bottom axis when non-linear.
- Toggle: `<button aria-pressed data-upset-scale-toggle>` in `.corner`; cycles linear <-> log, using `symlog` when any
  shown size is 0. Without `controlled` it assigns `scale` (`bind:scale` works); with `controlled` it only calls
  `onscalechange`. Toggle never writes `scale` when `controlled`.
- Theming: `--upset-control-fg` -> `--upset-text` -> `currentColor`; `--upset-control-border` -> `--upset-grid`;
  `--upset-control-on` -> `--upset-bar`.

**Tests**: vitest `scale_log_floor_and_top`, `scale_log_ticks`, `scale_symlog_ticks`, `scale_zero_clamped`;
interact `test/interact/issue-8-scale.mjs`: `log_bar_heights_follow_log_ratio`, `zero_size_bar_keeps_label`,
`controlled_toggle_only_notifies`, `uncontrolled_toggle_binds`, `set_scale_override_independent`.

**Non-goals**: stacking under log; per-bar scale; animation.

---

## S2 — Faster intersect/union and per-bar render cost

- `computeUpset` `intersect` mode enumerates subsets of each row's own membership, not all 2^n combos
  (`upset.ts` ~L144). Output identical to today (test against old implementation on random data).
- Optional `keepItems?: boolean` (default true) to drop `items` duplication.
- `describe(d)` computed once per bar; tooltip memoised per id (`UpSet.svelte` ~L419-431).
- Tests: `intersect_matches_bruteforce`, `keep_items_false_empties_items`; 15 sets x 1e5 rows finishes < 2 s.
- Non-goals: canvas renderer, web workers.

## S3 — `sortIntersectionsBy: 'sets'`

Add union member; order by set rank (ComplexUpset/UpSetR). Tests: `sort_by_sets_orders_by_set_rank`,
`sort_by_sets_respects_order_flag`. Additive.

## S4 — Item export helpers

Pure `toCSV(result, { items? })` and `membersOf(result, id)` exported from `index.ts`. No download UI.
Tests: `to_csv_escapes_quotes`, `members_of_unknown_id_is_empty`. Non-goal: file writing.

## S5 — Set-row selection

`selectedSet` (bindable, follows `controlled`) and `onsetselect(set|null, previous)`. Set bars get role/click/keys;
columns not containing the set dim. Tests: `set_select_dims_other_columns`, `controlled_set_select_only_notifies`.
Non-goal: multi-select.

## S6 — Query overlays

*Reviewed.* `queries?: { id: string; color: string; filter(item: T): boolean }[]`.

- Each query draws an overlay bar in every column: same x and width as the size bar, height = number of the column's
  `items` that pass `filter`, painted in array order (later on top; list the largest first). Queries are subsets of
  the column, not a partition, so overlays are not stacked. Zero counts draw nothing.
- Works on every scale (heights go through `sizeScale`/`clampSize` like the bars); the earlier "linear only" is dropped.
- Overlays are `pointer-events: none`, so click, hover and keyboard stay on the base bar. The tooltip text and
  `aria-label` gain ` · {id}: n` per query; `data-upset-query={id}` and `data-n` on each overlay.
- Counts come from `items`: needs `data` and `keepItems !== false`. With precomputed `intersections` or
  `keepItems: false` the prop is ignored with one `console.warn`.
- Counts are memoized per result, not recomputed per render or pointer move.
- Exports as part of the bar panel (S8 needs no change).
- Non-goals: legend, per-query sorting/filtering, side-by-side bars, overlays on the set-size panel.
- Tests: `query_counts_match_filter`, `query_ignored_without_items` (unit); `query_overlay_heights`,
  `query_does_not_block_select` (browser).

## S7 — Empty intersections  *(implemented)*

`showEmpty?: boolean`: add absent combinations as size-0 columns. Under `scale='log'` uses `symlog`.
Tests: `show_empty_adds_missing_combinations`, `show_empty_respects_degree_filter`.

## S8 — SVG/PNG export  *(implemented; the tooltip, filter bar and footer are not exported)*

`exportSVG(el): string` composes the three panel SVGs and inlines computed fills (CSS custom properties are lost on
clone); `exportPNG(el, scale): Promise<Blob>`. Tests: `export_svg_has_all_bars`, `export_inlines_colors`.

## S9 — Stacked bars by attribute

*Reviewed.* `stackBy?: keyof T | ((item: T) => string)`, `stackColors?: Record<string, string>`,
`stackOrder?: string[]`, `stackLegend?: boolean`.

- A column's bar is split into one segment per category among its `items`; segment heights are category counts and
  sum to the column size.
- **Precedence:** with `stackBy`, segment colors replace the bar fill (`stackColors[cat]`, else a built-in
  categorical palette indexed by `stackOrder`). `color`/`colorOf` still colors the matrix dots and connectors, and
  the selected outline and dimming apply to the whole column.
- Order bottom to top is `stackOrder`, default categories by overall count, descending; ties alphabetical.
  Missing or null values are the category `"(none)"`.
- Implementation shape: the existing bar `Rect` stays as the interactive base (events, `data-*`, outline) with its
  fill hidden; segments are drawn above it with `pointer-events: none` and only the top segment gets the rounded
  corners.
- Scales: linear only. Under `log`/`symlog` draw the unstacked totals and warn once, since stacked segments have no
  meaning on a log axis.
- Needs `data` and `keepItems !== false`, same warn-and-ignore as S6. `stackBy` and S6 `queries` together: `stackBy`
  wins, `queries` ignored with a warn.
- `stackLegend` renders an HTML legend row above the plot with swatches in the same order; it sits outside the grid
  like the filter bar and is not exported.
- Tooltip and `aria-label` gain ` · {cat}: n` per non-empty category.
- Non-goals: normalized (100%) stacks, stacking the set-size panel, interactive legend filtering.
- Tests: `stack_segments_sum_to_size`, `stack_order_default_by_count`, `stack_log_falls_back` (unit);
  `stack_segment_colors`, `stack_keeps_selection`, `stack_legend_matches_segments` (browser).

## S10 — Per-column annotation snippet

*Reviewed.* `annotation?: Snippet<[AnnotationContext<T>]>` with `{ intersection, index, x, width, height }`, and
`annotationHeight?: number` (default 24).

- Placement: a new grid row **between the size bars and the matrix**, added only when `annotation` is set, so the
  default layout stays identical. `grid-template-rows` gains one entry, and the set panel and corner cells get an
  empty spacer in that row. The cross-cutting "no grid change" rule is relaxed for this one prop; the issue-7 width
  and scroll tests must still pass untouched.
- The row is HTML, not SVG: one wrapper per column positioned at the matrix column's `x` (relative to the matrix,
  after `labelWidth`) with the column `width`, containing the snippet. This lets callers render text, badges or
  inline sparklines. Pass-through pointer events; the snippet owns its own interactivity.
- Dimming follows the column (`opacity(id)`), selection does not restyle the annotation.
- Wide plots: the row sits inside `.upset`, so it scrolls and fits with the plot.
- S8 export: HTML annotations are not exported; document it. (SVG-only export is the stated contract.)
- Non-goals: annotation above the size bars, a row for sets, built-in annotation types, per-column heights.
- Tests: `annotation_row_absent_by_default`, `annotation_aligned_with_columns` (x/width equal the bar's),
  `annotation_follows_dimming`, and the existing width tests unchanged (browser).

## S11 — Percent axis  *(implemented as labels only: bar lengths and tooltips are unchanged)*

`normalize?: 'none' | 'total'`. Disabled when `result.total` is not finite (precomputed without `total`).

---

## S12 — Interactive filtering

layerchart only draws (scales, axes, SVG marks); interactivity is plain Svelte state, so filtering needs nothing
from it. The filters already exist as props (`minSize`, `maxSize`, `minDegree`, `maxDegree`, `limit`); this makes
them user-drivable.

- Make `minSize`, `maxSize`, `minDegree`, `maxDegree`, `limit` `$bindable`; add `onfilterchange(filters, previous)`.
  `controlled` applies (controlled: callback only).
- `filterControls?: boolean` renders a compact bar (min size, min/max degree, limit) in a `.controls` row outside
  the grid, so grid template and issue-7 width tests are untouched. Theming reuses the `--upset-control-*` properties.
- `hiddenSets` (bindable string[]): clicking a set label/bar (needs S5) hides that row and recomputes intersections.
  `Alt`-click isolates; a "reset" button clears.
- Tests: `bind_min_size_filters_bars`, `controlled_filter_only_notifies`, `hide_set_recomputes_intersections`,
  `onresult_follows_filter` (the footer count from #6 stays correct).
- Non-goals: free-text search over items, saved filter presets, filter-by-attribute (needs S6/S9 first).
