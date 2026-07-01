import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { Download, FileText, RotateCcw, FileDown } from "lucide-react";
import { getMyOrder, repeatOrder } from "@/lib/account/orders.functions";
import { getDocumentSignedUrl } from "@/lib/account/documents.functions";
import { getMyProfile } from "@/lib/account/profile.functions";
import { downloadInvoicePdf } from "@/lib/account/invoice";
import { statusBadgeClass, STATUS_LABEL, TIMELINE_STATUSES, DOC_TYPES } from "@/lib/account/status";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/account/orders/$id")({
  component: OrderDetailPage,
});

const DOC_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getMyOrder);
  const fetchSigned = useServerFn(getDocumentSignedUrl);
  const fetchProfile = useServerFn(getMyProfile);
  const doRepeat = useServerFn(repeatOrder);
  const { addItem } = useCart();

  const q = useQuery({ queryKey: ["account-order", id], queryFn: () => fetchOrder({ data: { id } }) });

  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_requests", filter: `id=eq.${id}` }, () => q.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `quote_id=eq.${id}` }, () => q.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_documents", filter: `quote_id=eq.${id}` }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, q]);

  const downloadDoc = useMutation({
    mutationFn: (docId: string) => fetchSigned({ data: { id: docId } }),
    onSuccess: (res) => { window.open(res.url, "_blank"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: () => doRepeat({ data: { id } }),
    onSuccess: (items: any[]) => {
      items.forEach((i) =>
        addItem({
          productId: i.product_id ?? i.name,
          slug: i.slug,
          name: i.name,
          priceUsd: Number(i.price_usd),
          image: i.image_url,
        }, i.quantity),
      );
      toast.success("Added to cart");
      navigate({ to: "/cart" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadInvoice = async () => {
    if (!q.data) return;
    const profile = await fetchProfile().catch(() => null);
    const o = q.data.order;
    const addrParts = [profile?.address_line1, profile?.address_line2, profile?.city, profile?.country, profile?.postal_code]
      .filter(Boolean).join(", ");
    downloadInvoicePdf({
      invoiceNumber: q.data.payments[0]?.invoice_number ?? o.id.slice(0, 8).toUpperCase(),
      date: new Date(o.created_at).toLocaleDateString(),
      customer: {
        name: profile?.full_name,
        company: profile?.company_name,
        address: addrParts,
      },
      items: (o.quote_request_items ?? []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        priceUsd: Number(i.price_usd),
      })),
      totalUsd: Number(o.total_usd),
      notes: o.note,
    });
  };

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;

  const { order, history, documents, payments } = q.data;
  const currentIdx = TIMELINE_STATUSES.indexOf(order.status);

  return (
    <div className="px-10 py-10 max-w-5xl">
      <Link to="/account/orders" className="text-[10px] uppercase tracking-widest text-onyx/60 hover:text-gold">
        ← Back to orders
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mt-2 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-4xl italic">
              {order.order_type === "instant" ? "Order" : "Quotation"} #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${order.order_type === "instant" ? "bg-gold/20 text-gold" : "bg-onyx/10 text-onyx"}`}>
              {order.order_type === "instant" ? "Instant" : "Quotation"}
            </span>
          </div>
          <p className="text-onyx/60 text-sm mt-1">
            Placed {new Date(order.created_at).toLocaleDateString()} ·{" "}
            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusBadgeClass(order.status)}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadInvoice}
            className="inline-flex items-center gap-2 px-4 py-2 border border-onyx/30 text-[11px] uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            <FileDown className="w-4 h-4" /> Invoice
          </button>
          <button
            onClick={() => reorderMut.mutate()}
            disabled={reorderMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reorder
          </button>
        </div>
      </div>

      {/* Timeline */}
      <section className="border border-onyx/10 bg-white p-6 mb-6">
        <h2 className="font-serif text-xl italic mb-6">Milestone Timeline</h2>
        <ol className="relative border-l border-onyx/15 ml-3 space-y-5">
          {TIMELINE_STATUSES.map((s, idx) => {
            const reached = idx <= currentIdx && order.status !== "cancelled";
            const histEntry = history.find((h: any) => h.status === s);
            return (
              <li key={s} className="ml-4">
                <span
                  className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full ${
                    reached ? "bg-gold" : "bg-onyx/15"
                  }`}
                />
                <p className={`text-sm ${reached ? "text-onyx font-medium" : "text-onyx/40"}`}>
                  {STATUS_LABEL[s]}
                </p>
                {histEntry && (
                  <p className="text-[11px] text-onyx/50">
                    {new Date(histEntry.created_at).toLocaleString()}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        {(order.tracking_number || order.carrier || order.estimated_delivery) && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-onyx/10 pt-4 text-sm">
            {order.carrier && <div><p className="text-[10px] uppercase tracking-widest text-onyx/50">Carrier</p><p>{order.carrier}</p></div>}
            {order.tracking_number && <div><p className="text-[10px] uppercase tracking-widest text-onyx/50">Tracking #</p><p>{order.tracking_number}</p></div>}
            {order.estimated_delivery && <div><p className="text-[10px] uppercase tracking-widest text-onyx/50">ETA</p><p>{new Date(order.estimated_delivery).toLocaleDateString()}</p></div>}
          </div>
        )}
      </section>

      {/* Items */}
      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-4 border-b border-onyx/10"><h2 className="font-serif text-xl italic">Items</h2></header>
        <ul className="divide-y divide-onyx/5">
          {(order.quote_request_items ?? []).map((i: any) => (
            <li key={i.id} className="px-6 py-4 flex items-center gap-4">
              {i.image_url && <img src={i.image_url} alt={i.name} className="w-14 h-14 object-cover" />}
              <div className="flex-1">
                <Link to="/product/$slug" params={{ slug: i.slug }} className="font-serif italic hover:text-gold">
                  {i.name}
                </Link>
                <p className="text-[11px] text-onyx/50">Qty {i.quantity} · ${Number(i.price_usd).toFixed(2)}</p>
                {order.status === "delivered" && i.product_id && (
                  <Link
                    to="/product/$slug"
                    params={{ slug: i.slug }}
                    hash="reviews"
                    className="inline-block mt-1 text-[10px] uppercase tracking-widest text-gold hover:text-onyx"
                  >
                    ★ Leave a review
                  </Link>
                )}
              </div>
              <p className="text-sm font-medium">${(Number(i.price_usd) * i.quantity).toFixed(2)}</p>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 border-t border-onyx/10 flex justify-between text-sm font-medium">
          <span>Total</span>
          <span>${Number(order.final_price_usd ?? order.total_usd).toLocaleString()}</span>
        </div>
      </section>

      {/* Documents */}
      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-4 border-b border-onyx/10"><h2 className="font-serif text-xl italic">Documents</h2></header>
        {documents.length === 0 ? (
          <p className="px-6 py-8 text-center text-onyx/40 italic font-serif">No documents uploaded yet</p>
        ) : (
          <ul className="divide-y divide-onyx/5">
            {documents.map((d: any) => (
              <li key={d.id} className="px-6 py-3 flex items-center gap-3">
                <FileText className="w-4 h-4 text-gold" />
                <div className="flex-1">
                  <p className="text-sm">{d.file_name}</p>
                  <p className="text-[11px] text-onyx/50">{DOC_LABEL[d.doc_type] ?? d.doc_type} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => downloadDoc.mutate(d.id)}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-gold hover:text-onyx"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payments */}
      <section className="border border-onyx/10 bg-white">
        <header className="px-6 py-4 border-b border-onyx/10"><h2 className="font-serif text-xl italic">Payments</h2></header>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-center text-onyx/40 italic font-serif">No payments recorded yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-onyx/50 border-b border-onyx/10">
              <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Method</th><th className="px-6 py-3">Reference</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-onyx/5">
                  <td className="px-6 py-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                  <td className="px-6 py-3 capitalize">{p.method}</td>
                  <td className="px-6 py-3 text-onyx/60">{p.reference ?? "—"}</td>
                  <td className="px-6 py-3"><span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                  <td className="px-6 py-3 text-right font-medium">${Number(p.amount_usd).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
