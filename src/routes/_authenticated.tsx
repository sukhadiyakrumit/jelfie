import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <header className="border-b border-onyx/10 bg-ivory">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif text-2xl italic">
              Jelfie
            </Link>
            <span className="text-[10px] uppercase tracking-[0.3em] text-onyx/40">Admin</span>
          </div>
          <nav className="flex items-center gap-6 text-[11px] uppercase tracking-widest">
            <Link
              to="/admin/products"
              className={
                pathname.startsWith("/admin/products") && !pathname.includes("/new") && !pathname.match(/\/[a-f0-9-]{36}$/)
                  ? "text-gold"
                  : "text-onyx/70 hover:text-gold"
              }
            >
              Products
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="text-onyx/70 hover:text-gold"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
