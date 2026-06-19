import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { listAllPayments, recordPayment, deletePayment } from "@/lib/admin/payments.functions";
import { listAllQuotations } from "@/lib/admin/quotations.functions";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const fetchPayments = useServerFn(listAllPayments);
  const fetchQuotes = useServerFn(listAllQuotations);
  const doRecord = useServerFn(recordPayment);
  const doDelete = useServerFn(deletePayment);
  const qc = useQueryClient();

  const payments = useQuery({ queryKey: ["admin-payments"], queryFn: () => fetchPayments() });
  const quotes = useQuery({ queryKey: ["admin-quotations"], queryFn: () => fetchQuotes() });

  const [quoteId, setQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");

  const m = useMutation({
    mutationFn: () =>
      doRecord({
        data: {
          quote_id: quoteId,
          amount_usd: Number(amount),
          method,
          reference: reference || null,
          mark_quote_paid: true,
        },
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-quotations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setQuoteId("");
      setAmount("");
      setReference("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
  });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-8">Payments</h1>

      <section className="bg-white border border-onyx/10 p-6 mb-8">
        <h2 className="font-serif italic text-xl mb-4">Record a payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
            className="border border-onyx/20 px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">Select quotation…</option>
            {(quotes.data ?? []).map((q: any) => (
              <option key={q.id} value={q.id}>
                {new Date(q.created_at).toLocaleDateString()} — {q.customer?.full_name ?? "—"} — $
                {Number(q.total_usd).toLocaleString()}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Amount USD"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-onyx/20 px-3 py-2 text-sm"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="border border-onyx/20 px-3 py-2 text-sm"
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
          <input
            placeholder="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="border border-onyx/20 px-3 py-2 text-sm md:col-span-3"
          />
          <button
            onClick={() => m.mutate()}
            disabled={!quoteId || !amount || m.isPending}
            className="px-6 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
          >
            {m.isPending ? "Saving…" : "Record"}
          </button>
        </div>
      </section>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
            <tr>
              <th className="p-4">Paid on</th>
              <th className="p-4">Quote</th>
              <th className="p-4">Method</th>
              <th className="p-4">Reference</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {(payments.data ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-onyx/5">
                <td className="p-4">{new Date(p.paid_at).toLocaleDateString()}</td>
                <td className="p-4 font-mono text-xs">{p.quote_id.slice(0, 8)}</td>
                <td className="p-4 capitalize">{p.method.replace("_", " ")}</td>
                <td className="p-4 text-onyx/70">{p.reference ?? "—"}</td>
                <td className="p-4 text-right">${Number(p.amount_usd).toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button onClick={() => del.mutate(p.id)} className="text-onyx/50 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(payments.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-onyx/40 italic font-serif">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
