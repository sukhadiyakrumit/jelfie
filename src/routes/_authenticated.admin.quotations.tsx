import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { listAllQuotations, updateQuotation } from "@/lib/admin/quotations.functions";

export const Route = createFileRoute("/_authenticated/admin/quotations")({
  component: QuotationsPage,
});

const STATUSES = ["new", "contacted", "closed", "cancelled", "paid"] as const;

function QuotationsPage() {
  const fetchList = useServerFn(listAllQuotations);
  const doUpdate = useServerFn(updateQuotation);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["admin-quotations"], queryFn: () => fetchList() });

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

  const rows = (q.data ?? []).filter((r: any) => filter === "all" || r.status === filter);

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
              {s}
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
              <th className="p-4 text-right">Total</th>
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
                  <td className="p-4 text-right">${Number(r.total_usd).toLocaleString()}</td>
                  <td className="p-4">
                    <select
                      value={r.status}
                      onChange={(e) => m.mutate({ id: r.id, status: e.target.value })}
                      className="border border-onyx/20 px-2 py-1 text-xs bg-white capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      <a href={r.whatsapp_url} target="_blank" rel="noreferrer" className="text-gold" title="Open WhatsApp">
                        <ExternalLink className="w-4 h-4" />
                      </a>
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
    </div>
  );
}
