import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getMyInquiry,
  acceptQuote,
  rejectQuote,
  recordPaymentIntent,
} from "@/lib/account/quotes.functions";
import { statusBadgeClass, STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/inquiries/$id")({
  component: InquiryDetailPage,
});

function InquiryDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getMyInquiry);
  const doAccept = useServerFn(acceptQuote);
  const doReject = useServerFn(rejectQuote);
  const doPay = useServerFn(recordPaymentIntent);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "whatsapp">("bank_transfer");
  const [reference, setReference] = useState("");

  const q = useQuery({ queryKey: ["inquiry", id], queryFn: () => fetchOne({ data: { id } }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["account-inquiries"] });
    qc.invalidateQueries({ queryKey: ["inquiry", id] });
    qc.invalidateQueries({ queryKey: ["account-orders"] });
  };

  const accept = useMutation({
    mutationFn: () => doAccept({ data: { id } }),
    onSuccess: () => {
      toast.success("Quote accepted. Please complete payment below.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => doReject({ data: { id, reason: reason.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Quote declined");
      invalidate();
      setRejecting(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: () =>
      doPay({ data: { id, method, reference: reference.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Payment recorded. We'll confirm shortly.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;
  const o = q.data as any;
  const canRespond = o.status === "quoted";
  const canPay = o.status === "accepted";
  const paymentSubmitted = ["pending_payment", "paid", "processing", "shipped", "in_transit", "delivered"].includes(o.status);
  const amount = Number(o.final_price_usd ?? o.total_usd);

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
                {accept.isPending ? "Accepting…" : "Accept Quote"}
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

      {canPay && (
        <section className="border-2 border-gold bg-white p-6 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-gold mb-1">Complete payment</p>
          <p className="font-serif text-2xl italic mb-1">
            Amount due ${amount.toLocaleString()}{" "}
            <span className="text-sm text-onyx/60">{o.currency}</span>
          </p>
          <p className="text-onyx/60 text-sm mb-6">
            Choose a payment method to move this order into fulfilment.
          </p>

          <div className="space-y-3">
            <label className={`block border p-4 cursor-pointer ${method === "bank_transfer" ? "border-gold bg-gold/5" : "border-onyx/15"}`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="method"
                  checked={method === "bank_transfer"}
                  onChange={() => setMethod("bank_transfer")}
                />
                <div>
                  <p className="font-medium">Bank Transfer (Wire / SWIFT)</p>
                  <p className="text-xs text-onyx/60">
                    Our team will send wire instructions. Enter your transfer reference below when available.
                  </p>
                </div>
              </div>
            </label>

            <label className={`block border p-4 cursor-pointer ${method === "whatsapp" ? "border-gold bg-gold/5" : "border-onyx/15"}`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="method"
                  checked={method === "whatsapp"}
                  onChange={() => setMethod("whatsapp")}
                />
                <div>
                  <p className="font-medium">Coordinate via WhatsApp</p>
                  <p className="text-xs text-onyx/60">
                    Our team will contact you to arrange payment.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {method === "bank_transfer" && (
            <label className="block mt-4">
              <span className="text-[10px] uppercase tracking-widest text-onyx/50">Transfer reference (optional)</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. wire receipt number"
                className="w-full border border-onyx/20 px-3 py-2 mt-1"
              />
            </label>
          )}

          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending}
            className="mt-6 w-full py-4 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold disabled:opacity-50"
          >
            {pay.isPending ? "Submitting…" : `Confirm Payment · $${amount.toLocaleString()}`}
          </button>
          <p className="text-[11px] text-onyx/50 mt-3 text-center">
            Your payment will be marked pending until our team verifies receipt.
          </p>
        </section>
      )}

      {paymentSubmitted && (
        <div className="border border-green-200 bg-green-50 p-6 text-sm">
          <p className="text-[10px] uppercase tracking-widest text-green-700 mb-1">Payment submitted</p>
          <p className="mb-3">
            Thanks — your order is now in our fulfilment pipeline. Track progress in your Orders.
          </p>
          <Link
            to="/account/orders/$id"
            params={{ id }}
            className="inline-block px-4 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold"
          >
            View Order
          </Link>
        </div>
      )}

      {o.status === "cancelled" && o.rejection_reason && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm mt-4">
          <p className="text-[10px] uppercase tracking-widest text-red-700 mb-1">Your decline reason</p>
          <p>{o.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}
