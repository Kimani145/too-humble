// =============================================================================
// TOO HUMBLE - DESIGN TOKENS & CONSTANTS
// =============================================================================

export const LIGHT_COLORS = {
  // Brand
  primary: '#1A2B5E',      // Deep navy blue
  primaryLight: '#2C4A9E', // Lighter navy
  primaryDark: '#0E1B3D',  // Darker navy
  accent: '#F0A500',       // Gold/amber
  accentLight: '#FFD166',  // Light gold

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F7F8FC',
  lightGray: '#E8ECF4',
  midGray: '#A0A9C0',
  darkGray: '#4A5578',
  charcoal: '#1C2333',
  black: '#0A0D16',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlay
  overlayDark: 'rgba(10,13,22,0.7)',
  overlayLight: 'rgba(255,255,255,0.12)',
  glassMorph: 'rgba(255,255,255,0.08)',

  // Backgrounds
  backgroundPrimary: '#F7F8FC',
  backgroundSecondary: '#ECEEF5',
  backgroundCard: '#FFFFFF',
} as const;

export const DARK_COLORS = {
  // Brand
  primary: '#0E1B3D',      // Darker navy blue for headers
  primaryLight: '#1A2B5E', // Navy
  primaryDark: '#070E20',  // Deep black-navy
  accent: '#F0A500',       // Gold/amber
  accentLight: '#FFD166',  // Light gold

  // Neutrals
  white: '#1E2538',        // Dark grey-blue for cards
  offWhite: '#0F1322',     // Very dark background
  lightGray: '#2C354E',    // Dark border/grey
  midGray: '#6C7A9C',
  darkGray: '#A2AFCC',     // Light grey for secondary text
  charcoal: '#F0F3FA',     // Near white for title text
  black: '#FFFFFF',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlay
  overlayDark: 'rgba(7,14,32,0.85)',
  overlayLight: 'rgba(255,255,255,0.06)',
  glassMorph: 'rgba(0,0,0,0.4)',

  // Backgrounds
  backgroundPrimary: '#0F1322',
  backgroundSecondary: '#151B2F',
  backgroundCard: '#1E2538',
} as const;

export const COLORS = LIGHT_COLORS;


export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#1A2B5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

// AO Lab Bible API base URL
export const BIBLE_API_BASE = 'https://bible-api.com';

// Daraja API (M-Pesa) endpoints
export const DARAJA_BASE_URL = 'https://api.safaricom.co.ke';
export const DARAJA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';

// PayPal
export const PAYPAL_CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

// Supabase storage bucket names
export const STORAGE_BUCKETS = {
  communityUploads: 'community-uploads',
  avatars: 'avatars',
} as const;

// Community post limits
export const MAX_IMAGE_SIZE_KB = 7168; // 7 MB
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;
export const MAX_CAPTION_LENGTH = 500;

// Calendar — how many past days are browsable
export const CALENDAR_LOOKBACK_DAYS = 30;

// Pagination
export const PAGE_SIZE = 15;
