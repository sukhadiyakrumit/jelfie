import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { ProductRow } from "@/lib/products.functions";
import { useCurrency } from "@/lib/currency";
import { useWishlist } from "@/lib/cart";

export function ProductCard({ product }: { product: ProductRow }) {
  const { format } = useCurrency();
  const { has, toggle } = useWishlist();
  const image = product.images[0]?.url ?? null;
  const isWish = has(product.id);

  return (
    <div className="group">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block relative aspect-square bg-white outline outline-1 outline-offset-[-1px] outline-black/5 mb-6 overflow-hidden"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-stone-400">
              {product.category}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggle({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceUsd: product.price_usd,
              image,
            });
          }}
          aria-label={isWish ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-3 right-3 w-9 h-9 bg-ivory/90 backdrop-blur grid place-items-center text-onyx hover:text-gold transition-colors"
        >
          <Heart className="w-4 h-4" strokeWidth={1.5} fill={isWish ? "currentColor" : "none"} />
        </button>
      </Link>
      <Link to="/product/$slug" params={{ slug: product.slug }}>
        <h4 className="font-serif text-lg italic text-onyx hover:text-gold transition-colors">
          {product.name}
        </h4>
        <p className="text-[11px] tracking-widest text-onyx/60 mt-1">{format(product.price_usd)}</p>
      </Link>
    </div>
  );
}
