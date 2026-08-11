export const WEB_BREAKPOINTS = {
  MEDIUM:  768,   // sidebar + main, no context panel
  WIDE:    1200,  // sidebar + main + context panel
} as const;

export const WEB_GRID = {
  SIDEBAR_COLLAPSED:  64,
  SIDEBAR_EXPANDED:   240,
  CONTEXT_PANEL_WIDTH: 300,
  CONTENT_MAX_WIDTH:   1600,  // absolute maximum for ultra-wide monitors
  CONTENT_PADDING:     28,
} as const;

export const WEB_COLORS = {
  CONTEXT_BG:    '#111827',  // dark mode: slightly lighter than page bg
  CONTEXT_BG_LT: '#F0F4FF',  // light mode: matches backgroundPrimary
  CARD_BORDER:   'rgba(255,255,255,0.06)',
  CARD_BORDER_LT: '#DDE3F0',
} as const;
