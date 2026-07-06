import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  productId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  priceUsd: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().nullable(),
});

const inputSchema = z.object({
  currency: z.string(),
  totalUsd: z.number().nonnegative(),
  note: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

/**
 * Creates an "instant" order in pending_payment state.
 * Stripe wiring will be added later; for now admin marks payment manually.
 */
export const createInstantOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Server-side price verification: never trust client-supplied prices.
    const productIds = Array.from(
      new Set(data.items.map((i) => i.productId).filter((v): v is string => !!v)),
    );
    if (productIds.length !== data.items.length) {
      throw new Error("Invalid product in cart");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, price_usd")
      .in("id", productIds);
    if (pErr) { console.error(pErr); throw new Error("Failed to verify product prices"); }

    const priceMap = new Map((products ?? []).map((p) => [p.id, Number(p.price_usd)]));
    const verifiedItems = data.items.map((i) => {
      const verifiedPrice = priceMap.get(i.productId as string);
      if (verifiedPrice == null) throw new Error("Invalid product in cart");
      if (!Number.isInteger(i.quantity) || i.quantity <= 0 || i.quantity > 999) {
        throw new Error("Invalid quantity");
      }
      return { ...i, priceUsd: verifiedPrice };
    });
    const verifiedTotalUsd = verifiedItems.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

    const { data: order, error } = await supabase
      .from("quote_requests")
      .insert({
        user_id: userId,
        currency: data.currency,
        total_usd: verifiedTotalUsd,
        whatsapp_url: "",
        note: data.note ?? null,
        order_type: "instant",
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (error || !order) { console.error(error); throw new Error("Failed to place order"); }

    const { error: iErr } = await supabase.from("quote_request_items").insert(
      verifiedItems.map((i) => ({
        quote_id: order.id,
        product_id: i.productId,
        name: i.name,
        slug: i.slug,
        price_usd: i.priceUsd,
        quantity: i.quantity,
        image_url: i.imageUrl,
      })),
    );
    if (iErr) { console.error(iErr); throw new Error("Request failed"); }

    return { id: order.id };
  });
