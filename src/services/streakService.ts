import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  LAST_DATE:      '@too_humble:last_read_date',
  STREAK:         '@too_humble:reading_streak_days',
  LAST_REFERENCE: '@too_humble:last_read_reference',
} as const;

export interface ReadingStreak {
  days:          number;
  lastReference: string | null;
}

export async function recordChapterRead(bookName: string, chapter: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastDateRaw = await AsyncStorage.getItem(KEYS.LAST_DATE);
  const streakRaw   = await AsyncStorage.getItem(KEYS.STREAK);
  const current     = parseInt(streakRaw ?? '0', 10);

  let newStreak = current;
  if (!lastDateRaw) {
    newStreak = 1;
  } else {
    const last = new Date(lastDateRaw);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastStr = last.toISOString().split('T')[0];
    const yestStr = yesterday.toISOString().split('T')[0];

    if (lastStr === today) {
      // Already recorded today — no-op on streak count, just update reference
      newStreak = current;
    } else if (lastStr === yestStr) {
      // Consecutive day — increment
      newStreak = current + 1;
    } else {
      // Gap — reset
      newStreak = 1;
    }
  }

  await AsyncStorage.multiSet([
    [KEYS.LAST_DATE, today],
    [KEYS.STREAK, String(newStreak)],
    [KEYS.LAST_REFERENCE, `${bookName} ${chapter}`],
  ]);
}

export async function getReadingStreak(): Promise<ReadingStreak> {
  const [streakRaw, lastRef] = await Promise.all([
    AsyncStorage.getItem(KEYS.STREAK),
    AsyncStorage.getItem(KEYS.LAST_REFERENCE),
  ]);
  return {
    days:          parseInt(streakRaw ?? '0', 10),
    lastReference: lastRef,
  };
}
