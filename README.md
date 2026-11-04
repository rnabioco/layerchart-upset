# layerchart-upset

An [UpSet plot](https://upset.app/) Svelte 5 component built on [LayerChart](https://www.layerchart.com/),
with an API modelled on R's [ComplexUpset](https://krassowski.github.io/complex-upset/).

![UpSet plot](docs/upset.png)

```svelte
<script>
  import { UpSet } from 'layerchart-upset';
  // one row per item, one boolean column per set
  const data = [{ A: true, B: false, C: true }, /* ... */];
</script>

<UpSet {data} sets={['A', 'B', 'C']} minSize={2} bind:selected />
```

## Props

| prop | default | |
|---|---|---|
| `data`, `sets` | – | rows with boolean membership columns, and the column names |
| `mode` | `'distinct'` | `distinct` (exclusive), `intersect` (inclusive), `union` |
| `sortIntersectionsBy` / `Order` | `cardinality` / `descending` | or `degree`, `none` |
| `sortSetsBy` / `Order` | `cardinality` / `descending` | |
| `minSize` `maxSize` `minDegree` `maxDegree` `limit` | – | filter intersections |
| `cellSize` `barHeight` `setBarWidth` `labelWidth` | 28 200 150 120 | layout, px |
| `color` `inactiveColor` `showLabels` `stripes` | | styling |
| `selected` (bindable), `onselect` | | click a column to select it |

`computeUpset(data, sets, options)` is exported for use without the component.

Run `npm run dev` for the demo page.
