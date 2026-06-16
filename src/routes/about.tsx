import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Atelier — Jelfie Jewellers" },
      {
        name: "description",
        content: "Jelfie Jewellers — handcrafted fine jewellery, ethically sourced, made to be passed down.",
      },
      { property: "og:title", content: "Our Atelier — Jelfie Jewellers" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-24">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Our Atelier</span>
        <h1 className="font-serif text-5xl md:text-6xl italic mt-3 mb-12 leading-[1.1]">
          A century of quiet craftsmanship.
        </h1>
        <div className="prose prose-onyx max-w-none space-y-6 text-onyx/75 leading-relaxed text-[15px] font-light">
          <p>
            Jelfie Jewellers has been hand-finishing fine jewellery since 1924 — four generations
            of artisans working from the same workshop, with the same patience, and the same
            uncompromising standards.
          </p>
          <p>
            Every piece is made to order, signed, and intended to be inherited. We work only with
            ethically sourced stones and recycled precious metals, and we ship internationally to
            collectors who value craftsmanship over fashion.
          </p>
          <p>
            We do not run sales, we do not chase trends, and we do not list every piece online. If
            there is something you imagine but cannot find, please write to us — most of our finest
            work begins as a private commission.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
