// =============================================================================
// TOO HUMBLE - EDGE FUNCTION: expire-pending-payments
// Production Hardening Sprint — Payments Workstream
//
// Scheduled by Supabase every 5 minutes to expire stale pending M-Pesa
// transactions. The actual expiry logic lives in PostgreSQL via the
// expire_pending_transactions(timeout_minutes) RPC.
//
// Required Secrets:
//   CRON_SECRET
//   PAYMENT_PENDING_TIMEOUT_MINUTES (optional, defaults to 10)
//
// Supabase-provided environment variables:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -----------------------------------------------------------------------------
// Environment validation
// -----------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const PAYMENT_TIMEOUT_MINUTES = Number(
  Deno.env.get("PAYMENT_PENDING_TIMEOUT_MINUTES") ?? "10"
);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required Supabase environment variables."
  );
}

if (!CRON_SECRET) {
  throw new Error(
    "Missing CRON_SECRET environment variable."
  );
}

const adminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// -----------------------------------------------------------------------------
// Edge Function
// -----------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  }

  const authHeader = req.headers.get("Authorization");

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const startedAt = Date.now();

    const { data, error } = await adminClient.rpc(
      "expire_pending_transactions",
      {
        timeout_minutes: PAYMENT_TIMEOUT_MINUTES,
      }
    );

    if (error) {
      console.error("[expire-pending-payments]", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const expiredCount = Number(data ?? 0);
    const durationMs = Date.now() - startedAt;

    console.log("[expire-pending-payments]", {
      expired: expiredCount,
      timeoutMinutes: PAYMENT_TIMEOUT_MINUTES,
      durationMs,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredCount,
        timeoutMinutes: PAYMENT_TIMEOUT_MINUTES,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    console.error("[expire-pending-payments]", {
      error: message,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
});
