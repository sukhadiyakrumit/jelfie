import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/products.functions";
import { whatsappLink } from "@/lib/whatsapp";
import heroImage from "@/assets/hero.jpg";
import ringsImage from "@/assets/collection-rings.jpg";
import necklacesImage from "@/assets/collection-necklaces.jpg";
import earringsImage from "@/assets/collection-earrings.jpg";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jelfie Jewellers — Timeless Craft for the Modern Soul" },
      {
        name: "description",
        content:
          "Handcrafted fine jewellery — rings, necklaces, earrings, and bespoke pieces. Shipped worldwide. Request a quote on WhatsApp.",
      },
      { property: "og:title", content: "Jelfie Jewellers — Timeless Craft for the Modern Soul" },
      {
        property: "og:description",
        content: "Handcrafted fine jewellery shipped worldwide.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-onyx/60">{error.message}</p>
    </div>
  ),
});

function HomePage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const featured = products.filter((p) => p.is_featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-ivory text-onyx font-sans">
      <SiteHeader />

      {/* Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Diamond necklace on model"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ivory/30" />
        <div className="relative z-10 text-center px-6">
          <span className="block text-gold text-xs font-medium uppercase tracking-[0.4em] mb-4">
            Est. 1924
          </span>
          <h1 className="font-serif text-5xl md:text-7xl mb-8 max-w-3xl leading-[1.1] italic text-onyx">
            Timeless Craft for the
            <br />
            Modern Soul
          </h1>
          <Link
            to="/shop"
            className="inline-block px-10 py-4 bg-onyx text-ivory text-[11px] font-medium uppercase tracking-[0.3em] hover:bg-gold transition-all duration-500"
          >
            Shop the Collection
          </Link>
        </div>
      </section>

      {/* Collections */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { slug: "rings", title: "The Eternity Series", label: "Discover Rings", img: ringsImage },
            { slug: "necklaces", title: "Signature Chains", label: "Discover Necklaces", img: necklacesImage },
            { slug: "earrings", title: "The Astral Collection", label: "Discover Earrings", img: earringsImage },
          ].map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              className="group cursor-pointer block"
            >
              <div className="overflow-hidden mb-6">
                <img
                  src={c.img}
                  alt={c.title}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="font-serif text-2xl italic mb-1">{c.title}</h3>
              <p className="text-[10px] uppercase tracking-widest text-onyx/50">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Manifesto */}
      <section className="bg-onyx text-ivory py-32 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-px h-16 bg-gold mx-auto mb-12" />
          <h2 className="font-serif text-3xl md:text-4xl italic leading-relaxed">
            “We believe that every piece of jewellery carries a silent promise — of heritage, of love,
            and of the enduring beauty found in the smallest details.”
          </h2>
          <p className="mt-8 text-[11px] uppercase tracking-[0.4em] text-gold">
            The Jelfie Manifesto
          </p>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div>
            <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Curation</span>
            <h2 className="font-serif text-4xl italic mt-2">Seasonal Essentials</h2>
          </div>
          <Link
            to="/shop"
            className="text-[11px] uppercase tracking-widest border-b border-onyx pb-1 hover:text-gold hover:border-gold transition-colors"
          >
            View All
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-center text-onyx/50 italic">Our seasonal selection is being curated.</p>
        )}
      </section>

      {/* WhatsApp CTA */}
      <section className="py-20 bg-gold/5 border-t border-gold/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <h3 className="font-serif text-3xl italic mb-6">Seeking a Bespoke Masterpiece?</h3>
          <p className="text-onyx/60 text-sm max-w-lg mb-10 leading-relaxed font-light">
            Connect with our master jewellers via WhatsApp for personalised consultations, custom
            designs, or valuation requests.
          </p>
          <a
            href={whatsappLink("Hi Jelfie Jewellers, I'd like to enquire about a bespoke piece.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-4 px-12 py-5 bg-onyx text-ivory text-[11px] font-medium uppercase tracking-[0.3em] hover:bg-gold transition-colors"
          >
            Connect on WhatsApp
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
