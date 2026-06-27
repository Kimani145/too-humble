// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: mpesa-callback
// Receives Safaricom webhook, validates, updates monetization_ledger
// Must be registered as callback URL in Daraja portal
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Optional: Safaricom IP allowlist for production security
const SAFARICOM_IP_ALLOWLIST = [
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129',
  '196.201.212.136', '196.201.212.74', '196.201.212.69',
];

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CallbackMetadataItem {
  Name: string;
  Value: unknown;
}

interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: CallbackMetadataItem[];
      };
    };
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // IP validation (optional, enable in production)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const isProd = Deno.env.get('DARAJA_SANDBOX') !== 'true';
  if (isProd && clientIp && !SAFARICOM_IP_ALLOWLIST.includes(clientIp)) {
    console.warn(`[mpesa-callback] Rejected IP: ${clientIp}`);
    return new Response('Forbidden', { status: 403 });
  }

  let body: MpesaCallbackBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const cb = body?.Body?.stkCallback;
  if (!cb || !cb.CheckoutRequestID) {
    return new Response(JSON.stringify({ error: 'Malformed callback body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const isSuccess = cb.ResultCode === 0;
  const newStatus = isSuccess ? 'success' : 'failed';

  const metadata: Record<string, unknown> = {
    ResultCode: cb.ResultCode,
    ResultDesc: cb.ResultDesc,
  };

  if (isSuccess && cb.CallbackMetadata?.Item) {
    for (const item of cb.CallbackMetadata.Item) {
      metadata[item.Name] = item.Value;
    }
  }

  const { error } = await adminClient
    .from('monetization_ledger')
    .update({ status: newStatus, metadata })
    .eq('reference_id', cb.CheckoutRequestID);

  if (error) {
    console.error('[mpesa-callback] ledger update error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[mpesa-callback] ${cb.CheckoutRequestID} → ${newStatus}`);
  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
