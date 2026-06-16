import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getProductBySlug } from "@/lib/products.functions";
import { useCurrency } from "@/lib/currency";
import { useCart, useWishlist } from "@/lib/cart";
import { whatsappLink, productQuoteMessage } from "@/lib/whatsapp";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => {
    const p = loaderData;
    if (!p) return {};
    const image = p.images[0]?.url;
    return {
      meta: [
        { title: `${p.name} — Jelfie Jewellers` },
        { name: "description", content: p.description ?? `${p.name} from Jelfie Jewellers.` },
        { property: "og:title", content: `${p.name} — Jelfie Jewellers` },
        { property: "og:description", content: p.description ?? "" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-ivory">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <h1 className="font-serif text-4xl italic">Piece not found</h1>
        <p className="mt-4 text-onyx/60">This item may have been retired from our collection.</p>
        <Link to="/shop" className="inline-block mt-8 px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold">
          Back to shop
        </Link>
      </div>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const slug = Route.useParams().slug;
  const { data } = useSuspenseQuery(productQuery(slug));
  const product = data!;
  const { format, currency } = useCurrency();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [activeImage, setActiveImage] = useState(0);

  const image = product.images[activeImage]?.url ?? product.images[0]?.url ?? null;
  const isWish = has(product.id);
  const priceLabel = `${format(product.price_usd)} ${currency}`;

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-white outline outline-1 outline-offset-[-1px] outline-black/5 overflow-hidden">
            {image ? (
              <img src={image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-onyx/30 font-serif italic">
                {product.name}
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-3 mt-4">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square overflow-hidden outline outline-1 outline-offset-[-1px] ${
                    i === activeImage ? "outline-gold" : "outline-black/5"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">
            {product.category}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl italic mt-3">{product.name}</h1>
          <p className="text-2xl text-onyx/80 mt-6 font-light">{format(product.price_usd)}</p>

          {product.description && (
            <p className="mt-8 text-onyx/70 leading-relaxed text-[15px] font-light">
              {product.description}
            </p>
          )}

          <dl className="mt-10 grid grid-cols-2 gap-y-4 text-sm border-t border-onyx/10 pt-8">
            {product.metal && <Spec label="Metal" value={product.metal} />}
            {product.gemstone && product.gemstone !== "none" && <Spec label="Stone" value={product.gemstone} />}
            {product.weight_grams !== null && <Spec label="Weight" value={`${product.weight_grams}g`} />}
            <Spec label="Availability" value={product.in_stock ? "In stock" : "Made to order"} />
          </dl>

          <div className="mt-10 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  addItem({
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    priceUsd: product.price_usd,
                    image,
                  });
                  toast.success("Added to your selection");
                }}
                className="flex-1 px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors"
              >
                Add to selection
              </button>
              <button
                onClick={() =>
                  toggle({
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    priceUsd: product.price_usd,
                    image,
                  })
                }
                aria-label="Toggle wishlist"
                className="w-14 grid place-items-center border border-onyx/20 hover:border-gold hover:text-gold transition-colors"
              >
                <Heart className="w-4 h-4" strokeWidth={1.5} fill={isWish ? "currentColor" : "none"} />
              </button>
            </div>
            <a
              href={whatsappLink(
                productQuoteMessage({ name: product.name, slug: product.slug, priceLabel }),
              )}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 border border-onyx text-onyx text-[11px] uppercase tracking-[0.3em] text-center hover:bg-onyx hover:text-ivory transition-colors"
            >
              Request quote on WhatsApp
            </a>
          </div>

          <p className="mt-8 text-xs text-onyx/40 leading-relaxed">
            Worldwide shipping. Each piece is hand-finished to order — please allow up to 3 weeks for
            delivery.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-onyx/40">{label}</dt>
      <dd className="mt-1 capitalize">{value}</dd>
    </div>
  );
}
