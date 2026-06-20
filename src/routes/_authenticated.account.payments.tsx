import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPayments } from "@/lib/account/payments.functions";
import { statusBadgeClass } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const fetchList = useServerFn(getMyPayments);
  const { data, isLoading } = useQuery({ queryKey: ["account-payments"], queryFn: () => fetchList() });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Payments</h1>
      <p className="text-onyx/60 text-sm mb-8">Transaction records across your orders.</p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <p className="font-serif text-2xl italic text-onyx/50">No payments yet</p>
        </div>
      ) : (
        <div className="border border-onyx/10 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-onyx/50 border-b border-onyx/10">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Order</th>
                <th className="p-4">Method</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: any) => (
                <tr key={p.id} className="border-b border-onyx/5">
                  <td className="p-4">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4">
                    <Link to="/account/orders/$id" params={{ id: p.quote_id }} className="text-gold">
                      #{p.quote_id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="p-4 capitalize">{p.method}</td>
                  <td className="p-4 text-onyx/60">{p.reference ?? "—"}</td>
                  <td className="p-4">{p.invoice_number ?? "—"}</td>
                  <td className="p-4"><span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                  <td className="p-4 text-right font-medium">${Number(p.amount_usd).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
