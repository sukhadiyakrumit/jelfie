import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, User } from "lucide-react";
import { useCart, useWishlist } from "@/lib/cart";
import { CURRENCIES, useCurrency } from "@/lib/currency";
import { useAuthUser } from "@/lib/auth";

export function SiteHeader() {
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const { currency, setCurrency } = useCurrency();
  const { isAuthenticated } = useAuthUser();

  return (
    <header className="sticky top-0 z-50 bg-ivory/90 backdrop-blur-md border-b border-onyx/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-medium uppercase tracking-[0.2em] text-onyx/70">
          <Link to="/shop" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
            Shop
          </Link>
          <Link to="/about" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
            About
          </Link>
          <Link to="/contact" className="hover:text-gold transition-colors" activeProps={{ className: "text-gold" }}>
            Contact
          </Link>
        </nav>

        <div className="absolute left-1/2 -translate-x-1/2">
          <Link to="/" className="font-serif text-3xl tracking-tight font-semibold italic text-onyx">
            Jelfie
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
              aria-label="Currency"
              className="bg-transparent text-[11px] font-medium uppercase tracking-widest outline-none cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to={isAuthenticated ? "/account/profile" : "/account/sign-in"}
              aria-label="Account"
              className="text-onyx hover:text-gold transition-colors"
            >
              <User className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="relative text-onyx hover:text-gold transition-colors">
              <Heart className="w-5 h-5" strokeWidth={1.5} />
              {wishCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold text-onyx rounded-full text-[9px] font-medium flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative text-onyx hover:text-gold transition-colors">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold text-onyx rounded-full text-[9px] font-medium flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
