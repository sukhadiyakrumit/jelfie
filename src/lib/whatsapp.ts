export const WHATSAPP_NUMBER = "919825845024"; // +91 98258 45024

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

type CustomerInfo = {
  fullName?: string | null;
  phone?: string | null;
};

function customerFooter(c?: CustomerInfo): string[] {
  if (!c) return [];
  const lines: string[] = [];
  if (c.fullName) lines.push(`Name: ${c.fullName}`);
  if (c.phone) lines.push(`Phone: ${c.phone}`);
  return lines.length ? ["", ...lines] : [];
}

export function productQuoteMessage(opts: {
  name: string;
  slug: string;
  priceLabel: string;
  origin?: string;
  customer?: CustomerInfo;
}): string {
  const origin =
    opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return [
    "Hi Jelfie Jewellers,",
    "",
    `I'd like a quote for: ${opts.name} — ${opts.priceLabel}`,
    `${origin}/product/${opts.slug}`,
    "",
    "Please share availability and shipping details. Thank you.",
    ...customerFooter(opts.customer),
  ].join("\n");
}

export function cartQuoteMessage(opts: {
  items: Array<{ name: string; slug: string; qty: number; priceLabel: string }>;
  totalLabel: string;
  origin?: string;
  customer?: CustomerInfo;
}): string {
  const origin =
    opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const lines = opts.items.map(
    (i, idx) =>
      `${idx + 1}. ${i.name} × ${i.qty} — ${i.priceLabel}\n   ${origin}/product/${i.slug}`,
  );
  return [
    "Hi Jelfie Jewellers,",
    "",
    "I'd like to request a quote for the following:",
    "",
    ...lines,
    "",
    `Subtotal: ${opts.totalLabel}`,
    "",
    "Please confirm availability and shipping. Thank you.",
    ...customerFooter(opts.customer),
  ].join("\n");
}
