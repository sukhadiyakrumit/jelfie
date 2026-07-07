import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Smartphone, Landmark, Lock } from "lucide-react";
import { getPayableOrder, completeDummyPayment } from "@/lib/account/quotes.functions";

export const Route = createFileRoute("/_authenticated/checkout/pay/$id")({
  component: CheckoutPayPage,
});

type Method = "card" | "upi" | "netbanking";

function CheckoutPayPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getPayableOrder);
  const doPay = useServerFn(completeDummyPayment);
  const [method, setMethod] = useState<Method>("card");

  const q = useQuery({ queryKey: ["payable-order", id], queryFn: () => fetchOrder({ data: { id } }) });

  const pay = useMutation({
    mutationFn: () => doPay({ data: { id } }),
    onSuccess: () => {
      toast.success("Payment successful");
      qc.invalidateQueries({ queryKey: ["account-inquiries"] });
      qc.invalidateQueries({ queryKey: ["account-orders"] });
      qc.invalidateQueries({ queryKey: ["inquiry", id] });
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["account-dashboard"] });
      navigate({ to: "/account/orders/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          {/* Razorpay-style header */}
          <header className="bg-[#0c2451] text-white px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70">Powered by</div>
              <div className="font-semibold text-lg tracking-tight">Razorpay <span className="text-[10px] font-normal opacity-70">(Sandbox)</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest opacity-70">Amount</div>
              <div className="font-semibold text-xl">${amount.toLocaleString()} <span className="text-xs opacity-70">{o.currency}</span></div>
            </div>
          </header>

          <div className="px-6 py-6">
            <p className="text-[10px] uppercase tracking-widest text-onyx/50 mb-1">Merchant</p>
            <p className="font-serif italic text-xl mb-6">Jelfie Jewellers</p>

            <p className="text-[10px] uppercase tracking-widest text-onyx/50 mb-3">Select payment method</p>
            <div className="space-y-2 mb-6">
              <MethodOption
                icon={<CreditCard className="w-4 h-4" />}
                title="Card"
                subtitle="Visa, Mastercard, RuPay, Amex"
                active={method === "card"}
                onClick={() => setMethod("card")}
              />
              <MethodOption
                icon={<Smartphone className="w-4 h-4" />}
                title="UPI"
                subtitle="Google Pay, PhonePe, Paytm"
                active={method === "upi"}
                onClick={() => setMethod("upi")}
              />
              <MethodOption
                icon={<Landmark className="w-4 h-4" />}
                title="Netbanking"
                subtitle="All Indian banks"
                active={method === "netbanking"}
                onClick={() => setMethod("netbanking")}
              />
            </div>

            {method === "card" && (
              <div className="border border-onyx/15 p-4 mb-6 space-y-3 bg-onyx/[0.02]">
                <MockField label="Card number" placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-3">
                  <MockField label="Expiry" placeholder="MM/YY" />
                  <MockField label="CVV" placeholder="123" />
                </div>
                <MockField label="Name on card" placeholder="Cardholder name" />
              </div>
            )}
            {method === "upi" && (
              <div className="border border-onyx/15 p-4 mb-6 bg-onyx/[0.02]">
                <MockField label="UPI ID" placeholder="yourname@upi" />
              </div>
            )}
            {method === "netbanking" && (
              <div className="border border-onyx/15 p-4 mb-6 bg-onyx/[0.02]">
                <MockField label="Bank" placeholder="Select your bank" />
              </div>
            )}

            <button
              onClick={() => pay.mutate()}
              disabled={pay.isPending}
              className="w-full py-4 bg-[#0c2451] text-white text-sm font-medium uppercase tracking-widest hover:bg-[#08183a] disabled:opacity-50"
            >
              {pay.isPending ? "Processing…" : `Pay $${amount.toLocaleString()}`}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-onyx/50">
              <Lock className="w-3 h-3" />
              <span>Secured by Razorpay · This is a sandbox test payment (no real charge)</span>
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

function MethodOption({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 border text-left ${
        active ? "border-[#0c2451] bg-[#0c2451]/5" : "border-onyx/15 hover:border-onyx/40"
      }`}
    >
      <span className={`w-8 h-8 grid place-items-center rounded-full ${active ? "bg-[#0c2451] text-white" : "bg-onyx/10 text-onyx"}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[11px] text-onyx/50">{subtitle}</span>
      </span>
      <span className={`w-4 h-4 rounded-full border-2 ${active ? "border-[#0c2451] bg-[#0c2451]" : "border-onyx/30"}`} />
    </button>
  );
}

function MockField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-onyx/50 mb-1">{label}</span>
      <input
        placeholder={placeholder}
        className="w-full border border-onyx/20 px-3 py-2 text-sm bg-white"
      />
    </label>
  );
}
