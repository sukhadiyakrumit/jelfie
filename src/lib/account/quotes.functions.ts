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
    if (row.status === "accepted" || row.status === "pending_payment") {
      return { ok: true, alreadyAccepted: true };
    }
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

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("quote_requests")
      .select("id, status, currency, total_usd, final_price_usd")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Order not found");
    if (row.status !== "accepted" && row.status !== "pending_payment") {
      throw new Error("Order is not awaiting payment");
    }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const amountUsd = Number(row.final_price_usd ?? row.total_usd);
    const amountPaise = Math.round(amountUsd * 100);
    const currency = "USD";
    const receipt = `q_${row.id.slice(0, 30)}`;

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const resp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes: { quote_id: row.id, user_id: userId },
      }),
    });
    const json: any = await resp.json();
    if (!resp.ok) {
      console.error("Razorpay order create failed", json);
      const msg = json?.error?.description || "Failed to create payment order";
      throw new Error(msg);
    }

    // Move to pending_payment so admin dashboards reflect intent
    if (row.status === "accepted") {
      await supabase.from("quote_requests").update({ status: "pending_payment" }).eq("id", row.id);
    }

    return {
      razorpayOrderId: json.id as string,
      amount: amountPaise,
      currency,
      keyId,
    };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay is not configured");

    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(data.razorpay_signature, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }

    const { data: row } = await supabase
      .from("quote_requests")
      .select("id, status, total_usd, final_price_usd")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Order not found");
    if (row.status === "paid") {
      return { ok: true, id: row.id, reference: data.razorpay_payment_id, invoiceNumber: null, alreadyPaid: true };
    }
    if (row.status !== "accepted" && row.status !== "pending_payment") {
      throw new Error("Order is not awaiting payment");
    }

    const amount = Number(row.final_price_usd ?? row.total_usd);
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${row.id.slice(0, 6).toUpperCase()}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: pErr } = await supabaseAdmin.from("payments").insert({
      quote_id: row.id,
      amount_usd: amount,
      method: "razorpay",
      reference: data.razorpay_payment_id,
      status: "completed",
      invoice_number: invoiceNumber,
      paid_at: now.toISOString(),
      notes: `Razorpay order ${data.razorpay_order_id}`,
    });
    if (pErr) { console.error(pErr); throw new Error("Failed to record payment"); }

    const { error: uErr } = await supabaseAdmin
      .from("quote_requests")
      .update({ status: "paid", paid_at: now.toISOString() })
      .eq("id", row.id);
    if (uErr) { console.error(uErr); throw new Error("Failed to update order"); }

    return { ok: true, id: row.id, reference: data.razorpay_payment_id, invoiceNumber };
  });

