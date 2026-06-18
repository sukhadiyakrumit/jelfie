import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyQuotes } from "@/lib/quotes.functions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/account/orders")({
  ssr: false,
  head: () => ({
    meta: [{ title: "My Orders — Jelfie Jewellers" }, { name: "robots", content: "noindex" }],
  }),
  component: OrdersPage,
});

type Quote = Awaited<ReturnType<typeof listMyQuotes>>[number];

function OrdersPage() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/account/sign-in", search: { redirect: "/account/orders" } });
        return;
      }
      try {
        const list = await listMyQuotes();
        setQuotes(list);
      } catch {
        setQuotes([]);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory text-onyx flex flex-col">
      <SiteHeader />
      <section className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Account</span>
        <div className="flex items-end justify-between mt-2 mb-8">
          <h1 className="font-serif text-4xl italic">My Quote Requests</h1>
          <Link to="/account/profile" className="text-[11px] uppercase tracking-widest text-onyx/70 hover:text-gold">
            ← Profile
          </Link>
        </div>

        {quotes === null ? (
          <p className="text-onyx/50">Loading…</p>
        ) : quotes.length === 0 ? (
          <div className="text-center py-24 border-t border-onyx/10">
            <p className="font-serif text-2xl italic text-onyx/50 mb-8">
              You haven't requested any quotes yet.
            </p>
            <Link
              to="/shop"
              className="inline-block px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <ul className="space-y-6">
            {quotes.map((q) => (
              <li key={q.id} className="border border-onyx/10 p-6 bg-white/50">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-onyx/50">
                      {new Date(q.created_at).toLocaleDateString(undefined, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                    <p className="font-serif text-xl italic mt-1">
                      Subtotal: {format(Number(q.total_usd))}
                    </p>
                  </div>
                  <a
                    href={q.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2 border border-onyx text-[11px] uppercase tracking-[0.3em] hover:bg-onyx hover:text-ivory"
                  >
                    Reopen in WhatsApp
                  </a>
                </div>
                <ul className="divide-y divide-onyx/10">
                  {(q.quote_request_items ?? []).map((it) => (
                    <li key={it.id} className="py-3 flex items-center gap-4">
                      {it.image_url && (
                        <img src={it.image_url} alt={it.name} className="w-12 h-12 object-cover" />
                      )}
                      <div className="flex-1">
                        <Link
                          to="/product/$slug"
                          params={{ slug: it.slug }}
                          className="font-serif italic hover:text-gold"
                        >
                          {it.name}
                        </Link>
                        <p className="text-[11px] tracking-widest text-onyx/50">
                          Qty {it.quantity} · {format(Number(it.price_usd))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
