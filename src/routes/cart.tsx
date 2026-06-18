import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { useWhatsappQuote } from "@/lib/use-whatsapp-quote";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Selection — Jelfie Jewellers" },
      { name: "description", content: "Review your selected pieces and send a quote request via WhatsApp." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, updateQty, removeItem, subtotalUsd, count, clear } = useCart();
  const { format, currency } = useCurrency();
  const { sendCartQuote, busy: quoteBusy } = useWhatsappQuote();

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-5xl mx-auto px-6 py-16">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">
          {count > 0 ? `${count} piece${count !== 1 ? "s" : ""}` : "Empty"}
        </span>
        <h1 className="font-serif text-5xl italic mt-2 mb-12">Your Selection</h1>

        {items.length === 0 ? (
          <div className="text-center py-24 border-t border-onyx/10">
            <p className="font-serif text-2xl italic text-onyx/50 mb-8">
              Your selection is empty.
            </p>
            <Link
              to="/shop"
              className="inline-block px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <>
            <div className="border-t border-onyx/10">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-6 py-6 border-b border-onyx/10">
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.slug }}
                    className="w-24 h-24 bg-white outline outline-1 outline-offset-[-1px] outline-black/5 overflow-hidden shrink-0"
                  >
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </Link>
                  <div className="flex-1 flex flex-col sm:flex-row gap-4 justify-between">
                    <div>
                      <Link
                        to="/product/$slug"
                        params={{ slug: item.slug }}
                        className="font-serif text-xl italic hover:text-gold"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[11px] tracking-widest text-onyx/60 mt-1">
                        {format(item.priceUsd)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center border border-onyx/20">
                        <button
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                          className="w-8 h-8 grid place-items-center hover:bg-onyx hover:text-ivory"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.qty + 1)}
                          className="w-8 h-8 grid place-items-center hover:bg-onyx hover:text-ivory"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm w-24 text-right">
                        {format(item.priceUsd * item.qty)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-onyx/40 hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-end gap-6">
              <div className="flex items-baseline gap-6">
                <span className="text-[11px] uppercase tracking-[0.3em] text-onyx/60">Estimated subtotal</span>
                <span className="font-serif text-3xl italic">{format(subtotalUsd)}</span>
              </div>
              <p className="text-xs text-onyx/40 max-w-md text-right">
                Final pricing, taxes and shipping are confirmed via WhatsApp with our team.
              </p>
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => clear()}
                  className="px-6 py-3 border border-onyx/20 text-[11px] uppercase tracking-[0.3em] hover:border-onyx"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  disabled={quoteBusy}
                  onClick={() =>
                    sendCartQuote(
                      {
                        items: items.map((i) => ({
                          productId: i.productId,
                          slug: i.slug,
                          name: i.name,
                          priceUsd: i.priceUsd,
                          qty: i.qty,
                          image: i.image,
                        })),
                        currency,
                        format,
                        subtotalUsd,
                      },
                      "/cart",
                    )
                  }
                  className="px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
                >
                  {quoteBusy ? "Opening…" : "Send quote request on WhatsApp"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
