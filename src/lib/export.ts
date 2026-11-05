const SVG_NS = 'http://www.w3.org/2000/svg';

/** Computed style properties copied onto each exported element, because CSS classes and custom properties do not survive a clone. */
const PROPS = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'opacity',
	'color',
	'font-family',
	'font-size',
	'font-weight',
	'text-anchor',
	'dominant-baseline',
	'visibility',
	'overflow',
	'display'
] as const;

export interface ExportOptions {
	/** Fill behind the plot. Default: the plot's own computed background, or white if that is transparent. */
	background?: string;
}

function inline(src: Element, dst: Element) {
	const cs = getComputedStyle(src);
	let style = '';
	for (const p of PROPS) style += `${p}:${cs.getPropertyValue(p)};`;
	dst.setAttribute('style', style);
	for (const a of ['class', 'tabindex', 'role', 'data-tip', 'aria-pressed']) dst.removeAttribute(a);
	const a = [...src.children];
	const b = [...dst.children];
	for (let i = 0; i < a.length; i++) if (b[i]) inline(a[i], b[i]);
}

function backgroundOf(el: Element): string {
	for (let n: Element | null = el; n; n = n.parentElement) {
		const c = getComputedStyle(n).backgroundColor;
		if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
	}
	return '#ffffff';
}

/**
 * Compose the plot's SVG panels into one standalone SVG document. `el` is the plot root (the element
 * with class `upset`, or anything containing it). Computed fills, strokes and fonts are inlined so the
 * file renders the same outside the page. Interactive attributes are dropped; `data-*` ids are kept.
 */
export function exportSVG(el: Element, options: ExportOptions = {}): string {
	const root = el.matches('.upset') ? el : (el.querySelector('.upset') ?? el);
	const box = root.getBoundingClientRect();
	const svgs = [...root.querySelectorAll<SVGSVGElement>('.panel svg')].filter((s) => !s.parentElement?.closest('svg'));
	if (!svgs.length) throw new Error('exportSVG: no UpSet panels found');
	const w = Math.ceil(box.width);
	const h = Math.ceil(box.height);

	const out = document.createElementNS(SVG_NS, 'svg');
	out.setAttribute('xmlns', SVG_NS);
	out.setAttribute('width', String(w));
	out.setAttribute('height', String(h));
	out.setAttribute('viewBox', `0 0 ${w} ${h}`);

	const bg = document.createElementNS(SVG_NS, 'rect');
	bg.setAttribute('width', '100%');
	bg.setAttribute('height', '100%');
	bg.setAttribute('fill', options.background ?? backgroundOf(root));
	out.appendChild(bg);

	for (const svg of svgs) {
		const r = svg.getBoundingClientRect();
		const copy = svg.cloneNode(true) as SVGSVGElement;
		inline(svg, copy);
		copy.setAttribute('x', String(r.left - box.left));
		copy.setAttribute('y', String(r.top - box.top));
		copy.setAttribute('width', String(r.width));
		copy.setAttribute('height', String(r.height));
		copy.removeAttribute('class');
		out.appendChild(copy);
	}
	return new XMLSerializer().serializeToString(out);
}

/** Rasterize {@link exportSVG} to a PNG. `scale` multiplies the pixel size (default 2). */
export async function exportPNG(el: Element, scale = 2, options: ExportOptions = {}): Promise<Blob> {
	const svg = exportSVG(el, options);
	const m = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
	const img = new Image();
	const loaded = new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej(new Error('exportPNG: could not render the SVG'));
	});
	img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	await loaded;
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(Number(m[1]) * scale);
	canvas.height = Math.round(Number(m[2]) * scale);
	const ctx = canvas.getContext('2d')!;
	ctx.scale(scale, scale);
	ctx.drawImage(img, 0, 0);
	return new Promise((res, rej) =>
		canvas.toBlob((b) => (b ? res(b) : rej(new Error('exportPNG: canvas produced no data'))), 'image/png')
	);
}
