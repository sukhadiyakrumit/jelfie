import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getMyInquiry, recordPaymentIntent } from "@/lib/account/quotes.functions";

export const Route = createFileRoute("/_authenticated/account/inquiries/$id/pay")({
  component: PayPage,
});

function PayPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getMyInquiry);
  const doRecord = useServerFn(recordPaymentIntent);
  const [method, setMethod] = useState<"bank_transfer" | "whatsapp">("bank_transfer");
  const [reference, setReference] = useState("");

  const q = useQuery({ queryKey: ["inquiry", id], queryFn: () => fetchOne({ data: { id } }) });

  const submit = useMutation({
    mutationFn: () =>
      doRecord({ data: { id, method, reference: reference.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Payment recorded. We'll confirm shortly.");
      qc.invalidateQueries({ queryKey: ["inquiry", id] });
      qc.invalidateQueries({ queryKey: ["account-orders"] });
      navigate({ to: "/account/orders/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;
  const o = q.data as any;
  const amount = Number(o.final_price_usd ?? o.total_usd);

  if (o.status !== "accepted") {
    return (
      <div className="p-10 max-w-2xl">
        <Link to="/account/inquiries/$id" params={{ id }} className="text-[10px] uppercase tracking-widest text-onyx/60 hover:text-gold">
          ← Back
        </Link>
        <div className="mt-4 border border-onyx/10 bg-white p-8">
          <p className="font-serif italic text-xl">
            Payment is only available once you've accepted the quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-2xl">
      <Link to="/account/inquiries/$id" params={{ id }} className="text-[10px] uppercase tracking-widest text-onyx/60 hover:text-gold">
        ← Back to quote
      </Link>
      <h1 className="font-serif text-4xl italic mt-2 mb-2">Complete Payment</h1>
      <p className="text-onyx/60 text-sm mb-8">
        Quotation #{o.id.slice(0, 8).toUpperCase()} · Amount due{" "}
        <span className="font-medium text-onyx">${amount.toLocaleString()} {o.currency}</span>
      </p>

      <div className="border border-onyx/10 bg-white p-6 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-onyx/50 mb-4">Choose a payment method</p>

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
                  You'll receive wire instructions on the next screen. Enter your transfer reference below.
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
                  Our team will contact you to arrange the payment method that suits you best.
                </p>
              </div>
            </div>
          </label>
        </div>

        {method === "bank_transfer" && (
          <label className="block mt-6">
            <span className="text-[10px] uppercase tracking-widest text-onyx/50">Your transfer reference</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. wire receipt number"
              className="w-full border border-onyx/20 px-3 py-2 mt-1"
            />
          </label>
        )}
      </div>

      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
        className="w-full py-4 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold disabled:opacity-50"
      >
        {submit.isPending ? "Submitting…" : `Confirm Payment · $${amount.toLocaleString()}`}
      </button>

      <p className="text-[11px] text-onyx/50 mt-4 text-center">
        Your payment will be marked pending until our team verifies receipt.
      </p>
    </div>
  );
}
