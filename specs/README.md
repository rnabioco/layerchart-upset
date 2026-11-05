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

`queries: { id, color, filter(item) }[]` draws a sub-bar per query. Requires `data` (not precomputed input);
linear scale only (warn otherwise). Tests: `query_counts_match_filter`.

## S7 — Empty intersections  *(implemented)*

`showEmpty?: boolean`: add absent combinations as size-0 columns. Under `scale='log'` uses `symlog`.
Tests: `show_empty_adds_missing_combinations`, `show_empty_respects_degree_filter`.

## S8 — SVG/PNG export  *(implemented; the tooltip, filter bar and footer are not exported)*

`exportSVG(el): string` composes the three panel SVGs and inlines computed fills (CSS custom properties are lost on
clone); `exportPNG(el, scale): Promise<Blob>`. Tests: `export_svg_has_all_bars`, `export_inlines_colors`.

## S9 — Stacked bars by attribute

`stackBy?: keyof T | (item) => string`, `stackColors`. Linear only; under log draws totals and warns. Needs a spec
review first (touches Rect loop and colour precedence).

## S10 — Per-column annotation snippet

`annotation?: Snippet<[{ intersection, x, width }]>`, `annotationHeight`. Spec review first.

## S11 — Percent axis

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
