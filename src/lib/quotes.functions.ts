import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type QuoteItemInput = {
  productId: string | null;
  name: string;
  slug: string;
  priceUsd: number;
  quantity: number;
  imageUrl: string | null;
};

type CreateQuoteInput = {
  currency: string;
  totalUsd: number;
  whatsappUrl: string;
  note?: string | null;
  orderType?: "instant" | "quotation";
  items: QuoteItemInput[];
};

export const createQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateQuoteInput) => {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("At least one item is required");
    }
    if (!data.whatsappUrl) throw new Error("WhatsApp URL is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orderType = data.orderType ?? "quotation";

    const { data: quote, error: qErr } = await supabase
      .from("quote_requests")
      .insert({
        user_id: userId,
        currency: data.currency,
        total_usd: data.totalUsd,
        whatsapp_url: data.whatsappUrl,
        note: data.note ?? null,
        order_type: orderType,
        status: orderType === "instant" ? "pending_payment" : "new",
      })
      .select("id, created_at")
      .single();

    if (qErr || !quote) throw new Error(qErr?.message ?? "Failed to save quote");

    const { error: iErr } = await supabase.from("quote_request_items").insert(
      data.items.map((i) => ({
        quote_id: quote.id,
        product_id: i.productId,
        name: i.name,
        slug: i.slug,
        price_usd: i.priceUsd,
        quantity: i.quantity,
        image_url: i.imageUrl,
      })),
    );
    if (iErr) throw new Error(iErr.message);

    return { id: quote.id };
  });

export const listMyQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quote_requests")
      .select(
        "id, created_at, currency, total_usd, whatsapp_url, status, order_type, quote_request_items(id, name, slug, price_usd, quantity, image_url)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
