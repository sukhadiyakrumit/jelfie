import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: orders } = await supabase
      .from("quote_requests")
      .select("id")
      .eq("user_id", userId);
    const ids = (orders ?? []).map((o) => o.id);
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("payments")
      .select("id, quote_id, amount_usd, method, reference, status, invoice_number, paid_at, notes, created_at")
      .in("quote_id", ids)
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
