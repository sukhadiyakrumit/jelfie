import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyInquiries } from "@/lib/account/orders.functions";
import { statusBadgeClass, STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/inquiries")({
  component: InquiriesPage,
});

function InquiriesPage() {
  const fetchList = useServerFn(getMyInquiries);
  const { data, isLoading } = useQuery({ queryKey: ["account-inquiries"], queryFn: () => fetchList() });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Inquiries</h1>
      <p className="text-onyx/60 text-sm mb-8">Pending quote requests awaiting response.</p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <p className="font-serif text-2xl italic text-onyx/50">No pending inquiries</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((o: any) => (
            <li key={o.id}>
              <Link to="/account/orders/$id" params={{ id: o.id }} className="block border border-onyx/10 bg-white p-5 hover:border-gold">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-serif italic">{new Date(o.created_at).toLocaleString()}</p>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(o.status)}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm text-onyx/70 mt-2">
                  {o.quote_request_items?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                </p>
                <p className="text-sm font-medium mt-1">${Number(o.total_usd).toLocaleString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
