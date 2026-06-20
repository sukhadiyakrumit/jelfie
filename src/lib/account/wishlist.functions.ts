import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wishlists")
      .select("id, created_at, products(id, slug, name, price_usd, in_stock, product_images(url, sort_order))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => {
      const imgs = (row.products?.product_images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
      return {
        wishlistId: row.id,
        product: row.products && {
          id: row.products.id,
          slug: row.products.slug,
          name: row.products.name,
          priceUsd: Number(row.products.price_usd),
          inStock: row.products.in_stock,
          image: imgs[0]?.url ?? null,
        },
      };
    });
  });

export const addToWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("wishlists")
      .insert({ user_id: userId, product_id: data.productId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
