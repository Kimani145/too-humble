// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: mpesa-query
// Queries Daraja STK Push transaction status. Read-only DB perspective.
// Input:  { userId: string, checkoutRequestId: string }
// Output: { ResultCode, ResultDesc, CheckoutRequestID }
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DARAJA_CONSUMER_KEY = Deno.env.get('DARAJA_CONSUMER_KEY')!;
const DARAJA_CONSUMER_SECRET = Deno.env.get('DARAJA_CONSUMER_SECRET')!;
const DARAJA_SHORTCODE = Deno.env.get('DARAJA_SHORTCODE')!;
const DARAJA_PASSKEY = Deno.env.get('DARAJA_PASSKEY')!;
const DARAJA_BASE = Deno.env.get('DARAJA_SANDBOX') === 'true'
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

  let body: { userId: string; checkoutRequestId: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { userId, checkoutRequestId } = body;

  if (!userId || !checkoutRequestId) {
    return new Response(JSON.stringify({ error: 'Missing required fields: userId, checkoutRequestId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate JWT user against body.userId if Bearer token is provided
  const authHeader = req.headers.get('Authorization');
  let authUser: { id: string } | null = null;

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session token' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        });
      }
      authUser = user;
      if (authUser.id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden: User identity mismatch' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Verify that checkoutRequestId belongs to the authenticated user
  const { data: ledgerRow, error: ledgerError } = await adminClient
    .from('monetization_ledger')
    .select('user_id')
    .eq('reference_id', checkoutRequestId)
    .maybeSingle();

  if (ledgerError || !ledgerRow) {
    return new Response(JSON.stringify({ error: 'Transaction reference not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (authUser && ledgerRow.user_id !== authUser.id) {
    return new Response(JSON.stringify({ error: 'Forbidden: Transaction does not belong to user' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getDarajaToken();
    const timestamp = getDarajaTimestamp();
    const password = btoa(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`);

    const queryBody = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const queryRes = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryBody),
    });

    const queryData = await queryRes.json();

    return new Response(
      JSON.stringify({
        ResultCode: queryData.ResultCode ?? queryData.ResponseCode ?? '-1',
        ResultDesc: queryData.ResultDesc ?? queryData.ResponseDescription ?? 'Query executed',
        CheckoutRequestID: checkoutRequestId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[mpesa-query]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
