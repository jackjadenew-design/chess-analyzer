/**
 * NAG (Numeric Annotation Glyph) utilities.
 * Standard NAGs defined by FIDE and used in PGN files.
 */

export interface NagInfo {
  /** Display symbol shown in move list, e.g. "!!" */
  symbol: string;
  /** Human-readable description */
  label: string;
  /** Tailwind color class for the symbol */
  colorClass: string;
}

export const NAG_MAP: Record<string, NagInfo> = {
  '$1':  { symbol: '!',  label: 'Good move',       colorClass: 'text-green-400' },
  '$2':  { symbol: '?',  label: 'Mistake',          colorClass: 'text-red-400' },
  '$3':  { symbol: '!!', label: 'Brilliant move',   colorClass: 'text-accent-500' },
  '$4':  { symbol: '??', label: 'Blunder',          colorClass: 'text-red-600' },
  '$5':  { symbol: '!?', label: 'Interesting move', colorClass: 'text-blue-400' },
  '$6':  { symbol: '?!', label: 'Dubious move',     colorClass: 'text-orange-400' },
  '$7':  { symbol: '□',  label: 'Forced move',      colorClass: 'text-surface-400' },
  '$10': { symbol: '=',  label: 'Equal position',   colorClass: 'text-surface-400' },
  '$13': { symbol: '∞',  label: 'Unclear position', colorClass: 'text-surface-400' },
  '$14': { symbol: '⩲',  label: 'Slight advantage (White)', colorClass: 'text-accent-300' },
  '$15': { symbol: '⩱',  label: 'Slight advantage (Black)', colorClass: 'text-accent-300' },
  '$16': { symbol: '±',  label: 'Advantage (White)', colorClass: 'text-accent-400' },
  '$17': { symbol: '∓',  label: 'Advantage (Black)', colorClass: 'text-accent-400' },
  '$18': { symbol: '+−', label: 'Decisive advantage (White)', colorClass: 'text-accent-500' },
  '$19': { symbol: '−+', label: 'Decisive advantage (Black)', colorClass: 'text-accent-500' },
};

/** Quick-access annotation buttons shown in the UI */
export const ANNOTATION_BUTTONS: Array<{ nag: string; symbol: string; label: string }> = [
  { nag: '$3',  symbol: '!!', label: 'Brilliant' },
  { nag: '$1',  symbol: '!',  label: 'Good' },
  { nag: '$5',  symbol: '!?', label: 'Interesting' },
  { nag: '$6',  symbol: '?!', label: 'Dubious' },
  { nag: '$2',  symbol: '?',  label: 'Mistake' },
  { nag: '$4',  symbol: '??', label: 'Blunder' },
];

/** Get display symbol(s) for a list of NAG strings */
export function formatNags(nags: string[]): string {
  return nags
    .map((nag) => NAG_MAP[nag]?.symbol ?? '')
    .filter(Boolean)
    .join('');
}

/** Get combined color class (uses the "worst" NAG's color) */
export function getNagColorClass(nags: string[]): string {
  if (nags.includes('$4')) return NAG_MAP['$4'].colorClass;
  if (nags.includes('$2')) return NAG_MAP['$2'].colorClass;
  if (nags.includes('$3')) return NAG_MAP['$3'].colorClass;
  if (nags.includes('$1')) return NAG_MAP['$1'].colorClass;
  if (nags.includes('$5')) return NAG_MAP['$5'].colorClass;
  if (nags.includes('$6')) return NAG_MAP['$6'].colorClass;
  return 'text-surface-400';
}
