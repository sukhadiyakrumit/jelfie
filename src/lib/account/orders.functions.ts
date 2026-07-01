import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVE_SHIPMENT = ["processing", "shipped", "in_transit"];

const ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "in_transit", "delivered", "closed"];

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quote_requests")
      .select(
        "id, created_at, currency, total_usd, final_price_usd, status, order_type, tracking_number, carrier, estimated_delivery, whatsapp_url, quote_request_items(id, name, slug, price_usd, quantity, image_url)",
      )
      .eq("user_id", userId)
      .or(`order_type.eq.instant,and(order_type.eq.quotation,status.in.(${ORDER_STATUSES.join(",")}))`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyShipments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quote_requests")
      .select("id, created_at, status, total_usd, order_type, tracking_number, carrier, estimated_delivery")
      .eq("user_id", userId)
      .in("status", ACTIVE_SHIPMENT)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quote_requests")
      .select("id, created_at, status, total_usd, order_type, note, quote_request_items(id, name, quantity)")
      .eq("user_id", userId)
      .eq("order_type", "quotation")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("quote_requests")
      .select(
        "id, created_at, currency, total_usd, status, order_type, tracking_number, carrier, estimated_delivery, note, whatsapp_url, paid_at, quote_request_items(id, product_id, name, slug, price_usd, quantity, image_url)",
      )
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const [{ data: history }, { data: documents }, { data: payments }] = await Promise.all([
      supabase
        .from("order_status_history")
        .select("id, status, note, created_at")
        .eq("quote_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_documents")
        .select("id, doc_type, file_path, file_name, created_at")
        .eq("quote_id", data.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id, amount_usd, method, reference, status, invoice_number, paid_at, notes")
        .eq("quote_id", data.id)
        .order("paid_at", { ascending: false }),
    ]);

    return {
      order,
      history: history ?? [],
      documents: documents ?? [],
      payments: payments ?? [],
    };
  });

export const repeatOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("quote_requests")
      .select("id, user_id, quote_request_items(product_id, name, slug, price_usd, quantity, image_url)")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    return order.quote_request_items ?? [];
  });
