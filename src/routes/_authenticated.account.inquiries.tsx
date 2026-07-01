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
      <p className="text-onyx/60 text-sm mb-8">
        Quotation requests. Review offered prices, accept to proceed to payment, or decline.
      </p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <p className="font-serif text-2xl italic text-onyx/50">No inquiries yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((o: any) => {
            const showReview = o.status === "quoted";
            const showPay = o.status === "accepted";
            return (
              <li key={o.id} className="border border-onyx/10 bg-white p-5 hover:border-gold">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-serif italic">{new Date(o.created_at).toLocaleString()}</p>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(o.status)}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm text-onyx/70 mt-2">
                  {o.quote_request_items?.map((i: any) => `${i.name}×${i.quantity}`).join(", ")}
                </p>
                <div className="mt-3 flex items-end justify-between flex-wrap gap-3">
                  <div className="text-sm">
                    <span className="text-onyx/60">Cart total: </span>
                    <span className="font-medium">${Number(o.total_usd).toLocaleString()}</span>
                    {o.final_price_usd != null && (
                      <span className="ml-3 text-gold">
                        · Final Quote: ${Number(o.final_price_usd).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {showReview && (
                      <Link
                        to="/account/inquiries/$id"
                        params={{ id: o.id }}
                        className="px-4 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold"
                      >
                        Review Quote
                      </Link>
                    )}
                    {showPay && (
                      <Link
                        to="/account/inquiries/$id/pay"
                        params={{ id: o.id }}
                        className="px-4 py-2 bg-gold text-onyx text-[11px] uppercase tracking-widest hover:bg-onyx hover:text-ivory"
                      >
                        Pay Now
                      </Link>
                    )}
                    <Link
                      to="/account/inquiries/$id"
                      params={{ id: o.id }}
                      className="px-4 py-2 border border-onyx/20 text-[11px] uppercase tracking-widest hover:border-onyx"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
