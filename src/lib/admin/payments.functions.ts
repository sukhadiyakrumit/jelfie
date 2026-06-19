import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export const listAllPayments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id, quote_id, amount_usd, method, reference, notes, paid_at, created_at")
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        quote_id: z.string().uuid(),
        amount_usd: z.number().positive(),
        method: z.string().min(1),
        reference: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        mark_quote_paid: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mark_quote_paid, ...row } = data;
    const { error } = await supabaseAdmin
      .from("payments")
      .insert({ ...row, recorded_by: context.userId });
    if (error) throw new Error(error.message);
    if (mark_quote_paid) {
      await supabaseAdmin.from("quote_requests").update({ status: "paid" }).eq("id", data.quote_id);
    }
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
