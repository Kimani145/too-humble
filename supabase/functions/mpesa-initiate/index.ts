// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: mpesa-initiate
// Triggers M-Pesa STK Push. Credentials live ONLY in Supabase env vars.
// Input:  { userId: string, phone: string, amount: number }
// Output: { CheckoutRequestID: string }
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These MUST be set in supabase/functions/.env (or via dashboard)
// NEVER exposed to client bundle
const DARAJA_CONSUMER_KEY = Deno.env.get('DARAJA_CONSUMER_KEY')!;
const DARAJA_CONSUMER_SECRET = Deno.env.get('DARAJA_CONSUMER_SECRET')!;
const DARAJA_SHORTCODE = Deno.env.get('DARAJA_SHORTCODE')!;
const DARAJA_PASSKEY = Deno.env.get('DARAJA_PASSKEY')!;
const DARAJA_CALLBACK_URL = Deno.env.get('DARAJA_CALLBACK_URL')!;
const DARAJA_BASE = Deno.env.get('DARAJA_SANDBOX') === 'true'
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Supabase client with service role — bypasses RLS for ledger writes
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getDarajaTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

async function getDarajaToken(): Promise<string> {
  const creds = btoa(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`);
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token as string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: { userId: string; phone: string; amount: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { userId, phone, amount } = body;

  if (!userId || !phone || !amount) {
    return new Response(JSON.stringify({ error: 'Missing required fields: userId, phone, amount' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!/^254\d{9}$/.test(phone)) {
    return new Response(JSON.stringify({ error: 'Invalid phone format. Use 254XXXXXXXXX' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (amount < 1) {
    return new Response(JSON.stringify({ error: 'Minimum amount is KES 1' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getDarajaToken();
    const timestamp = getDarajaTimestamp();
    const password = btoa(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`);

    const stkBody = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: DARAJA_CALLBACK_URL,
      AccountReference: 'TooHumble',
      TransactionDesc: 'Too Humble Donation',
    };

    const stkRes = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkBody),
    });

    const stkData = await stkRes.json();
    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      throw new Error(stkData.ResponseDescription ?? 'STK Push failed');
    }

    // Write pending ledger row using service role (bypasses RLS)
    const { error: ledgerError } = await adminClient.from('monetization_ledger').insert({
      user_id: userId,
      payment_gateway: 'daraja',
      amount,
      currency: 'KES',
      status: 'pending',
      reference_id: stkData.CheckoutRequestID,
      phone_number: phone,
      metadata: {
        MerchantRequestID: stkData.MerchantRequestID,
        CheckoutRequestID: stkData.CheckoutRequestID,
      },
    });

    if (ledgerError) {
      console.error('[mpesa-initiate] ledger write error:', ledgerError.message);
    }

    return new Response(
      JSON.stringify({ CheckoutRequestID: stkData.CheckoutRequestID }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[mpesa-initiate]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
