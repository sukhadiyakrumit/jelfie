import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { listAllQuotations, updateQuotation } from "@/lib/admin/quotations.functions";
import { STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const FULFILLMENT_STATUSES = ["pending_payment","paid","processing","shipped","in_transit","delivered","closed","cancelled"];

function OrdersPage() {
  const fetchList = useServerFn(listAllQuotations);
  const doUpdate = useServerFn(updateQuotation);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-orders-instant"],
    queryFn: () => fetchList({ data: { orderType: "instant" } }),
  });

  const m = useMutation({
    mutationFn: (input: { id: string; status: string }) => doUpdate({ data: input as any }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-orders-instant"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Instant Orders</h1>
      <p className="text-onyx/60 text-sm mb-8">Direct checkout orders from the Instant Commerce track ({rows.length})</p>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Items</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b border-onyx/5">
                <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <div>{r.customer?.full_name ?? "—"}</div>
                  <div className="text-xs text-onyx/50">{r.customer?.phone ?? ""}</div>
                </td>
                <td className="p-4">
                  {r.quote_request_items?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                </td>
                <td className="p-4 text-right">${Number(r.total_usd).toLocaleString()}</td>
                <td className="p-4">
                  <select
                    value={r.status}
                    onChange={(e) => m.mutate({ id: r.id, status: e.target.value })}
                    className="border border-onyx/20 px-2 py-1 text-xs bg-white capitalize"
                  >
                    {FULFILLMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-right space-x-3">
                  <Link to="/admin/orders/$id" params={{ id: r.id }} className="text-gold text-[11px] uppercase tracking-widest">Manage</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-onyx/40 italic font-serif">
                  No instant orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
