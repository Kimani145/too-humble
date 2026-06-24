// =============================================================================
// TOO HUMBLE - PAYMENT SERVICE
// PayPal WebView + Daraja M-Pesa STK Push + ledger persistence
// =============================================================================

import { supabase } from '../lib/supabase';
import {
  DarajaSTKPushRequest,
  DarajaSTKPushResponse,
  MonetizationLedgerInsert,
  PaymentResult,
} from '../types/database.types';

// -----------------------------------------------------------------------
// Daraja constants — values injected from env or secure config
// -----------------------------------------------------------------------
const DARAJA_CONSUMER_KEY = process.env.EXPO_PUBLIC_DARAJA_CONSUMER_KEY ?? '';
const DARAJA_CONSUMER_SECRET = process.env.EXPO_PUBLIC_DARAJA_CONSUMER_SECRET ?? '';
const DARAJA_SHORTCODE = process.env.EXPO_PUBLIC_DARAJA_SHORTCODE ?? '174379';
const DARAJA_PASSKEY = process.env.EXPO_PUBLIC_DARAJA_PASSKEY ?? '';
const DARAJA_CALLBACK_URL = process.env.EXPO_PUBLIC_DARAJA_CALLBACK_URL ?? 'https://yourdomain.com/api/mpesa-callback';
const DARAJA_BASE = 'https://sandbox.safaricom.co.ke'; // Switch to api.safaricom.co.ke for production

// PayPal
const PAYPAL_CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Generate M-Pesa timestamp in YYYYMMDDHHmmss format */
function getDarajaTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

/** Generate the Daraja password = Base64(Shortcode + Passkey + Timestamp) */
function getDarajaPassword(timestamp: string): string {
  const raw = `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`;
  return btoa(raw);
}

/** Fetch Daraja OAuth2 access token */
async function getDarajaAccessToken(): Promise<string> {
  const credentials = btoa(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`);
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error(`Daraja auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// -----------------------------------------------------------------------
// persistLedgerEntry — write transaction outcome to Supabase
// -----------------------------------------------------------------------
export async function persistLedgerEntry(
  entry: MonetizationLedgerInsert
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('monetization_ledger').insert(entry);
  if (error) {
    console.error('[PaymentService] ledger persist error:', error.message);
    throw error;
  }
}

// -----------------------------------------------------------------------
// updateLedgerStatus — update ledger row after webhook callback
// -----------------------------------------------------------------------
export async function updateLedgerStatus(
  referenceId: string,
  status: 'success' | 'failed' | 'cancelled',
  metadata?: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('monetization_ledger')
    .update({ status, metadata: metadata ?? null })
    .eq('reference_id', referenceId);

  if (error) throw error;
}

// -----------------------------------------------------------------------
// initiateMpesaSTKPush — triggers M-Pesa STK push to user's phone
// -----------------------------------------------------------------------
export async function initiateMpesaSTKPush(params: {
  userId: string;
  phoneNumber: string; // Format: 254XXXXXXXXX
  amount: number;
  accountReference?: string;
  description?: string;
}): Promise<PaymentResult> {
  const { userId, phoneNumber, amount, accountReference = 'TooHumble', description = 'Too Humble Donation' } = params;

  // Validate phone
  if (!/^254\d{9}$/.test(phoneNumber)) {
    return {
      success: false,
      referenceId: '',
      amount,
      gateway: 'daraja',
      errorMessage: 'Invalid phone number. Use format 254XXXXXXXXX.',
    };
  }

  let accessToken: string;
  try {
    accessToken = await getDarajaAccessToken();
  } catch (err: unknown) {
    return {
      success: false,
      referenceId: '',
      amount,
      gateway: 'daraja',
      errorMessage: err instanceof Error ? err.message : 'Failed to authenticate with Daraja.',
    };
  }

  const timestamp = getDarajaTimestamp();
  const password = getDarajaPassword(timestamp);

  const requestBody: DarajaSTKPushRequest = {
    BusinessShortCode: DARAJA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amount),
    PartyA: phoneNumber,
    PartyB: DARAJA_SHORTCODE,
    PhoneNumber: phoneNumber,
    CallBackURL: DARAJA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: description,
  };

  try {
    const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await res.json()) as DarajaSTKPushResponse;

    if (!res.ok || data.ResponseCode !== '0') {
      throw new Error(data.ResponseDescription ?? 'STK Push failed.');
    }

    // Write pending ledger entry
    await persistLedgerEntry({
      user_id: userId,
      payment_gateway: 'daraja',
      amount,
      reference_id: data.CheckoutRequestID,
      phone_number: phoneNumber,
      currency: 'KES',
      status: 'pending',
      metadata: {
        MerchantRequestID: data.MerchantRequestID,
        CheckoutRequestID: data.CheckoutRequestID,
      },
    });

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
// handleMpesaCallback — call this from your webhook handler (edge function)
// Receives M-Pesa callback body and updates the ledger accordingly
// -----------------------------------------------------------------------
export async function handleMpesaCallback(callbackBody: {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: unknown }>;
      };
    };
  };
}): Promise<void> {
  const cb = callbackBody.Body.stkCallback;
  const isSuccess = cb.ResultCode === 0;

  const metadata: Record<string, unknown> = {
    ResultCode: cb.ResultCode,
    ResultDesc: cb.ResultDesc,
  };

  if (isSuccess && cb.CallbackMetadata) {
    cb.CallbackMetadata.Item.forEach((item) => {
      metadata[item.Name] = item.Value;
    });
  }

  await updateLedgerStatus(
    cb.CheckoutRequestID,
    isSuccess ? 'success' : 'failed',
    metadata
  );
}

// -----------------------------------------------------------------------
// getPayPalCheckoutUrl — returns the PayPal approval URL for WebView
// -----------------------------------------------------------------------
export function getPayPalCheckoutUrl(params: {
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}): string {
  const { amount, currency, description, returnUrl, cancelUrl } = params;
  const baseUrl = 'https://www.sandbox.paypal.com/checkoutnow'; // Use paypal.com for production

  const query = new URLSearchParams({
    token: '', // Will be filled by PayPal Orders API response
    'client-id': PAYPAL_CLIENT_ID,
    currency,
    amount: String(amount),
    intent: 'capture',
    'return-url': returnUrl,
    'cancel-url': cancelUrl,
  });

  // NOTE: In production, you would first create an order via PayPal Orders API
  // and use the returned approval_url from the response links[].
  // This returns a sandbox mock URL for client-side reference.
  return `${baseUrl}?${query.toString()}`;
}

// -----------------------------------------------------------------------
// persistPayPalSuccess — called after WebView detects return URL
// -----------------------------------------------------------------------
export async function persistPayPalSuccess(params: {
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
}): Promise<void> {
  await persistLedgerEntry({
    user_id: params.userId,
    payment_gateway: 'paypal',
    amount: params.amount,
    reference_id: params.orderId,
    currency: params.currency,
    status: 'success',
  });
}

// -----------------------------------------------------------------------
// getUserLedger — fetch all transactions for a user
// -----------------------------------------------------------------------
export async function getUserLedger(userId: string) {
  const { data, error } = await supabase
    .from('monetization_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
