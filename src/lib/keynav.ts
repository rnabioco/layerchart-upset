export interface BarKeys {
	/** Container searched for the sibling bars. */
	root: Element | undefined;
	/** CSS selector matching every bar in the group, in tab order. */
	selector: string;
	/** Keys that move to the previous / next bar (Home and End always work). */
	prev: string;
	next: string;
	/** Enter or Space. */
	activate: () => void;
	/** Escape. */
	clear: () => void;
}

/**
 * Keyboard handling shared by the intersection bars and the set bars: Enter/Space activate, Escape clears,
 * the arrow keys (and Home/End) move the focus between the bars of the same group.
 */
export function barKeydown(e: KeyboardEvent, { root, selector, prev, next, activate, clear }: BarKeys) {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		activate();
		return;
	}
	if (e.key === 'Escape') {
		e.preventDefault(); // handled here, not again by the window listener
		clear();
		return;
	}
	const bars = Array.from(root?.querySelectorAll<SVGElement>(selector) ?? []);
	const at = bars.indexOf(e.currentTarget as SVGElement);
	const to =
		e.key === next ? at + 1
		: e.key === prev ? at - 1
		: e.key === 'Home' ? 0
		: e.key === 'End' ? bars.length - 1
		: null;
	if (to != null && bars[to]) {
		e.preventDefault();
		bars[to].focus();
	}
}
