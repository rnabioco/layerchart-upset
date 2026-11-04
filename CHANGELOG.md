# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/rnabioco/layerchart-upset/releases/tag/v0.1.0
