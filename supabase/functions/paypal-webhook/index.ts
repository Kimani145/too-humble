// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: paypal-webhook
// Verifies PayPal webhook signature and updates monetization_ledger on capture
// Reference: https://developer.paypal.com/api/rest/webhooks/
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
const PAYPAL_WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID')!;
const PAYPAL_BASE = Deno.env.get('PAYPAL_SANDBOX') === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  if (!res.ok) throw new Error(`PayPal auth: ${res.status}`);
  const { access_token } = await res.json();
  return access_token as string;
}

async function verifyWebhookSignature(
  token: string,
  headers: Headers,
  rawBody: string,
  webhookId: string
): Promise<boolean> {
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!verifyRes.ok) return false;
  const { verification_status } = await verifyRes.json();
  return verification_status === 'SUCCESS';
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const rawBody = await req.text();

  let event: { event_type: string; resource: { id: string; amount?: { value: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  try {
    const token = await getPayPalAccessToken();
    const isValid = await verifyWebhookSignature(token, req.headers, rawBody, PAYPAL_WEBHOOK_ID);

    if (!isValid) {
      console.warn('[paypal-webhook] Signature verification FAILED');
      return new Response('Forbidden', { status: 403 });
    }
  } catch (err: unknown) {
    console.error('[paypal-webhook] Verification error:', err);
    return new Response('Verification error', { status: 500 });
  }

  // Only handle capture completion
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const orderId = event.resource?.id;
    if (!orderId) {
      return new Response('Missing resource ID', { status: 400 });
    }

    const { error } = await adminClient
      .from('monetization_ledger')
      .update({
        status: 'success',
        metadata: { paypal_capture_id: orderId, event_type: event.event_type },
      })
      .eq('reference_id', orderId);

    if (error) {
      console.error('[paypal-webhook] ledger update error:', error.message);
      return new Response(error.message, { status: 500 });
    }

    console.log(`[paypal-webhook] Capture confirmed: ${orderId}`);
  } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
    const orderId = event.resource?.id;
    if (orderId) {
      await adminClient
        .from('monetization_ledger')
        .update({ status: 'failed', metadata: { event_type: event.event_type } })
        .eq('reference_id', orderId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
