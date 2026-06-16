import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listProducts } from "@/lib/products.functions";
import { deleteProduct, checkIsAdmin, claimAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: AdminProductsList,
});

function AdminProductsList() {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchCheck = useServerFn(checkIsAdmin);
  const fetchProducts = useServerFn(listProducts);
  const doDelete = useServerFn(deleteProduct);
  const doClaim = useServerFn(claimAdmin);

  const adminCheck = useQuery({ queryKey: ["admin-check"], queryFn: () => fetchCheck() });
  const productsQ = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });

  const claimMut = useMutation({
    mutationFn: () => doClaim(),
    onSuccess: () => {
      toast.success("Admin role granted");
      qc.invalidateQueries({ queryKey: ["admin-check"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (adminCheck.isLoading) return <div className="p-12 text-onyx/60">Loading…</div>;

  if (adminCheck.data && !adminCheck.data.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="font-serif text-3xl italic mb-4">Claim admin access</h1>
        <p className="text-onyx/60 text-sm mb-8">
          No admin exists yet. Click below to make this account the catalogue administrator. This
          can only be done once.
        </p>
        <button
          onClick={() => claimMut.mutate()}
          disabled={claimMut.isPending}
          className="px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
        >
          {claimMut.isPending ? "Granting…" : "Claim admin"}
        </button>
      </div>
    );
  }

  const products = productsQ.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif text-4xl italic">Products</h1>
          <p className="text-onyx/60 text-sm mt-1">{products.length} pieces in catalogue</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
        >
          <Plus className="w-4 h-4" />
          New product
        </Link>
      </div>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10">
            <tr className="text-left text-[10px] uppercase tracking-widest text-onyx/50">
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Metal</th>
              <th className="p-4">Stone</th>
              <th className="p-4 text-right">Price USD</th>
              <th className="p-4">Featured</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-onyx/5 hover:bg-ivory">
                <td className="p-4 font-serif italic">{p.name}</td>
                <td className="p-4 capitalize text-onyx/70">{p.category}</td>
                <td className="p-4 capitalize text-onyx/70">{p.metal ?? "—"}</td>
                <td className="p-4 capitalize text-onyx/70">{p.gemstone ?? "—"}</td>
                <td className="p-4 text-right">${p.price_usd.toLocaleString()}</td>
                <td className="p-4">{p.is_featured ? "★" : ""}</td>
                <td className="p-4 text-right">
                  <div className="flex gap-3 justify-end">
                    <Link
                      to="/admin/products/$id"
                      params={{ id: p.id }}
                      className="text-onyx/60 hover:text-gold"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id);
                      }}
                      className="text-onyx/60 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-onyx/40 italic font-serif">
                  No products yet — create your first piece.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
