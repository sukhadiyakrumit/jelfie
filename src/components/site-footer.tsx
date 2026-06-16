import { Link } from "@tanstack/react-router";
import { whatsappLink } from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="bg-ivory border-t border-onyx/5 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <p className="text-[10px] uppercase tracking-widest text-onyx/40">
          &copy; {new Date().getFullYear()} Jelfie Jewellers. All rights reserved.
        </p>
        <div className="flex gap-10 text-[10px] uppercase tracking-widest text-onyx/60">
          <Link to="/about" className="hover:text-gold">About</Link>
          <Link to="/contact" className="hover:text-gold">Contact</Link>
          <a
            href={whatsappLink("Hi Jelfie Jewellers, I have a question about your collection.")}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gold"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
