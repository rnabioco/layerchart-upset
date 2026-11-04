# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/).

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

[0.2.1]: https://github.com/rnabioco/layerchart-upset/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rnabioco/layerchart-upset/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rnabioco/layerchart-upset/releases/tag/v0.1.0
