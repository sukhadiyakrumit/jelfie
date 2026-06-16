import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Jelfie Jewellers" },
      {
        name: "description",
        content: "Reach our atelier directly on WhatsApp for orders, quotes, and private commissions.",
      },
      { property: "og:title", content: "Contact — Jelfie Jewellers" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Reach Us</span>
        <h1 className="font-serif text-5xl md:text-6xl italic mt-3 mb-10 leading-[1.1]">Speak with our atelier.</h1>
        <p className="text-onyx/70 leading-relaxed text-[15px] font-light max-w-xl mx-auto mb-12">
          For orders, quotations, sizing questions, or a private commission, write to us directly on
          WhatsApp. Our team typically responds within a few hours.
        </p>

        <a
          href={whatsappLink("Hi Jelfie Jewellers, I'd like to enquire about your collection.")}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-12 py-5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors"
        >
          Message on WhatsApp
        </a>

        <div className="mt-16 pt-12 border-t border-onyx/10 grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-onyx/40 mb-3">WhatsApp</p>
            <p className="font-serif text-xl">+91 98258 45024</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-onyx/40 mb-3">Atelier hours</p>
            <p className="font-serif text-xl">Mon — Sat · 10:00 – 19:00 IST</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
