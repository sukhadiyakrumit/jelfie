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

// Only allow official WhatsApp deep-link hosts. Prevents javascript:/phishing URLs
// from being stored and later rendered as trusted admin links.
const ALLOWED_WHATSAPP_PREFIXES = ["https://wa.me/", "https://api.whatsapp.com/"];
function isSafeWhatsappUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_WHATSAPP_PREFIXES.some((p) => url.startsWith(p));
  } catch {
    return false;
  }
}

export const createQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateQuoteInput) => {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("At least one item is required");
    }
    if (!data.whatsappUrl || !isSafeWhatsappUrl(data.whatsappUrl)) {
      throw new Error("Invalid WhatsApp URL");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orderType = data.orderType ?? "quotation";

    // Server-side price verification: never trust client-supplied prices.
    // Look up prices from the product catalog and recompute the total.
    const productIds = Array.from(
      new Set(data.items.map((i) => i.productId).filter((v): v is string => !!v)),
    );

    let priceMap = new Map<string, number>();
    if (productIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: products, error: pErr } = await supabaseAdmin
        .from("products")
        .select("id, price_usd")
        .in("id", productIds);
      if (pErr) {
        console.error(pErr);
        throw new Error("Failed to verify product prices");
      }
      priceMap = new Map((products ?? []).map((p) => [p.id, Number(p.price_usd)]));
      for (const id of productIds) {
        if (!priceMap.has(id)) throw new Error("Invalid product in cart");
      }
    }

    const verifiedItems = data.items.map((i) => {
      if (!i.productId) throw new Error("Invalid product in cart");
      const verifiedPrice = priceMap.get(i.productId);
      if (verifiedPrice == null) throw new Error("Invalid product in cart");
      if (!Number.isInteger(i.quantity) || i.quantity <= 0 || i.quantity > 999) {
        throw new Error("Invalid quantity");
      }
      return { ...i, priceUsd: verifiedPrice };
    });

    const verifiedTotalUsd = verifiedItems.reduce(
      (sum, i) => sum + i.priceUsd * i.quantity,
      0,
    );

    const { data: quote, error: qErr } = await supabase
      .from("quote_requests")
      .insert({
        user_id: userId,
        currency: data.currency,
        total_usd: verifiedTotalUsd,
        whatsapp_url: data.whatsappUrl,
        note: data.note ?? null,
        order_type: orderType,
        status: orderType === "instant" ? "pending_payment" : "new",
      })
      .select("id, created_at")
      .single();

    if (qErr || !quote) { console.error(qErr); throw new Error("Failed to save quote"); }

    const { error: iErr } = await supabase.from("quote_request_items").insert(
      verifiedItems.map((i) => ({
        quote_id: quote.id,
        product_id: i.productId,
        name: i.name,
        slug: i.slug,
        price_usd: i.priceUsd,
        quantity: i.quantity,
        image_url: i.imageUrl,
      })),
    );
    if (iErr) { console.error(iErr); throw new Error("Request failed"); }

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
    if (error) { console.error(error); throw new Error("Request failed"); }
    return data ?? [];
  });
