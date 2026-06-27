// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: paypal-create-order
// Creates a PayPal order server-side and returns the approvalUrl for WebView
// Input:  { userId: string, amount: number }
// Output: { approvalUrl: string, orderId: string }
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
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
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token as string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: { userId: string; amount: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { userId, amount } = body;
  if (!userId || !amount || amount < 1) {
    return new Response(JSON.stringify({ error: 'Missing or invalid fields: userId, amount (min $1)' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getPayPalAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
          description: 'Too Humble Donation',
        }],
        application_context: {
          brand_name: 'Too Humble',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: 'toohumble://payment/paypal/success',
          cancel_url: 'toohumble://payment/paypal/cancel',
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(orderData.message ?? 'Failed to create PayPal order');

    const approvalLink = orderData.links?.find(
      (l: { rel: string; href: string }) => l.rel === 'approve'
    );

    if (!approvalLink) throw new Error('No approval URL returned by PayPal');

    // Write pending ledger row using service role
    const { error: ledgerError } = await adminClient.from('monetization_ledger').insert({
      user_id: userId,
      payment_gateway: 'paypal',
      amount,
      currency: 'USD',
      status: 'pending',
      reference_id: orderData.id,
      metadata: { paypal_order_id: orderData.id },
    });

    if (ledgerError) {
      console.error('[paypal-create-order] ledger write error:', ledgerError.message);
    }

    return new Response(
      JSON.stringify({ approvalUrl: approvalLink.href, orderId: orderData.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[paypal-create-order]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
