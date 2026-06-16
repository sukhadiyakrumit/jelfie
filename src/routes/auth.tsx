import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Admin Sign In — Jelfie Jewellers" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/admin/products" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin/products" },
        });
        if (error) throw error;
        toast.success("Account created. You can now sign in.");
        setMode("sign-in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin/products" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-onyx">
      <SiteHeader />
      <div className="max-w-md mx-auto px-6 py-24">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Admin</span>
        <h1 className="font-serif text-4xl italic mt-2 mb-2">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-onyx/60 text-sm mb-8">
          Owner-only access to manage the catalogue.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-onyx/20 px-4 py-3 bg-white outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-onyx/20 px-4 py-3 bg-white outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors disabled:opacity-50"
          >
            {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-xs text-onyx/60 text-center">
          {mode === "sign-in" ? (
            <>
              Need an account?{" "}
              <button onClick={() => setMode("sign-up")} className="text-gold hover:underline">
                Create one
              </button>
              . The first account becomes the admin.
            </>
          ) : (
            <>
              Have an account?{" "}
              <button onClick={() => setMode("sign-in")} className="text-gold hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
