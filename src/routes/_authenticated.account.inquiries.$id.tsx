import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getMyInquiry, acceptQuote, rejectQuote } from "@/lib/account/quotes.functions";
import { statusBadgeClass, STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/inquiries/$id")({
  component: InquiryDetailPage,
});

function InquiryDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getMyInquiry);
  const doAccept = useServerFn(acceptQuote);
  const doReject = useServerFn(rejectQuote);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const q = useQuery({ queryKey: ["inquiry", id], queryFn: () => fetchOne({ data: { id } }) });

  const accept = useMutation({
    mutationFn: () => doAccept({ data: { id } }),
    onSuccess: () => {
      toast.success("Quote accepted. Please proceed to payment.");
      qc.invalidateQueries({ queryKey: ["account-inquiries"] });
      qc.invalidateQueries({ queryKey: ["inquiry", id] });
      navigate({ to: "/account/inquiries/$id/pay", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => doReject({ data: { id, reason: reason.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Quote declined");
      qc.invalidateQueries({ queryKey: ["account-inquiries"] });
      qc.invalidateQueries({ queryKey: ["inquiry", id] });
      setRejecting(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;
  const o = q.data as any;
  const canRespond = o.status === "quoted";

  return (
    <div className="px-10 py-10 max-w-3xl">
      <Link to="/account/inquiries" className="text-[10px] uppercase tracking-widest text-onyx/60 hover:text-gold">
        ← Back to inquiries
      </Link>
      <div className="mt-2 mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="font-serif text-4xl italic">Quotation #{o.id.slice(0, 8).toUpperCase()}</h1>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${statusBadgeClass(o.status)}`}>
          {STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>

      <section className="border border-onyx/10 bg-white mb-6">
        <header className="px-6 py-4 border-b border-onyx/10">
          <h2 className="font-serif text-xl italic">Items</h2>
        </header>
        <ul className="divide-y divide-onyx/5">
          {(o.quote_request_items ?? []).map((i: any) => (
            <li key={i.id} className="px-6 py-4 flex items-center gap-4">
              {i.image_url && <img src={i.image_url} alt={i.name} className="w-14 h-14 object-cover" />}
              <div className="flex-1">
                <p className="font-serif italic">{i.name}</p>
                <p className="text-[11px] text-onyx/50">
                  Qty {i.quantity} · ${Number(i.price_usd).toFixed(2)}
                </p>
              </div>
              <p className="text-sm font-medium">${(Number(i.price_usd) * i.quantity).toFixed(2)}</p>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 border-t border-onyx/10 flex justify-between text-sm">
          <span>Cart total</span>
          <span>${Number(o.total_usd).toLocaleString()}</span>
        </div>
      </section>

      {o.final_price_usd != null && (
        <section className="border-2 border-gold bg-white p-6 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-gold mb-1">Final quote from Jelfie</p>
          <p className="font-serif text-4xl italic">
            ${Number(o.final_price_usd).toLocaleString()}{" "}
            <span className="text-base text-onyx/60">{o.currency}</span>
          </p>
          {o.quoted_at && (
            <p className="text-[11px] text-onyx/50 mt-1">
              Sent {new Date(o.quoted_at).toLocaleString()}
            </p>
          )}
          {o.quote_note && (
            <div className="mt-4 border-t border-onyx/10 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-onyx/50 mb-2">Message from our team</p>
              <p className="text-sm whitespace-pre-wrap">{o.quote_note}</p>
            </div>
          )}

          {canRespond && !rejecting && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="px-6 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold disabled:opacity-50"
              >
                {accept.isPending ? "Accepting…" : "Accept & Pay"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                className="px-6 py-3 border border-onyx/30 text-[11px] uppercase tracking-widest hover:border-red-500 hover:text-red-600"
              >
                Decline
              </button>
            </div>
          )}

          {canRespond && rejecting && (
            <div className="mt-6">
              <label className="block mb-3">
                <span className="text-[10px] uppercase tracking-widest text-onyx/50">Reason (optional)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-onyx/20 px-3 py-2 mt-1 text-sm"
                />
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => reject.mutate()}
                  disabled={reject.isPending}
                  className="px-5 py-2 bg-red-600 text-white text-[11px] uppercase tracking-widest hover:bg-red-700 disabled:opacity-50"
                >
                  {reject.isPending ? "Declining…" : "Confirm Decline"}
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="px-5 py-2 border border-onyx/20 text-[11px] uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {o.status === "accepted" && (
        <div className="border border-gold/40 bg-gold/5 p-6 text-sm">
          You accepted this quote. Please{" "}
          <Link to="/account/inquiries/$id/pay" params={{ id }} className="text-gold underline">
            complete payment
          </Link>{" "}
          to move this into fulfilment.
        </div>
      )}
      {o.status === "cancelled" && o.rejection_reason && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm">
          <p className="text-[10px] uppercase tracking-widest text-red-700 mb-1">Your decline reason</p>
          <p>{o.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}
