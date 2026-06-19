import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./_shared";

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [products, quotes, users, payments, recent, contacts] = await Promise.all([
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("quote_requests").select("total_usd, status, created_at"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("payments").select("amount_usd"),
      supabaseAdmin
        .from("quote_requests")
        .select("id, created_at, total_usd, status, currency")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);

    const quoteRows = (quotes.data ?? []) as { total_usd: number | string; status: string }[];
    const pendingCount = quoteRows.filter((q) => q.status === "new" || q.status === "contacted").length;
    const totalQuoted = quoteRows.reduce((s, q) => s + Number(q.total_usd ?? 0), 0);
    const paidTotal = ((payments.data ?? []) as { amount_usd: number | string }[]).reduce(
      (s, p) => s + Number(p.amount_usd ?? 0),
      0,
    );

    return {
      products: products.count ?? 0,
      users: users.count ?? 0,
      quotes: quoteRows.length,
      pendingQuotes: pendingCount,
      totalQuotedUsd: totalQuoted,
      paidUsd: paidTotal,
      newContactMessages: contacts.count ?? 0,
      recentQuotes: (recent.data ?? []) as Array<{
        id: string;
        created_at: string;
        total_usd: number;
        status: string;
        currency: string;
      }>,
    };
  });
