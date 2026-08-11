// =============================================================================
// TOO HUMBLE - ADMOB & DONOR AD SUPPRESSION SERVICE (TD-MON-001 / TD-MON-003)
// Handles ad consent checks and donor ad suppression logic.
// Donors with successful payments are exempted from seeing ads for 30 days.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const AD_SUPPRESSION_KEY = '@too_humble:donor_ad_suppression';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface SuppressionStatus {
  isSuppressed: boolean;
  reason?: 'donor' | 'none';
  expiresAt?: string;
}

/**
 * Check if ads should be suppressed for the current user.
 * Donors who have made a successful payment (`status = 'success'`)
 * have ads suppressed across the app for 30 days.
 */
export async function getAdSuppressionStatus(userId: string | null): Promise<SuppressionStatus> {
  if (!userId) {
    return { isSuppressed: false, reason: 'none' };
  }

  try {
    // 1. Check local AsyncStorage cache first for fast startup
    const cached = await AsyncStorage.getItem(`${AD_SUPPRESSION_KEY}_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached) as { suppressedUntil: number };
      if (Date.now() < parsed.suppressedUntil) {
        return {
          isSuppressed: true,
          reason: 'donor',
          expiresAt: new Date(parsed.suppressedUntil).toISOString(),
        };
      }
    }

    // 2. Query Supabase monetization_ledger for any successful payment by user
    const { data, error } = await supabase
      .from('monetization_ledger')
      .select('created_at, updated_at')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[adService] Error checking donor status:', error.message);
      return { isSuppressed: false, reason: 'none' };
    }

    if (data) {
      // User is a verified donor! Suppress ads for 30 days from latest donation
      const donationTime = new Date(data.updated_at || data.created_at).getTime();
      const suppressedUntil = Math.max(Date.now() + THIRTY_DAYS_MS, donationTime + THIRTY_DAYS_MS);

      await AsyncStorage.setItem(
        `${AD_SUPPRESSION_KEY}_${userId}`,
        JSON.stringify({ suppressedUntil })
      );

      return {
        isSuppressed: true,
        reason: 'donor',
        expiresAt: new Date(suppressedUntil).toISOString(),
      };
    }

    return { isSuppressed: false, reason: 'none' };
  } catch (err: unknown) {
    console.error('[adService] Exception checking ad suppression:', err);
    return { isSuppressed: false, reason: 'none' };
  }
}

/**
 * Manually trigger donor suppression cache refresh (e.g. after a successful payment callback).
 */
export async function markUserAsDonor(userId: string): Promise<void> {
  const suppressedUntil = Date.now() + THIRTY_DAYS_MS;
  await AsyncStorage.setItem(
    `${AD_SUPPRESSION_KEY}_${userId}`,
    JSON.stringify({ suppressedUntil })
  );
}
