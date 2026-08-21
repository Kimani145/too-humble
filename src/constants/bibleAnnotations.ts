export interface HighlightColor {
  id:    string;
  hex:   string;
  label: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { id: 'gold',   hex: '#FFD166', label: 'Gold' },
  { id: 'mint',   hex: '#06D6A0', label: 'Mint' },
  { id: 'sky',    hex: '#4FC3F7', label: 'Sky' },
  { id: 'rose',   hex: '#F48FB1', label: 'Rose' },
  { id: 'violet', hex: '#CE93D8', label: 'Violet' },
] as const;

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].hex;

// AsyncStorage cache key for chapter annotations
export const annotationCacheKey = (
  userId: string,
  translationId: string,
  bookId: string,
  chapter: number
): string => `@too_humble:annotations_${userId}_${translationId}_${bookId}_${chapter}`;
