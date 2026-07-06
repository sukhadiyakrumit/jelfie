import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) { console.error(error); throw new Error("Request failed"); }
  if (!data) throw new Error("Forbidden: admin role required");
}

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
  name: z.string().min(1),
  category: z.string().min(1),
  metal: z.string().nullable().optional(),
  gemstone: z.string().nullable().optional(),
  weight_grams: z.number().nullable().optional(),
  price_usd: z.number().nonnegative(),
  description: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  in_stock: z.boolean().default(true),
  images: z.array(z.object({ url: z.string().url(), sort_order: z.number().int() })).default([]),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { images, id, ...productFields } = data;
    let productId = id;

    if (productId) {
      const { error } = await supabaseAdmin.from("products").update(productFields).eq("id", productId);
      if (error) { console.error(error); throw new Error("Request failed"); }
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("products")
        .insert(productFields)
        .select("id")
        .single();
      if (error) { console.error(error); throw new Error("Request failed"); }
      productId = inserted.id;
    }

    // Replace images
    await supabaseAdmin.from("product_images").delete().eq("product_id", productId);
    if (images.length > 0) {
      const { error: imgError } = await supabaseAdmin
        .from("product_images")
        .insert(images.map((img) => ({ ...img, product_id: productId })));
      if (imgError) { console.error(imgError); throw new Error("Request failed"); }
    }

    return { id: productId };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) { console.error(error); throw new Error("Request failed"); }
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId: context.userId };
  });

// Bootstrap: first user to claim admin gets it. Subsequent calls fail.
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) { console.error(countError); throw new Error("Request failed"); }
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) { console.error(error); throw new Error("Request failed"); }
    return { ok: true };
  });
