import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Lock, ShieldCheck } from "lucide-react";
import {
  getPayableOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/lib/account/quotes.functions";

export const Route = createFileRoute("/_authenticated/checkout/pay/$id")({
  component: CheckoutPayPage,
});

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

function CheckoutPayPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getPayableOrder);
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const [processing, setProcessing] = useState(false);

  const q = useQuery({ queryKey: ["payable-order", id], queryFn: () => fetchOrder({ data: { id } }) });

  const verify = useMutation({
    mutationFn: (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => verifyPayment({ data: { id, ...payload } }),
    onSuccess: () => {
      toast.success("Payment successful");
      qc.invalidateQueries({ queryKey: ["account-inquiries"] });
      qc.invalidateQueries({ queryKey: ["account-orders"] });
      qc.invalidateQueries({ queryKey: ["inquiry", id] });
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["account-dashboard"] });
      qc.invalidateQueries({ queryKey: ["payable-order", id] });
      navigate({ to: "/account/orders/$id", params: { id } });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Payment verification failed");
      setProcessing(false);
    },
  });

  const startPayment = useCallback(async () => {
    try {
      setProcessing(true);
      await loadRazorpay();
      const order = await createOrder({ data: { id } });
      if (!window.Razorpay) throw new Error("Razorpay failed to load");

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        name: "Jelfie Jewellers",
        description: `Order ${id.slice(0, 8).toUpperCase()}`,
        theme: { color: "#0c2451" },
        handler: (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          verify.mutate(resp);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast("Payment cancelled");
          },
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        setProcessing(false);
        toast.error(resp?.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (e: any) {
      setProcessing(false);
      toast.error(e?.message || "Could not start payment");
    }
  }, [createOrder, id, verify]);

  if (q.isLoading || !q.data) return <div className="p-10 text-onyx/50">Loading…</div>;
  const o = q.data as any;

  if (o.status !== "accepted" && o.status !== "pending_payment") {
    return (
      <div className="p-10 max-w-2xl">
        <div className="border border-onyx/10 bg-white p-8">
          <p className="font-serif italic text-xl mb-3">This order is not awaiting payment.</p>
          <Link
            to="/account/orders/$id"
            params={{ id }}
            className="inline-block px-5 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-widest hover:bg-gold"
          >
            View order
          </Link>
        </div>
      </div>
    );
  }

  const amount = Number(o.final_price_usd ?? o.total_usd);

  return (
    <div className="min-h-screen bg-ivory">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border border-onyx/10 shadow-sm">
          <header className="bg-[#0c2451] text-white px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70">Secure payment via</div>
              <div className="font-semibold text-lg tracking-tight">Razorpay</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest opacity-70">Amount</div>
              <div className="font-semibold text-xl">
                ${amount.toLocaleString()} <span className="text-xs opacity-70">USD</span>
              </div>
            </div>
          </header>

          <div className="px-6 py-8">
            <p className="text-[10px] uppercase tracking-widest text-onyx/50 mb-1">Merchant</p>
            <p className="font-serif italic text-xl mb-6">Jelfie Jewellers</p>

            <div className="border border-onyx/10 p-4 mb-6 bg-onyx/[0.02] text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-onyx/60">Order</span>
                <span className="font-mono">#{id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-onyx/60">Total</span>
                <span className="font-medium">${amount.toLocaleString()} USD</span>
              </div>
            </div>

            <button
              onClick={startPayment}
              disabled={processing || verify.isPending}
              className="w-full py-4 bg-[#0c2451] text-white text-sm font-medium uppercase tracking-widest hover:bg-[#08183a] disabled:opacity-50"
            >
              {verify.isPending
                ? "Confirming…"
                : processing
                ? "Opening Razorpay…"
                : `Pay $${amount.toLocaleString()} with Razorpay`}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-onyx/50">
              <Lock className="w-3 h-3" />
              <span>Cards, UPI, Netbanking & Wallets · 256-bit encrypted</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-onyx/50">
              <ShieldCheck className="w-3 h-3" />
              <span>Payment is confirmed only after Razorpay success</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            to={o.order_type === "instant" ? "/cart" : "/account/inquiries/$id"}
            params={o.order_type === "instant" ? undefined : ({ id } as any)}
            className="text-[11px] uppercase tracking-widest text-onyx/60 hover:text-gold"
          >
            ← Cancel and go back
          </Link>
        </div>
      </div>
    </div>
  );
}
