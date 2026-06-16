import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useWishlist, useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Saved Pieces — Jelfie Jewellers" },
      { name: "description", content: "Pieces you have saved from the Jelfie collection." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, remove } = useWishlist();
  const { addItem } = useCart();
  const { format } = useCurrency();

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-5xl mx-auto px-6 py-16">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Saved</span>
        <h1 className="font-serif text-5xl italic mt-2 mb-12">Wishlist</h1>

        {items.length === 0 ? (
          <div className="text-center py-24 border-t border-onyx/10">
            <p className="font-serif text-2xl italic text-onyx/50 mb-8">
              No saved pieces yet.
            </p>
            <Link
              to="/shop"
              className="inline-block px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <div key={item.productId} className="group">
                <div className="relative aspect-square bg-white outline outline-1 outline-offset-[-1px] outline-black/5 mb-4 overflow-hidden">
                  <Link to="/product/$slug" params={{ slug: item.slug }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-onyx/30 italic">{item.name}</div>
                    )}
                  </Link>
                  <button
                    onClick={() => remove(item.productId)}
                    aria-label="Remove from wishlist"
                    className="absolute top-3 right-3 w-9 h-9 bg-ivory/90 backdrop-blur grid place-items-center hover:text-gold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Link to="/product/$slug" params={{ slug: item.slug }} className="font-serif text-xl italic hover:text-gold">
                  {item.name}
                </Link>
                <p className="text-[11px] tracking-widest text-onyx/60 mt-1">
                  {format(item.priceUsd)}
                </p>
                <button
                  onClick={() =>
                    addItem({
                      productId: item.productId,
                      slug: item.slug,
                      name: item.name,
                      priceUsd: item.priceUsd,
                      image: item.image,
                    })
                  }
                  className="mt-3 text-[10px] uppercase tracking-widest text-onyx/70 hover:text-gold border-b border-onyx/20"
                >
                  Add to selection
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
