import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserCircle,
  FileText,
  Package,
  Tag,
  ShoppingBag,
  CreditCard,
  Users,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/profile", label: "Profile", icon: UserCircle },
  { to: "/admin/quotations", label: "Quotations", icon: FileText },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
] as const;

export function AdminSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-60 shrink-0 bg-onyx text-ivory flex flex-col min-h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-ivory/10">
        <Link to="/" className="font-serif text-xl italic block">
          Jelfie
        </Link>
        <span className="text-[10px] uppercase tracking-[0.3em] text-ivory/40">Admin Panel</span>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-6 py-2.5 text-[12px] uppercase tracking-widest transition-colors ${
                active ? "bg-gold/20 text-gold border-l-2 border-gold" : "text-ivory/70 hover:text-gold"
              }`}
            >
              <Icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
        className="flex items-center gap-3 px-6 py-4 border-t border-ivory/10 text-[12px] uppercase tracking-widest text-ivory/70 hover:text-gold"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </aside>
  );
}
