import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag, Truck, MessageSquare, CreditCard, FileText } from "lucide-react";
import { getDashboardStats } from "@/lib/account/dashboard.functions";

export const Route = createFileRoute("/_authenticated/account/")({
  component: DashboardPage,
});

const DOC_LABEL: Record<string, string> = {
  invoice: "Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  coa: "COA",
  coo: "COO",
  other: "Document",
};

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["account-dashboard"], queryFn: () => fetchStats() });

  if (isLoading || !data) {
    return <div className="p-10 text-onyx/50">Loading…</div>;
  }

  const { stats, recentDocuments } = data;

  const cards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, to: "/account/orders" as const },
    { label: "Active Shipments", value: stats.activeShipments, icon: Truck, to: "/account/shipments" as const },
    { label: "Open Inquiries", value: stats.openInquiries, icon: MessageSquare, to: "/account/inquiries" as const },
    { label: "Pending Payment", value: stats.pendingPayment, icon: CreditCard, to: "/account/payments" as const },
  ];

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Welcome back</h1>
      <p className="text-onyx/60 text-sm mb-8">Here's a snapshot of your account.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} className="border border-onyx/10 bg-white p-6 hover:border-gold transition-colors">
              <Icon className="w-5 h-5 text-gold mb-3" />
              <p className="text-3xl font-serif italic">{c.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-onyx/60 mt-1">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-onyx/10 bg-white">
          <header className="px-6 py-4 border-b border-onyx/10 flex items-center justify-between">
            <h2 className="font-serif text-xl italic">Recent Orders</h2>
            <Link to="/account/orders" className="text-[10px] uppercase tracking-widest text-gold">View all →</Link>
          </header>
          <ul className="divide-y divide-onyx/5">
            {stats.recent.length === 0 ? (
              <li className="px-6 py-10 text-center text-onyx/40 italic font-serif">No orders yet</li>
            ) : (
              stats.recent.map((o) => (
                <li key={o.id}>
                  <Link to="/account/orders/$id" params={{ id: o.id }} className="px-6 py-4 flex items-center justify-between hover:bg-onyx/5">
                    <div>
                      <p className="text-sm font-medium">${Number(o.total_usd).toLocaleString()}</p>
                      <p className="text-[11px] text-onyx/50">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-onyx/5">{o.status.replace("_", " ")}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-onyx/10 bg-white">
          <header className="px-6 py-4 border-b border-onyx/10 flex items-center justify-between">
            <h2 className="font-serif text-xl italic">Recent Documents</h2>
            <Link to="/account/documents" className="text-[10px] uppercase tracking-widest text-gold">View all →</Link>
          </header>
          <ul className="divide-y divide-onyx/5">
            {recentDocuments.length === 0 ? (
              <li className="px-6 py-10 text-center text-onyx/40 italic font-serif">No documents yet</li>
            ) : (
              recentDocuments.map((d: any) => (
                <li key={d.id} className="px-6 py-4 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gold" />
                  <div className="flex-1">
                    <p className="text-sm">{d.file_name}</p>
                    <p className="text-[11px] text-onyx/50">{DOC_LABEL[d.doc_type] ?? d.doc_type} · {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
