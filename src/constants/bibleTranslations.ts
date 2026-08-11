// =============================================================================
// TOO HUMBLE - BIBLE TRANSLATIONS CONSTANTS
// Web & Mobile constants for the new AO Lab Bible API integration.
// =============================================================================

export const AO_LAB_BASE = 'https://bible.helloao.org/api';

export type CanonType = 'protestant' | 'catholic';

export interface BibleTranslationMeta {
  id:           string;   // API translation ID (e.g., 'BSB', 'KJV', 'LSG')
  label:        string;   // User-facing display name
  language:     string;   // ISO 639 code ('en', 'fr', 'sw')
  languageLabel: string;  // 'English', 'French', 'Swahili', etc.
  canon:        CanonType;
  available:    boolean;  // false = show "Coming Soon" in UI
}

export const BUNDLED_TRANSLATIONS: BibleTranslationMeta[] = [
  {
    id: 'BSB',      label: 'Berean Study Bible',   language: 'en',
    languageLabel: 'English',  canon: 'protestant', available: true,
  },
  {
    id: 'KJV',      label: 'King James Version',   language: 'en',
    languageLabel: 'English',  canon: 'protestant', available: true,
  },
  {
    id: 'LSG',      label: 'Louis Segond',          language: 'fr',
    languageLabel: 'French',   canon: 'protestant', available: true,
  },
  {
    // BSK deal pending — placeholder, available: false renders "Coming Soon"
    id: 'BSK_SW',   label: 'Biblia Takatifu (BSK)', language: 'sw',
    languageLabel: 'Kiswahili', canon: 'protestant', available: false,
  },
];

export const DEFAULT_TRANSLATION_ID = 'BSB';

// Map of translation IDs that are KNOWN to be Catholic-canon.
// The actual book list comes from the API — this just informs the UI label.
export const CATHOLIC_TRANSLATION_IDS = new Set<string>(['DRC', 'VULGATA']);

// Books that exist in the Catholic canon but not the Protestant canon.
// Used for safety reset when switching to a Protestant translation.
export const DEUTEROCANONICAL_COMMON_NAMES = new Set<string>([
  'Tobit', 'Judith', '1 Maccabees', '2 Maccabees',
  'Wisdom', 'Sirach', 'Baruch', 'Ecclesiasticus',
]);
