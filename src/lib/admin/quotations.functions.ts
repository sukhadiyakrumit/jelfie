import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export const listAllQuotations = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("quote_requests")
      .select(
        "id, created_at, user_id, currency, total_usd, status, whatsapp_url, note, internal_note, quote_request_items(id, name, slug, price_usd, quantity, image_url)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    let profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
    if (userIds.length) {
      const { data: pData } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      profiles = Object.fromEntries((pData ?? []).map((p: any) => [p.id, p]));
    }
    return rows.map((r: any) => ({ ...r, customer: profiles[r.user_id] ?? null }));
  });

export const updateQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "closed", "cancelled", "paid"]).optional(),
        internal_note: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("quote_requests").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
