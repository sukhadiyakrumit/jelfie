import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
import { listMyWishlist, removeFromWishlist } from "@/lib/account/wishlist.functions";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/account/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const fetchList = useServerFn(listMyWishlist);
  const doRemove = useServerFn(removeFromWishlist);
  const qc = useQueryClient();
  const { addItem } = useCart();

  const { data, isLoading } = useQuery({ queryKey: ["account-wishlist"], queryFn: () => fetchList() });

  const removeMut = useMutation({
    mutationFn: (productId: string) => doRemove({ data: { productId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-wishlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addAllToCart = () => {
    (data ?? []).forEach((row) => {
      if (!row.product) return;
      addItem({
        productId: row.product.id,
        slug: row.product.slug,
        name: row.product.name,
        priceUsd: row.product.priceUsd,
        image: row.product.image,
      });
    });
    toast.success("Added to cart");
  };

  return (
    <div className="px-10 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl italic mb-2">Wishlist</h1>
          <p className="text-onyx/60 text-sm">Saved products for future orders.</p>
        </div>
        {data && data.length > 0 && (
          <button onClick={addAllToCart} className="px-5 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold">
            Add all to cart
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <p className="font-serif text-2xl italic text-onyx/50 mb-6">No saved pieces yet</p>
          <Link to="/shop" className="inline-block px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold">
            Browse Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.filter((r) => r.product).map((row) => {
            const p = row.product!;
            return (
              <div key={row.wishlistId} className="group bg-white border border-onyx/10">
                <div className="relative aspect-square overflow-hidden">
                  <Link to="/product/$slug" params={{ slug: p.slug }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-onyx/30 italic">{p.name}</div>
                    )}
                  </Link>
                  <button
                    onClick={() => removeMut.mutate(p.id)}
                    aria-label="Remove"
                    className="absolute top-3 right-3 w-9 h-9 bg-ivory/90 grid place-items-center hover:text-gold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-serif text-lg italic hover:text-gold">
                    {p.name}
                  </Link>
                  <p className="text-[11px] tracking-widest text-onyx/60 mt-1">${p.priceUsd.toFixed(2)}</p>
                  <button
                    onClick={() => {
                      addItem({ productId: p.id, slug: p.slug, name: p.name, priceUsd: p.priceUsd, image: p.image });
                      toast.success("Added to cart");
                    }}
                    className="mt-3 text-[10px] uppercase tracking-widest text-onyx/70 hover:text-gold border-b border-onyx/20"
                  >
                    Add to selection
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
