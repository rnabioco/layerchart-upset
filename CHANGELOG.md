# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Keyboard: the intersection bars and the set bars now use a roving tabindex, so the plot is two Tab stops (the
  focused or selected bar of each kind, else the first) instead of one per bar. Arrow keys, Home and End move the
  Tab stop with focus.
- `computeUpset` is faster. Rows are counted once per distinct membership mask, and `union` (and large `intersect`
  inputs) use a 2^n subset-sum table instead of looping over every combination per mask. 15 sets x 1e5 rows now take
  well under 2 s in every mode.
- `Intersection.items` is filled lazily, on the first read of any `items`, and only for the columns that survive the
  filters and `limit`. Output is otherwise identical.
- `mode: 'union'` throws above 24 sets (it used to run for minutes or return nothing). With `sortIntersectionsBy:
  'none'`, `union` columns now come in ascending combination-mask order.
- The default tooltip / `aria-label` text is computed once per column instead of on every pointer move.
- Duplicate set names, and precomputed intersections with a non-finite or negative `size` or a repeated `id`, now
  throw instead of producing wrong counts.

### Added

- `intersectionId(members)`: the id `computeUpset` gives a combination of sets.

### Fixed

- More than 31 sets no longer wrap the 32-bit mask and merge unrelated rows. `distinct` mode works for any number of
  sets; `intersect` and `union` throw above 30 (and `union` above 24).
