import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ProductForm } from "@/components/admin/product-form";
import { getProductBySlug, listProducts } from "@/lib/products.functions";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchList = useServerFn(listProducts);
  const fetchBySlug = useServerFn(getProductBySlug);

  // Lookup product by id via list (simple, cached)
  const q = useQuery({
    queryKey: ["product-by-id", id],
    queryFn: async () => {
      const list = await fetchList();
      const found = list.find((p) => p.id === id);
      if (!found) return null;
      // ensure latest images by fetching by slug
      return await fetchBySlug({ data: { slug: found.slug } });
    },
  });

  if (q.isLoading) return <div className="p-12 text-onyx/60">Loading…</div>;
  if (!q.data) return <div className="p-12 text-onyx/60">Product not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl italic mb-8">Edit product</h1>
      <ProductForm
        initial={q.data}
        onSaved={() => navigate({ to: "/admin/products" })}
      />
    </div>
  );
}
