import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import {
  getAdminOrderDetail,
  updateOrderShipping,
  uploadOrderDocument,
  deleteOrderDocument,
  updatePaymentStatus,
} from "@/lib/admin/order-detail.functions";
import { STATUS_LABEL, DOC_TYPES, statusBadgeClass } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: AdminOrderDetail,
});

const ALL_STATUSES = Object.keys(STATUS_LABEL);

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getAdminOrderDetail);
  const doShip = useServerFn(updateOrderShipping);
  const doUpload = useServerFn(uploadOrderDocument);
  const doDelete = useServerFn(deleteOrderDocument);
  const doPayStatus = useServerFn(updatePaymentStatus);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["admin-order", id], queryFn: () => fetchDetail({ data: { id } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-order", id] });

  const shipMut = useMutation({
    mutationFn: (input: any) => doShip({ data: { id, ...input } }),
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMut = useMutation({
    mutationFn: (input: { doc_type: string; file: File }) =>
      new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const r = await doUpload({
              data: {
                quote_id: id,
                doc_type: input.doc_type as any,
                file_name: input.file.name,
                file_base64: base64,
                content_type: input.file.type || "application/octet-stream",
              },
            });
            resolve(r);
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(input.file);
      }),
    onSuccess: () => { toast.success("Document uploaded"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (docId: string) => doDelete({ data: { id: docId } }),
    onSuccess: () => { refresh(); },
  });

  const paySt = useMutation({
    mutationFn: (input: { id: string; status: string }) => doPayStatus({ data: input as any }),
    onSuccess: () => { refresh(); toast.success("Payment updated"); },
  });

  const [docType, setDocType] = useState<string>("invoice");

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;
  const { order, customer, history, documents, payments } = q.data;

  return (
    <div className="px-10 py-10 max-w-5xl">
      <Link to={order.order_type === "quotation" ? "/admin/quotations" : "/admin/orders"} className="text-[10px] uppercase tracking-widest text-onyx/60 hover:text-gold">← Back</Link>
      <div className="flex items-center gap-3 mt-2 mb-1">
        <h1 className="font-serif text-4xl italic">
          {order.order_type === "instant" ? "Order" : "Quotation"} #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${order.order_type === "instant" ? "bg-gold/20 text-gold" : "bg-onyx/10 text-onyx"}`}>
          {order.order_type === "instant" ? "Instant Commerce" : "Private Consultation"}
        </span>
      </div>
      <p className="text-onyx/60 text-sm mb-6">
        {customer?.company_name ?? customer?.full_name ?? "—"} · {customer?.phone ?? ""}
      </p>

      {/* Status / Tracking */}
      <section className="border border-onyx/10 bg-white p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1.5">Status</label>
          <select
            defaultValue={order.status}
            onChange={(e) => shipMut.mutate({ status: e.target.value })}
            className="w-full border border-onyx/20 px-3 py-2 bg-white"
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1.5">Carrier</label>
          <input defaultValue={order.carrier ?? ""} onBlur={(e) => shipMut.mutate({ carrier: e.target.value || null })} className="w-full border border-onyx/20 px-3 py-2" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1.5">Tracking number</label>
          <input defaultValue={order.tracking_number ?? ""} onBlur={(e) => shipMut.mutate({ tracking_number: e.target.value || null })} className="w-full border border-onyx/20 px-3 py-2" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1.5">Estimated delivery</label>
          <input type="date" defaultValue={order.estimated_delivery ?? ""} onBlur={(e) => shipMut.mutate({ estimated_delivery: e.target.value || null })} className="w-full border border-onyx/20 px-3 py-2" />
        </div>
      </section>

      {/* Items */}
      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-3 border-b border-onyx/10 font-serif text-lg italic">Items</header>
        <ul className="divide-y divide-onyx/5">
          {(order.quote_request_items ?? []).map((i: any) => (
            <li key={i.id} className="px-6 py-3 flex items-center gap-4">
              {i.image_url && <img src={i.image_url} className="w-12 h-12 object-cover" alt="" />}
              <div className="flex-1 text-sm">{i.name} <span className="text-onyx/50">×{i.quantity}</span></div>
              <div className="text-sm">${(Number(i.price_usd) * i.quantity).toFixed(2)}</div>
            </li>
          ))}
        </ul>
        <div className="px-6 py-3 border-t border-onyx/10 flex justify-between text-sm font-medium">
          <span>Total</span><span>${Number(order.total_usd).toLocaleString()}</span>
        </div>
      </section>

      {/* Documents */}
      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-3 border-b border-onyx/10 font-serif text-lg italic">Documents</header>
        <div className="px-6 py-3 border-b border-onyx/5 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1">Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border border-onyx/20 px-3 py-2">
              {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold cursor-pointer">
            <Upload className="w-4 h-4" /> Upload
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate({ doc_type: docType, file: f });
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <ul className="divide-y divide-onyx/5">
          {documents.length === 0 ? (
            <li className="px-6 py-6 text-center text-onyx/40 italic font-serif">No documents</li>
          ) : (
            documents.map((d: any) => (
              <li key={d.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <span className="flex-1">{d.file_name} <span className="text-[10px] uppercase tracking-widest text-onyx/50 ml-2">{d.doc_type}</span></span>
                <button onClick={() => delMut.mutate(d.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Payments */}
      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-3 border-b border-onyx/10 font-serif text-lg italic">Payments</header>
        {payments.length === 0 ? (
          <p className="px-6 py-6 text-center text-onyx/40 italic font-serif">No payments recorded</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-onyx/5">
                  <td className="px-6 py-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                  <td className="px-6 py-3 capitalize">{p.method}</td>
                  <td className="px-6 py-3">${Number(p.amount_usd).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <select
                      defaultValue={p.status}
                      onChange={(e) => paySt.mutate({ id: p.id, status: e.target.value })}
                      className="border border-onyx/20 px-2 py-1 text-xs"
                    >
                      {["pending","completed","failed","refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Status history */}
      <section className="border border-onyx/10 bg-white">
        <header className="px-6 py-3 border-b border-onyx/10 font-serif text-lg italic">Status History</header>
        <ul className="divide-y divide-onyx/5 text-sm">
          {history.map((h: any) => (
            <li key={h.id} className="px-6 py-2 flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(h.status)}`}>{STATUS_LABEL[h.status] ?? h.status}</span>
              <span className="text-onyx/50">{new Date(h.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
