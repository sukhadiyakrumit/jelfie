import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { listAllQuotations, updateQuotation, sendQuote } from "@/lib/admin/quotations.functions";
import { STATUS_LABEL, statusBadgeClass } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/admin/quotations")({
  component: QuotationsPage,
});

const STATUSES = [
  "new",
  "contacted",
  "quoted",
  "accepted",
  "paid",
  "processing",
  "shipped",
  "in_transit",
  "delivered",
  "closed",
  "cancelled",
] as const;

function QuotationsPage() {
  const fetchList = useServerFn(listAllQuotations);
  const doUpdate = useServerFn(updateQuotation);
  const doSendQuote = useServerFn(sendQuote);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [quoteFor, setQuoteFor] = useState<any | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");

  const q = useQuery({
    queryKey: ["admin-quotations"],
    queryFn: () => fetchList({ data: { orderType: "quotation" } }),
  });

  const m = useMutation({
    mutationFn: (input: { id: string; status?: string; internal_note?: string | null }) =>
      doUpdate({ data: input as any }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-quotations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendQuoteMut = useMutation({
    mutationFn: (input: { id: string; final_price_usd: number; quote_note: string | null }) =>
      doSendQuote({ data: input }),
    onSuccess: () => {
      toast.success("Quote sent to customer");
      setQuoteFor(null);
      setQuotePrice("");
      setQuoteNote("");
      qc.invalidateQueries({ queryKey: ["admin-quotations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data ?? []).filter((r: any) => filter === "all" || r.status === filter);

  function openQuoteDrawer(r: any) {
    setQuoteFor(r);
    setQuotePrice(r.final_price_usd ? String(r.final_price_usd) : String(r.total_usd ?? ""));
    setQuoteNote(r.quote_note ?? "");
  }

  return (
    <div className="px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl italic">Quotations</h1>
          <p className="text-onyx/60 text-sm mt-1">{rows.length} quote requests</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-onyx/20 px-3 py-2 text-sm bg-white"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Items</th>
              <th className="p-4 text-right">Cart / Quoted</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <Fragment key={r.id}>
                <tr className="border-b border-onyx/5">
                  <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div>{r.customer?.full_name ?? "—"}</div>
                    <div className="text-xs text-onyx/50">{r.customer?.phone ?? ""}</div>
                  </td>
                  <td className="p-4">{r.quote_request_items?.length ?? 0}</td>
                  <td className="p-4 text-right">
                    <div>${Number(r.total_usd).toLocaleString()}</div>
                    {r.final_price_usd != null && (
                      <div className="text-[11px] text-gold">
                        Quoted ${Number(r.final_price_usd).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(r.status)}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      {(r.status === "new" || r.status === "contacted" || r.status === "quoted") && (
                        <button
                          onClick={() => openQuoteDrawer(r)}
                          className="text-[11px] uppercase tracking-widest text-gold hover:text-onyx"
                        >
                          {r.status === "quoted" ? "Revise Quote" : "Send Quote"}
                        </button>
                      )}
                      {r.whatsapp_url && (
                        <a href={r.whatsapp_url} target="_blank" rel="noreferrer" className="text-gold" title="Open WhatsApp">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="text-[11px] uppercase tracking-widest text-onyx/70 hover:text-gold"
                      >
                        {openId === r.id ? "Hide" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {openId === r.id && (
                  <tr className="bg-ivory">
                    <td colSpan={6} className="p-6">
                      <h3 className="font-serif italic mb-2">Items</h3>
                      <ul className="text-sm divide-y divide-onyx/10 mb-4">
                        {r.quote_request_items?.map((i: any) => (
                          <li key={i.id} className="py-2 flex justify-between">
                            <span>
                              {i.name} × {i.quantity}
                            </span>
                            <span>${Number(i.price_usd).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>

                      {r.quote_note && (
                        <div className="mb-4 text-sm">
                          <div className="text-[10px] uppercase tracking-widest text-onyx/50 mb-1">
                            Quote note to customer
                          </div>
                          <p className="whitespace-pre-wrap">{r.quote_note}</p>
                        </div>
                      )}
                      {r.rejection_reason && (
                        <div className="mb-4 text-sm">
                          <div className="text-[10px] uppercase tracking-widest text-red-600 mb-1">
                            Customer rejection reason
                          </div>
                          <p className="whitespace-pre-wrap">{r.rejection_reason}</p>
                        </div>
                      )}

                      <label className="block mb-4">
                        <span className="text-[10px] uppercase tracking-widest text-onyx/50">Update status</span>
                        <select
                          value={r.status}
                          onChange={(e) => m.mutate({ id: r.id, status: e.target.value })}
                          className="mt-1 border border-onyx/20 px-2 py-1 text-xs bg-white capitalize"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s] ?? s}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[10px] uppercase tracking-widest text-onyx/50">Internal note</span>
                        <textarea
                          defaultValue={r.internal_note ?? ""}
                          onBlur={(e) =>
                            e.target.value !== (r.internal_note ?? "") &&
                            m.mutate({ id: r.id, internal_note: e.target.value })
                          }
                          rows={3}
                          className="w-full border border-onyx/20 px-3 py-2 text-sm mt-1 bg-white"
                        />
                      </label>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-onyx/40 italic font-serif">
                  No quotations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {quoteFor && (
        <div
          className="fixed inset-0 bg-onyx/50 z-50 flex items-center justify-center p-4"
          onClick={() => setQuoteFor(null)}
        >
          <div
            className="bg-white max-w-lg w-full p-8 border border-onyx/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl italic mb-1">Send Final Quote</h2>
            <p className="text-xs text-onyx/60 mb-6">
              Customer: {quoteFor.customer?.full_name ?? "—"} · Cart total ${Number(quoteFor.total_usd).toLocaleString()}
            </p>

            <label className="block mb-4">
              <span className="text-[10px] uppercase tracking-widest text-onyx/50">Final Price (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
                className="w-full border border-onyx/20 px-3 py-2 mt-1"
                autoFocus
              />
            </label>

            <label className="block mb-6">
              <span className="text-[10px] uppercase tracking-widest text-onyx/50">Note to customer</span>
              <textarea
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                rows={4}
                placeholder="Terms, delivery timeframe, inclusions…"
                className="w-full border border-onyx/20 px-3 py-2 mt-1 text-sm"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuoteFor(null)}
                className="px-5 py-2 border border-onyx/20 text-[11px] uppercase tracking-widest hover:border-onyx"
              >
                Cancel
              </button>
              <button
                disabled={sendQuoteMut.isPending || !quotePrice || Number(quotePrice) < 0}
                onClick={() =>
                  sendQuoteMut.mutate({
                    id: quoteFor.id,
                    final_price_usd: Number(quotePrice),
                    quote_note: quoteNote.trim() ? quoteNote.trim() : null,
                  })
                }
                className="px-5 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold disabled:opacity-50"
              >
                {sendQuoteMut.isPending ? "Sending…" : "Send Quote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