- A set name containing `&` no longer collides with a combination: `&` and `\` inside a name are escaped in ids
  (`A\&B`). Ids of ordinary names are unchanged.
- A selected column that is no longer drawn (its set was hidden, a filter removed it) no longer leaves every other
  column dimmed. The selection value itself is left alone, so the column is highlighted again if it comes back.

## [0.5.0] - 2026-11-05

### Added

- `annotation` snippet and `annotationHeight`: an HTML row between the size bars and the matrix, rendered once per
  column with `{ intersection, index, x, width, height }`. Absent unless passed, so the default layout is unchanged.
  `AnnotationContext` is exported.
- `stackBy` (with `stackColors`, `stackOrder`, `stackLegend`): split each size bar into segments by a row attribute.
  Linear scale and `data` only; `stackSegments()` and the `StackBy` type are exported.
- `queries`: highlight subsets inside every column. Each `{ id, color, filter }` draws an overlay bar as tall as the
  number of the column's rows that pass `filter`; the default tooltip lists the counts. Works on every scale and is
  ignored (with a warning) for precomputed input or `keepItems: false`. `queryCounts()` and the `UpSetQuery` type are
  exported.
- `publish.yml`: stages the package on npm (`npm stage publish`, trusted publishing) when a GitHub release is
  published; approve it with `npm stage approve`.

### Changed

- Selections are easier to reset: a "Clear selection" button appears while a column or set is selected (`clearButton`,
  default on), and Esc now clears from anywhere once you have clicked the plot, not only when a bar has focus. Esc and
  the button clear the selected column and the selected set together. `controlled` plots still only call
  `onselect` / `onsetselect`.
- The documentation site is now the SvelteKit app itself, prerendered to static files with `adapter-static` and
  published on GitHub Pages: docs home (rendered from `docs/index.md`), `/demo` and the live gallery at `/gallery`.
  Zensical and the screenshot pipeline (`scripts/gallery.mjs`) are removed. The interactive demo moved from `/` to
  `/demo`.

## [0.4.0] - 2026-11-04

### Added

- Logarithmic size scales: `scale` (`'linear'` | `'log'` | `'symlog'`, bindable), `setScale` for the set-size
  panel, `scaleToggle` for a built-in button and `onscalechange(next, previous)`. `controlled` also keeps the
  toggle from assigning `scale`. Log draws no bar for sizes of 0 (labels stay); `symlog` shows 0. Theme the button
  with `--upset-control-fg`, `--upset-control-border`, `--upset-control-on`. Default output is unchanged.
- Browser tests accept `CHROME_PATH` to run against a local Chrome.
- Draft specs for follow-up work in `specs/`.
- `keepItems` option (default `true`): `false` leaves each intersection's `items` empty, for large inputs where only
  counts matter.
- `sortIntersectionsBy: 'sets'` orders intersections by set rank (the matrix row order): A, A&B, A&B&C, A&C, B, …
  `descending` (default) is that order, `ascending` reverses it.
- `normalize="total"` labels the size axes and bar labels as a percentage of all items (counts when the total is
  unknown). Bar lengths and tooltips are unchanged.
- `showEmpty` option: also lists combinations no item has, as size-0 columns (degree filters apply, `minSize`
  defaults to 0, ignored above 20 sets). Works with `data` and with precomputed intersections.
- `exportSVG(el)` and `exportPNG(el, scale)`: export the plot as a standalone SVG string or a PNG blob, with computed
  colors and fonts inlined.
- `toCSV(result, { items })` and `membersOf(result, id)` helpers for getting the data behind the bars; they return
  values and never write files.
- Set selection: clicking a set bar or row label (or Enter/Space on a set bar; Esc clears; Up/Down move) selects it.
  `selectedSet` is bindable, `onsetselect(set, previous)` reports, and columns without the set are dimmed.
  `controlled` applies. Set bars are now focusable buttons.
- README and docs table list the scale, set-selection and `keepItems` props.
- Interactive filtering: `minSize`, `maxSize`, `minDegree`, `maxDegree` and `limit` are now bindable, and
  `hiddenSets` (bindable) removes sets from the plot. `filterControls` renders a bar above the plot (min size, min and
  max degree, limit, a checkbox per set, reset); `onfilterchange(filters, previous)` reports every change. With
  `data` the intersections are recomputed without a hidden set; with precomputed `intersections`, columns that contain
  it are dropped. `controlled` applies: the controls then only call `onfilterchange` and snap back to the props.

### Changed

- `mode="intersect"` and `"union"` now enumerate combinations once per distinct membership instead of testing every
  row against all 2^n combinations; results and ordering are identical. Each bar's description is computed once per
  render.

## [0.3.0] - 2026-11-03

### Added

- `controlled` prop: when true, clicking, Enter/Space and Esc only call `onselect` and never assign `selected`, so the
  highlight, `aria-pressed` and outline follow the `selected` prop alone. Default `false` keeps today's behaviour,
  including `bind:selected` (#3).
- `onselect` now receives the intersection that was cleared (or previously selected) as a second argument:
  `onselect(selected, previous)`. Pressing the selected bar or Esc calls `onselect(null, previous)`. One-argument
  callers are unaffected (#4).
- Theme through CSS custom properties: `--upset-bar`, `--upset-bar-selected`, `--upset-dot-on`, `--upset-dot-off`,
  `--upset-text`, `--upset-grid`, `--upset-stripe`. A prop wins, then the property, then the previous default, so
  rendering is unchanged when nothing is set (#5).
- Report what `limit` and the size/degree filters hid: `onresult({ shown, total, hidden })` and an optional `footer`
  snippet; `UpSetResult.totalIntersections`; `intersectionsTotal` for precomputed input; new exports `reportOf` and
  `UpSetReport` (#6).
- `maxWidth` (px or CSS length) scrolls wide plots inside their own wrapper; `fit` with `minCellSize` (default 12)
  shrinks `cellSize` to the container. Keyboard focus scrolls an off-screen bar into view (#7).
- Interaction tests for each of the above; `npm run test:interact` runs every `test/interact/*.mjs`.

### Changed

- `color` and `inactiveColor` default to `undefined` (the same colours now come from CSS fallbacks).
- Grid lines and row stripes are coloured by `currentColor` at 12% / 6% alpha in the colour itself rather than via
  `stroke-opacity` / `fill-opacity`; rendering is identical.
- `UpSet` renders a `div.upset-scroll` wrapper around `.upset`; `class` and extra attributes still go on `.upset`.

## [0.2.1] - 2026-11-03

### Added

- MIT license (`LICENSE`, shipped in the package), plus `license`, `repository`, `homepage` and
  `bugs` in `package.json`, so consumers that audit third-party licences can build with this package.

## [0.2.0] - 2026-11-03

### Added

- Precomputed input: `intersections` (+ `setSizes`, `total`) as an alternative to per-item `data`;
  `fromIntersections()` exported. Given order is kept unless a sort is requested.
- Rich tooltip on intersection bars, columns and set bars: `tooltip` snippet, `describe`, `tooltips`,
  `onhover`; native `<title>` tooltips are replaced by it.
- Keyboard support: every bar is a Tab stop and `role="button"` with `aria-pressed`; Enter/Space
  select, Left/Right/Home/End move focus, Esc clears the selection. Focus shows the tooltip.
- Test hooks: `data-upset-bar`, `data-id`, `data-set`, `data-n`, `data-tip`, `data-upset-count`,
  `data-upset-row`, `data-upset-set-bar`, `data-upset-column`; extra attributes (e.g. `data-upset`)
  are forwarded to the root element.
- Row labels: `setLabels`, `emphasizedSets`, `emphasisMarker`, `maxLabelLength`.
- Layout: `showSetSizes`, `minSlots`, `yTicks`, `formatSize`; selected bar gets an outline.
- Browser interaction test (`npm run test:interact`).

### Changed

- `data` is optional; matrix columns are no longer focusable (their bar is the focus target).
- `npm install` from the git repository now builds `dist/` (`prepare` runs `svelte-package`).

## [0.1.0] - 2026-11-03

Initial release.

### Added

- `UpSet` Svelte 5 component built on [LayerChart](https://www.layerchart.com/): intersection-size
  bars, set-size bars and a membership matrix, kept aligned with shared band scales.
- ComplexUpset-style API: rows with one boolean column per set (`data`, `sets`).
- Intersection `mode`: `distinct`, `intersect`, `union`.
- Sorting (`sortIntersectionsBy`/`Order`, `sortSetsBy`/`Order`) and filtering
  (`minSize`, `maxSize`, `minDegree`, `maxDegree`, `limit`).
- Interaction: hover highlighting, click-to-select (`bind:selected`, `onselect`), keyboard support,
  native tooltips.
- Styling props: `color` (string or per-intersection function), `setColors`, `highlightColor`,
  `inactiveColor`, `dimOpacity`, `dotRadius`, `connectorWidth`, `barPadding`, `barRadius`,
  `fontSize`, `cellSize`, `barHeight`, `setBarWidth`, `labelWidth`, `showLabels`, `stripes`,
  `intersectionLabel`, `setLabel`.
- `computeUpset()` and types exported for use without the component.
- Demo page, gallery of optional settings, and a documentation site published with Zensical on
  GitHub Pages.
- CI (type check, unit tests, build + publint) and Dependabot for npm and GitHub Actions.

[Unreleased]: https://github.com/rnabioco/layerchart-upset/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/rnabioco/layerchart-upset/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/rnabioco/layerchart-upset/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/rnabioco/layerchart-upset/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/rnabioco/layerchart-upset/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rnabioco/layerchart-upset/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rnabioco/layerchart-upset/releases/tag/v0.1.0
