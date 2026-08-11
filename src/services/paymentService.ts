// =============================================================================
// TOO HUMBLE - PAYMENT SERVICE
// Production Hardening Sprint — Payments Workstream
//
// PayPal WebView + Daraja M-Pesa (via Edge Functions) + ledger read/pending check
//
// SECURITY NOTE:
// Daraja credentials (consumer key/secret/passkey) MUST NOT be in the client.
// All M-Pesa STK Push calls go through supabase/functions/mpesa-initiate
// which holds secrets in env vars server-side.
//
// PayPal order creation goes through supabase/functions/paypal-create-order.
// Only PAYPAL_CLIENT_ID (a public identifier) is acceptable client-side.
// =============================================================================

import { supabase } from '../lib/supabase';
import {
  MonetizationLedger,
  PaymentResult,
} from '../types/database.types';

// Edge Function base URL — derived from the Supabase project URL
const EDGE_FUNCTION_BASE = (): string => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${supabaseUrl}/functions/v1`;
};

// -----------------------------------------------------------------------
// getAuthHeaders — attach session token to Edge Function requests
// -----------------------------------------------------------------------
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// -----------------------------------------------------------------------
// initiateMpesaSTKPush — calls the mpesa-initiate Edge Function
// Credentials are entirely server-side. Client sends only user data.
// -----------------------------------------------------------------------
export async function initiateMpesaSTKPush(params: {
  userId: string;
  phoneNumber: string; // Format: 254XXXXXXXXX
  amount: number;
}): Promise<PaymentResult> {
  const { userId, phoneNumber, amount } = params;

  if (!/^254\d{9}$/.test(phoneNumber)) {
    return {
      success: false,
      referenceId: '',
      amount,
      gateway: 'daraja',
      errorMessage: 'Invalid phone number. Use format 254XXXXXXXXX.',
    };
  }

  if (amount < 1) {
    return {
      success: false,
      referenceId: '',
      amount,
      gateway: 'daraja',
      errorMessage: 'Minimum donation is KES 1.',
    };
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${EDGE_FUNCTION_BASE()}/mpesa-initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, phone: phoneNumber, amount }),
    });

    const data = await res.json() as { CheckoutRequestID?: string; error?: string };

    if (!res.ok || !data.CheckoutRequestID) {
      throw new Error(data.error ?? 'STK Push failed');
    }

    return {
      success: true,
      referenceId: data.CheckoutRequestID,
      amount,
      gateway: 'daraja',
    };
  } catch (err: unknown) {
    return {
      success: false,
      referenceId: '',
      amount,
      gateway: 'daraja',
      errorMessage: err instanceof Error ? err.message : 'STK Push request failed.',
    };
  }
}

// -----------------------------------------------------------------------
// createPayPalOrder — calls the paypal-create-order Edge Function
// Returns the PayPal approval URL for the WebView
// -----------------------------------------------------------------------
export async function createPayPalOrder(params: {
  userId: string;
  amount: number;
}): Promise<{ approvalUrl: string; orderId: string }> {
  const { userId, amount } = params;

  const headers = await getAuthHeaders();
  const res = await fetch(`${EDGE_FUNCTION_BASE()}/paypal-create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, amount }),
  });

  const data = await res.json() as { approvalUrl?: string; orderId?: string; error?: string };

  if (!res.ok || !data.approvalUrl || !data.orderId) {
    throw new Error(data.error ?? 'Failed to create PayPal order');
  }

  return { approvalUrl: data.approvalUrl, orderId: data.orderId };
}

// -----------------------------------------------------------------------
// getUserLedger — fetch all transactions for a user (SELECT-only RLS)
// -----------------------------------------------------------------------
export async function getUserLedger(userId: string): Promise<MonetizationLedger[]> {
  const { data, error } = await supabase
    .from('monetization_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MonetizationLedger[];
}

// -----------------------------------------------------------------------
// getPendingTransaction — check if user has an unresolved M-Pesa payment
// Returns the most recent 'pending' daraja row, or null.
// Used by MonetizationScreen to surface a "complete your payment" prompt.
// -----------------------------------------------------------------------
export async function getPendingMpesaTransaction(
  userId: string,
): Promise<MonetizationLedger | null> {
  const { data, error } = await supabase
    .from('monetization_ledger')
    .select('*')
    .eq('user_id', userId)
    .eq('payment_gateway', 'daraja')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[paymentService] getPendingMpesaTransaction:', error.message);
    return null;
  }
  return data as MonetizationLedger | null;
}

// -----------------------------------------------------------------------
// retryMpesaSTKPush — resend STK Push for an existing pending transaction
// A new STK Push is initiated with the SAME amount and phone number.
// The previous 'pending' row will be expired by the DB cron job after 10 min.
// A new 'pending' row will be created by mpesa-initiate.
// -----------------------------------------------------------------------
export async function retryMpesaSTKPush(params: {
  userId: string;
  phoneNumber: string;
  amount: number;
}): Promise<PaymentResult> {
  // Delegate to the same initiation path — the cron job handles expiring the old row
  return initiateMpesaSTKPush(params);
}
