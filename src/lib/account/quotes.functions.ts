import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyInquiry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("quote_requests")
      .select(
        "id, created_at, currency, total_usd, status, order_type, note, whatsapp_url, final_price_usd, quoted_at, quote_note, accepted_at, rejected_at, rejection_reason, quote_request_items(id, product_id, name, slug, price_usd, quantity, image_url)",
      )
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Inquiry not found");
    return order;
  });

export const acceptQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("quote_requests")
      .select("status")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Inquiry not found");
    if (row.status !== "quoted") throw new Error("Quote is not awaiting your response");
    const { error } = await supabase
      .from("quote_requests")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("quote_requests")
      .select("status")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Inquiry not found");
    if (row.status !== "quoted") throw new Error("Quote is not awaiting your response");
    const { error } = await supabase
      .from("quote_requests")
      .update({
        status: "cancelled",
        rejected_at: new Date().toISOString(),
        rejection_reason: data.reason ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        method: z.enum(["bank_transfer", "whatsapp"]),
        reference: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("quote_requests")
      .select("id, status, total_usd, final_price_usd")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Inquiry not found");
    if (row.status !== "accepted") throw new Error("Quote must be accepted before payment");
    const amount = Number(row.final_price_usd ?? row.total_usd);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payments").insert({
      quote_id: row.id,
      amount_usd: amount,
      method: data.method,
      reference: data.reference ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    // Move quote into the fulfilment pipeline so it appears in the customer's Orders section
    await supabaseAdmin
      .from("quote_requests")
      .update({ status: "pending_payment" })
      .eq("id", row.id);
    return { ok: true };
  });
