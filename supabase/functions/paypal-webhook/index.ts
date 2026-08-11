// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: paypal-webhook
// Production Hardening Sprint — Payments Workstream
//
// Verifies PayPal webhook signature via PayPal API, then updates monetization_ledger.
//
// Security:
//   - Signature verification via PayPal /v1/notifications/verify-webhook-signature
//   - Idempotency: processed_webhook_log table (gateway, event_id) UNIQUE
//   - Final-state guard: will not overwrite success/failed/expired rows
//   - Raw body preserved for signature verification before JSON parse
//
// Endpoint: POST https://lefjnvaxiczwhqxaurrv.supabase.co/functions/v1/paypal-webhook
// Reference: https://developer.paypal.com/api/rest/webhooks/
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_CLIENT_ID          = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_CLIENT_SECRET      = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
const PAYPAL_WEBHOOK_ID         = Deno.env.get('PAYPAL_WEBHOOK_ID')!;
const PAYPAL_BASE               = Deno.env.get('PAYPAL_SANDBOX') === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TERMINAL_STATES = new Set(['success', 'failed', 'expired', 'cancelled']);

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayPalEventResource {
  id: string;
  amount?: { value: string; currency_code?: string };
}

interface PayPalEvent {
  id: string;           // Unique PayPal event ID — used as idempotency key
  event_type: string;
  resource: PayPalEventResource;
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

async function getPayPalAccessToken(): Promise<string> {
  const creds = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

async function verifyWebhookSignature(
  token: string,
  headers: Headers,
  rawBody: string,
  webhookId: string,
): Promise<boolean> {
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo:        headers.get('paypal-auth-algo'),
      cert_url:         headers.get('paypal-cert-url'),
      transmission_id:  headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id:       webhookId,
      webhook_event:    JSON.parse(rawBody) as unknown,
    }),
  });

  if (!verifyRes.ok) {
    console.warn(`[paypal-webhook] Signature verify API returned ${verifyRes.status}`);
    return false;
  }
  const { verification_status } = await verifyRes.json() as { verification_status: string };
  return verification_status === 'SUCCESS';
}

// ─── Ledger Update Helper ─────────────────────────────────────────────────────

async function updateLedger(
  orderId: string,
  newStatus: 'success' | 'failed',
  metadata: Record<string, unknown>,
  logPrefix: string,
): Promise<void> {
  // Final-state guard: fetch existing row
  const { data: existing, error: fetchError } = await adminClient
    .from('monetization_ledger')
    .select('id, status')
    .eq('reference_id', orderId)
    .maybeSingle();

  if (fetchError) {
    console.error(`${logPrefix} Ledger fetch error: ${fetchError.message}`);
    return;
  }

  if (!existing) {
    console.warn(`${logPrefix} No ledger row found for ${orderId} — orphan event`);
    return;
  }

  if (TERMINAL_STATES.has(existing.status)) {
    console.log(`${logPrefix} Ledger ${orderId} already '${existing.status}' — skipped`);
    return;
  }

  const { error: updateError } = await adminClient
    .from('monetization_ledger')
    .update({ status: newStatus, metadata })
    .eq('id', existing.id)
    .eq('status', 'pending');

  if (updateError) {
    console.error(`${logPrefix} Ledger update error: ${updateError.message}`);
  } else {
    console.log(`${logPrefix} Order ${orderId} → ${newStatus}`);
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const cid = correlationId();
  const logPrefix = `[paypal-webhook][${cid}]`;

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Read raw body before any parsing (required for signature verification) ──
  const rawBody = await req.text();

  // ── Parse Event ──────────────────────────────────────────────────────────────
  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!event.id || !event.event_type) {
    return jsonResponse({ error: 'Missing event.id or event.event_type' }, 400);
  }

  // ── Signature Verification ───────────────────────────────────────────────────
  try {
    const token   = await getPayPalAccessToken();
    const isValid = await verifyWebhookSignature(token, req.headers, rawBody, PAYPAL_WEBHOOK_ID);
    if (!isValid) {
      console.warn(`${logPrefix} Signature verification FAILED for event ${event.id}`);
      return new Response('Forbidden', { status: 403 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown verification error';
    console.error(`${logPrefix} Verification error: ${msg}`);
    return new Response('Signature verification error', { status: 500 });
  }

  // ── Idempotency Check ────────────────────────────────────────────────────────
  // Use PayPal's event.id as the idempotency key. PayPal guarantees this is
  // unique per event delivery attempt. Duplicate deliveries use the same event.id.
  const { error: logError } = await adminClient
    .from('processed_webhook_log')
    .insert({
      gateway:    'paypal',
      event_id:   event.id,
      event_type: event.event_type,
    });

  if (logError) {
    if (logError.code === '23505') {
      console.log(`${logPrefix} Duplicate event ${event.id} (${event.event_type}) — acknowledged`);
      return jsonResponse({ received: true });
    }
    console.error(`${logPrefix} Webhook log insert failed: ${logError.message}`);
    return jsonResponse({ error: 'Internal error logging webhook' }, 500);
  }

  // ── Dispatch by Event Type ───────────────────────────────────────────────────
  const orderId = event.resource?.id;

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      if (!orderId) {
        console.error(`${logPrefix} CAPTURE.COMPLETED missing resource.id`);
        return jsonResponse({ error: 'Missing resource ID' }, 400);
      }
      await updateLedger(
        orderId,
        'success',
        {
          paypal_capture_id: orderId,
          event_type: event.event_type,
          event_id: event.id,
          correlation_id: cid,
          amount: event.resource.amount,
        },
        logPrefix,
      );
      break;
    }

    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.REVERSED': {
      if (!orderId) {
        console.error(`${logPrefix} ${event.event_type} missing resource.id`);
        return jsonResponse({ error: 'Missing resource ID' }, 400);
      }
      await updateLedger(
        orderId,
        'failed',
        {
          event_type: event.event_type,
          event_id: event.id,
          correlation_id: cid,
        },
        logPrefix,
      );
      break;
    }

    default:
      // Unknown event type — acknowledge without action
      console.log(`${logPrefix} Unhandled event type: ${event.event_type} — acknowledged`);
  }

  return jsonResponse({ received: true });
});
