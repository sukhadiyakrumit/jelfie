import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl italic mb-8">New product</h1>
      <ProductForm onSaved={() => navigate({ to: "/admin/products" })} />
    </div>
  );
}
