import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin/dashboard.functions";
import { Package, FileText, Users, CreditCard, MessageSquare, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchStats = useServerFn(getAdminStats);
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  const s = q.data;

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Dashboard</h1>
      <p className="text-onyx/60 text-sm mb-10">Overview of your atelier.</p>

      {q.isLoading || !s ? (
        <p className="text-onyx/40">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <Stat icon={Package} label="Products" value={s.products} />
            <Stat icon={FileText} label="Total quotations" value={s.quotes} />
            <Stat icon={Clock} label="Pending quotes" value={s.pendingQuotes} accent />
            <Stat icon={Users} label="Registered users" value={s.users} />
            <Stat icon={FileText} label="Quoted (USD)" value={`$${s.totalQuotedUsd.toLocaleString()}`} />
            <Stat icon={CreditCard} label="Payments received" value={`$${s.paidUsd.toLocaleString()}`} />
            <Stat icon={MessageSquare} label="New messages" value={s.newContactMessages} accent />
          </div>

          <section className="border border-onyx/10 bg-white">
            <header className="px-6 py-4 border-b border-onyx/10 flex justify-between items-center">
              <h2 className="font-serif italic text-xl">Recent quotations</h2>
              <Link to="/admin/quotations" className="text-[11px] uppercase tracking-widest text-gold">
                View all →
              </Link>
            </header>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-onyx/50 border-b border-onyx/10">
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {s.recentQuotes.map((r) => (
                  <tr key={r.id} className="border-b border-onyx/5">
                    <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-4 capitalize">{r.status}</td>
                    <td className="p-4 text-right">${Number(r.total_usd).toLocaleString()}</td>
                  </tr>
                ))}
                {s.recentQuotes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-onyx/40 italic font-serif">
                      No quotations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Package;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className={`border border-onyx/10 bg-white p-5 ${accent ? "border-gold/40" : ""}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-onyx/50">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-3 font-serif text-3xl italic">{value}</div>
    </div>
  );
}
