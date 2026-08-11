// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: mpesa-callback
// Production Hardening Sprint — Payments Workstream
//
// Receives Safaricom STK Push webhook, validates, and updates monetization_ledger.
// MUST be registered as callback URL in Daraja portal.
//
// Security:
//   - Safaricom IP allowlist enforced in production (DARAJA_SANDBOX != 'true')
//   - Idempotency: processed_webhook_log table (gateway, event_id) UNIQUE
//   - Final-state guard: will not overwrite success/failed/expired rows
//
// Endpoint: POST https://lefjnvaxiczwhqxaurrv.supabase.co/functions/v1/mpesa-callback
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IS_SANDBOX                = Deno.env.get('DARAJA_SANDBOX') === 'true';

// Safaricom production IP allowlist (https://developer.safaricom.co.ke)
const SAFARICOM_IPS = new Set([
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129',
  '196.201.212.136', '196.201.212.74',  '196.201.212.69',
]);

// Terminal states — a row in any of these must never be overwritten by a webhook
const TERMINAL_STATES = new Set(['success', 'failed', 'expired', 'cancelled']);

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function correlationId(): string {
  return crypto.randomUUID();
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const cid = correlationId();
  const logPrefix = `[mpesa-callback][${cid}]`;

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── IP Allowlist (production only) ──────────────────────────────────────────
  if (!IS_SANDBOX) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    if (!SAFARICOM_IPS.has(clientIp)) {
      console.warn(`${logPrefix} Rejected IP: ${clientIp}`);
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ── Parse Body ───────────────────────────────────────────────────────────────
  let body: MpesaCallbackBody;
  try {
    body = await req.json() as MpesaCallbackBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) {
    return jsonResponse({ error: 'Malformed callback body' }, 400);
  }

  const checkoutId = cb.CheckoutRequestID;
  const resultCode = cb.ResultCode;

  // ── Idempotency Check (processed_webhook_log) ────────────────────────────────
  // Attempt to INSERT a record. If the UNIQUE constraint (gateway, event_id) fires,
  // this is a duplicate delivery — return 200 immediately (Safaricom expects 200).
  const { error: logError } = await adminClient
    .from('processed_webhook_log')
    .insert({
      gateway:    'daraja',
      event_id:   checkoutId,
      event_type: 'stk_callback',
      result_code: resultCode,
    });

  if (logError) {
    if (logError.code === '23505') {
      // Duplicate key — already processed
      console.log(`${logPrefix} Duplicate webhook for ${checkoutId} — acknowledged, no action`);
      return jsonResponse({ ResultCode: 0, ResultDesc: 'Already processed' });
    }
    // Unexpected log error — do not proceed to avoid phantom state
    console.error(`${logPrefix} Webhook log insert failed: ${logError.message}`);
    return jsonResponse({ error: 'Internal error logging webhook' }, 500);
  }

  // ── Final-State Guard ────────────────────────────────────────────────────────
  // Check if the ledger row is already in a terminal state before touching it.
  const { data: existing, error: fetchError } = await adminClient
    .from('monetization_ledger')
    .select('id, status')
    .eq('reference_id', checkoutId)
    .maybeSingle();

  if (fetchError) {
    console.error(`${logPrefix} Ledger fetch error: ${fetchError.message}`);
    return jsonResponse({ error: 'Ledger fetch failed' }, 500);
  }

  if (!existing) {
    // No ledger row — this can happen if mpesa-initiate ledger write failed.
    // Log and return 200 so Safaricom doesn't retry endlessly.
    console.warn(`${logPrefix} No ledger row found for ${checkoutId} — orphan callback`);
    return jsonResponse({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  if (TERMINAL_STATES.has(existing.status)) {
    console.log(`${logPrefix} Ledger row ${checkoutId} already in terminal state '${existing.status}' — no update`);
    return jsonResponse({ ResultCode: 0, ResultDesc: 'Already in final state' });
  }

  // ── Build Update Payload ─────────────────────────────────────────────────────
  const isSuccess = resultCode === 0;
  const newStatus = isSuccess ? 'success' : 'failed';

  const metadata: Record<string, unknown> = {
    ResultCode: resultCode,
    ResultDesc: cb.ResultDesc,
    correlation_id: cid,
  };

  if (isSuccess && cb.CallbackMetadata?.Item) {
    for (const item of cb.CallbackMetadata.Item) {
      metadata[item.Name] = item.Value;
    }
  }

  // ── Apply Ledger Update ──────────────────────────────────────────────────────
  const { error: updateError } = await adminClient
    .from('monetization_ledger')
    .update({ status: newStatus, metadata })
    .eq('id', existing.id)
    .eq('status', 'pending'); // Extra guard: only update if still pending

  if (updateError) {
    console.error(`${logPrefix} Ledger update error: ${updateError.message}`);
    return jsonResponse({ error: updateError.message }, 500);
  }

  console.log(`${logPrefix} ${checkoutId} → ${newStatus} | ResultCode: ${resultCode}`);
  return jsonResponse({ ResultCode: 0, ResultDesc: 'Accepted' });
});
