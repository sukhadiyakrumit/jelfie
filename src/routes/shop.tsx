import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/products.functions";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});

const searchSchema = z.object({
  category: z.string().optional(),
  metal: z.string().optional(),
  gemstone: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop the Collection — Jelfie Jewellers" },
      {
        name: "description",
        content: "Browse our full collection of handcrafted rings, necklaces, earrings, bracelets and pendants.",
      },
      { property: "og:title", content: "Shop the Collection — Jelfie Jewellers" },
    ],
  }),
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: ShopPage,
});

const CATEGORIES = ["rings", "necklaces", "earrings", "bracelets", "bangles", "pendants"];
const METALS = ["gold", "rose gold", "silver", "platinum"];
const GEMSTONES = ["diamond", "ruby", "emerald", "sapphire", "pearl", "none"];

function ShopPage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });

  const filtered = products.filter((p) => {
    if (search.category && p.category !== search.category) return false;
    if (search.metal && p.metal !== search.metal) return false;
    if (search.gemstone && p.gemstone !== search.gemstone) return false;
    return true;
  });

  const setFilter = (key: keyof z.infer<typeof searchSchema>, value: string | undefined) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, [key]: value || undefined }) });
  };

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">The Collection</span>
        <h1 className="font-serif text-5xl italic mt-2">Shop</h1>
        <p className="mt-4 text-onyx/60 max-w-xl text-sm leading-relaxed">
          Every piece in our atelier is handcrafted, signed, and made to be passed down. Filter by
          category, metal, or stone.
        </p>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-6 py-8 border-y border-onyx/5">
        <div className="flex flex-wrap gap-6 text-[11px] uppercase tracking-widest items-center">
          <FilterGroup label="Category" value={search.category} options={CATEGORIES} onChange={(v) => setFilter("category", v)} />
          <FilterGroup label="Metal" value={search.metal} options={METALS} onChange={(v) => setFilter("metal", v)} />
          <FilterGroup label="Stone" value={search.gemstone} options={GEMSTONES} onChange={(v) => setFilter("gemstone", v)} />
          {(search.category || search.metal || search.gemstone) && (
            <button
              onClick={() => navigate({ search: {} })}
              className="text-gold hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32">
            <p className="font-serif text-2xl italic text-onyx/50">No pieces match these filters.</p>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-onyx/50">{label}:</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-transparent border-b border-onyx/20 pb-0.5 outline-none cursor-pointer hover:border-gold"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
