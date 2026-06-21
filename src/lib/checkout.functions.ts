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

    const { data: order, error } = await supabase
      .from("quote_requests")
      .insert({
        user_id: userId,
        currency: data.currency,
        total_usd: data.totalUsd,
        whatsapp_url: "",
        note: data.note ?? null,
        order_type: "instant",
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Failed to place order");

    const { error: iErr } = await supabase.from("quote_request_items").insert(
      data.items.map((i) => ({
        quote_id: order.id,
        product_id: i.productId,
        name: i.name,
        slug: i.slug,
        price_usd: i.priceUsd,
        quantity: i.quantity,
        image_url: i.imageUrl,
      })),
    );
    if (iErr) throw new Error(iErr.message);

    return { id: order.id };
  });
