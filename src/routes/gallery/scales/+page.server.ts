import raw from './+page.svelte?raw';
import { loadExamples } from '../examples.server.js';

export const load = () => loadExamples(raw);
