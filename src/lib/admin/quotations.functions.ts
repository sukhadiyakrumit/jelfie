import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export const listAllQuotations = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ orderType: z.enum(["instant", "quotation"]).optional() }).optional().parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("quote_requests")
      .select(
        "id, created_at, user_id, currency, total_usd, status, order_type, whatsapp_url, note, internal_note, paid_at, quote_request_items(id, name, slug, price_usd, quantity, image_url)",
      )
      .order("created_at", { ascending: false });
    if (data?.orderType) query = query.eq("order_type", data.orderType);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r: any) => r.user_id).filter(Boolean)));
    let profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
    if (userIds.length) {
      const { data: pData } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      profiles = Object.fromEntries((pData ?? []).map((p: any) => [p.id, p]));
    }
    return list.map((r: any) => ({ ...r, customer: profiles[r.user_id] ?? null }));
  });

export const updateQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new","contacted","quoted","accepted","payment_pending","pending_payment","paid","processing","shipped","in_transit","delivered","closed","cancelled"]).optional(),
        internal_note: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, status, internal_note } = data;
    const patch: Record<string, unknown> = {};
    if (status !== undefined) {
      patch.status = status;
      if (status === "paid") patch.paid_at = new Date().toISOString();
    }
    if (internal_note !== undefined) patch.internal_note = internal_note;
    const { error } = await supabaseAdmin.from("quote_requests").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
