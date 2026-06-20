import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export const getAdminOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: order }, { data: history }, { data: documents }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("quote_requests").select("*, quote_request_items(*)").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("order_status_history").select("*").eq("quote_id", data.id).order("created_at", { ascending: true }),
      supabaseAdmin.from("order_documents").select("*").eq("quote_id", data.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("payments").select("*").eq("quote_id", data.id).order("paid_at", { ascending: false }),
    ]);
    if (!order) throw new Error("Not found");
    let customer = null;
    if (order.user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("full_name, phone, company_name")
        .eq("id", order.user_id)
        .maybeSingle();
      customer = p;
    }
    return { order, customer, history: history ?? [], documents: documents ?? [], payments: payments ?? [] };
  });

export const updateOrderShipping = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z
        .enum(["new","contacted","quoted","accepted","payment_pending","paid","processing","shipped","in_transit","delivered","closed","cancelled"])
        .optional(),
      tracking_number: z.string().nullable().optional(),
      carrier: z.string().nullable().optional(),
      estimated_delivery: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("quote_requests").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      quote_id: z.string().uuid(),
      doc_type: z.enum(["invoice","packing_list","bill_of_lading","coa","coo","other"]),
      file_name: z.string().min(1),
      file_base64: z.string().min(1),
      content_type: z.string().default("application/octet-stream"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.quote_id}/${Date.now()}-${data.file_name}`;
    const bytes = Buffer.from(data.file_base64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("trade-documents")
      .upload(path, bytes, { contentType: data.content_type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { error } = await supabaseAdmin.from("order_documents").insert({
      quote_id: data.quote_id,
      doc_type: data.doc_type,
      file_path: path,
      file_name: data.file_name,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin.from("order_documents").select("file_path").eq("id", data.id).maybeSingle();
    if (doc?.file_path) {
      await supabaseAdmin.storage.from("trade-documents").remove([doc.file_path]);
    }
    const { error } = await supabaseAdmin.from("order_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending","completed","failed","refunded"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payments").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
