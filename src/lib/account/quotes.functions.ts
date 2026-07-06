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
        "id, created_at, currency, total_usd, status, order_type, note, final_price_usd, quoted_at, quote_note, accepted_at, rejected_at, rejection_reason, quote_request_items(id, product_id, name, slug, price_usd, quantity, image_url)",
      )
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) { console.error(error); throw new Error("Request failed"); }
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
    if (error) { console.error(error); throw new Error("Request failed"); }
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
    if (error) { console.error(error); throw new Error("Request failed"); }
    return { ok: true };
  });

export const getPayableOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("quote_requests")
      .select("id, currency, total_usd, final_price_usd, status, order_type")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) { console.error(error); throw new Error("Request failed"); }
    if (!row) throw new Error("Order not found");
    return row;
  });

export const completeDummyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("quote_requests")
      .select("id, status, total_usd, final_price_usd")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Order not found");
    if (row.status !== "accepted" && row.status !== "pending_payment") {
      throw new Error("Order is not awaiting payment");
    }
    const amount = Number(row.final_price_usd ?? row.total_usd);
    const now = new Date();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    const reference = `RZP_${rand}`;
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${row.id.slice(0, 6).toUpperCase()}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: pErr } = await supabaseAdmin.from("payments").insert({
      quote_id: row.id,
      amount_usd: amount,
      method: "razorpay",
      reference,
      status: "completed",
      invoice_number: invoiceNumber,
      paid_at: now.toISOString(),
    });
    if (pErr) { console.error(pErr); throw new Error("Failed to record payment"); }

    const { error: uErr } = await supabaseAdmin
      .from("quote_requests")
      .update({ status: "paid", paid_at: now.toISOString() })
      .eq("id", row.id);
    if (uErr) { console.error(uErr); throw new Error("Failed to update order"); }

    return { ok: true, id: row.id, reference, invoiceNumber };
  });
