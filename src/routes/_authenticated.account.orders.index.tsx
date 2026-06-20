import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrders } from "@/lib/account/orders.functions";
import { statusBadgeClass, STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/orders/")({
  component: OrdersListPage,
});

function OrdersListPage() {
  const fetchOrders = useServerFn(getMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["account-orders"], queryFn: () => fetchOrders() });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Order History</h1>
      <p className="text-onyx/60 text-sm mb-8">All your orders and quote requests.</p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <p className="font-serif text-2xl italic text-onyx/50 mb-6">No orders yet</p>
          <Link to="/shop" className="inline-block px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold">
            Browse Collection
          </Link>
        </div>
      ) : (
        <div className="border border-onyx/10 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((o: any) => (
                <tr key={o.id} className="border-b border-onyx/5 hover:bg-onyx/5">
                  <td className="p-4">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-4">{o.quote_request_items?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}</td>
                  <td className="p-4 text-right">${Number(o.total_usd).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${statusBadgeClass(o.status)}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link to="/account/orders/$id" params={{ id: o.id }} className="text-gold text-[11px] uppercase tracking-widest">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
