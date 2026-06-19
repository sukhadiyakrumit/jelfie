import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(2000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("product_reviews")
      .upsert(
        { ...data, user_id: context.userId, is_approved: false },
        { onConflict: "product_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProductReviews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("product_reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("product_id", data.product_id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r: any) => r.user_id)));
    let profiles: Record<string, { full_name: string | null }> = {};
    if (userIds.length) {
      const { data: pData } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds);
      profiles = Object.fromEntries((pData ?? []).map((p: any) => [p.id, p]));
    }
    return list.map((r: any) => ({ ...r, profiles: profiles[r.user_id] ?? null }));
  });
