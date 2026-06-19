import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const users = usersData.users ?? [];
    const ids = users.map((u) => u.id);
    const [profiles, roles, quotes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, country, city").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("quote_requests").select("user_id, total_usd").in("user_id", ids),
    ]);
    const pMap = Object.fromEntries((profiles.data ?? []).map((p: any) => [p.id, p]));
    const rolesByUser: Record<string, string[]> = {};
    (roles.data ?? []).forEach((r: any) => {
      (rolesByUser[r.user_id] ||= []).push(r.role);
    });
    const quoteAgg: Record<string, { count: number; total: number }> = {};
    (quotes.data ?? []).forEach((q: any) => {
      const k = q.user_id;
      quoteAgg[k] ||= { count: 0, total: 0 };
      quoteAgg[k].count += 1;
      quoteAgg[k].total += Number(q.total_usd ?? 0);
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      profile: pMap[u.id] ?? null,
      roles: rolesByUser[u.id] ?? [],
      quoteCount: quoteAgg[u.id]?.count ?? 0,
      quoteTotal: quoteAgg[u.id]?.total ?? 0,
    }));
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
