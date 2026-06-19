import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { whatsappLink } from "@/lib/whatsapp";
import { submitContactMessage } from "@/lib/feedback.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Jelfie Jewellers" },
      {
        name: "description",
        content: "Reach our atelier directly on WhatsApp or via the contact form for orders, quotes, and private commissions.",
      },
      { property: "og:title", content: "Contact — Jelfie Jewellers" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const m = useMutation({
    mutationFn: () => submit({ data: { name, email, subject: subject || null, message } }),
    onSuccess: () => {
      toast.success("Message sent. We'll be in touch soon.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Reach Us</span>
        <h1 className="font-serif text-5xl md:text-6xl italic mt-3 mb-8 leading-[1.1]">Speak with our atelier.</h1>
        <p className="text-onyx/70 leading-relaxed text-[15px] font-light max-w-xl mx-auto mb-10">
          For orders, quotations, sizing questions, or a private commission — write to us below, or
          message us directly on WhatsApp.
        </p>

        <a
          href={whatsappLink("Hi Jelfie Jewellers, I'd like to enquire about your collection.")}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-10 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors"
        >
          Message on WhatsApp
        </a>
      </section>

      <section className="max-w-2xl mx-auto px-6 pb-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !email || !message) return toast.error("Please fill in the required fields");
            m.mutate();
          }}
          className="bg-white border border-onyx/10 p-8 space-y-4 text-left"
        >
          <h2 className="font-serif italic text-2xl mb-2">Send a message</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full border border-onyx/20 px-3 py-2 text-sm bg-white"
                required
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="w-full border border-onyx/20 px-3 py-2 text-sm bg-white"
                required
              />
            </Field>
          </div>
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="w-full border border-onyx/20 px-3 py-2 text-sm bg-white"
            />
          </Field>
          <Field label="Message *">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              className="w-full border border-onyx/20 px-3 py-2 text-sm bg-white"
              required
            />
          </Field>
          <button
            type="submit"
            disabled={m.isPending}
            className="px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
          >
            {m.isPending ? "Sending…" : "Send message"}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-onyx/10 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-onyx/40 mb-2">WhatsApp</p>
            <p className="font-serif text-xl">+91 98258 45024</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-onyx/40 mb-2">Atelier hours</p>
            <p className="font-serif text-xl">Mon — Sat · 10:00 – 19:00 IST</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-onyx/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
