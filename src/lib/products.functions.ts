import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  metal: string | null;
  gemstone: string | null;
  weight_grams: number | null;
  price_usd: number;
  description: string | null;
  is_featured: boolean;
  in_stock: boolean;
  images: { url: string; sort_order: number }[];
};

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, slug, name, category, metal, gemstone, weight_grams, price_usd, description, is_featured, in_stock, product_images(url, sort_order)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      ...p,
      price_usd: Number(p.price_usd),
      weight_grams: p.weight_grams !== null ? Number(p.weight_grams) : null,
      images: (p.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));
  },
);

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<ProductRow | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, slug, name, category, metal, gemstone, weight_grams, price_usd, description, is_featured, in_stock, product_images(url, sort_order)",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      ...row,
      price_usd: Number(row.price_usd),
      weight_grams: row.weight_grams !== null ? Number(row.weight_grams) : null,
      images: (row.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    };
  });
