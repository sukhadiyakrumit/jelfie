import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Search = { redirect?: string };

export const Route = createFileRoute("/account/sign-up")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — Jelfie Jewellers" },
      { name: "description", content: "Create a Jelfie Jewellers customer account." },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/account/sign-up" });
  const dest = redirect && redirect.startsWith("/") ? redirect : "/account/profile";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + dest,
          data: { full_name: fullName, phone },
        },
      });
      if (error) throw error;

      // If session is returned (auto-confirm), persist phone to profile.
      if (data.session && data.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName, phone })
          .eq("id", data.user.id);
        toast.success("Welcome to Jelfie");
        navigate({ to: dest });
      } else {
        toast.success("Check your email to confirm your account.");
        navigate({ to: "/account/sign-in", search: { redirect } });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-onyx flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-20">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Account</span>
        <h1 className="font-serif text-4xl italic mt-2 mb-2">Create account</h1>
        <p className="text-onyx/60 text-sm mb-8">
          Save favourites, request quotes, and track orders.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" type="text" value={fullName} onChange={setFullName} required />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Phone (with country code)" type="tel" value={phone} onChange={setPhone} />
          <Field label="Password (min 8 characters)" type="password" value={password} onChange={setPassword} required minLength={8} />
          <button
            type="submit"
            disabled={busy}
            className="w-full px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-xs text-onyx/60 text-center">
          Already have an account?{" "}
          <Link to="/account/sign-in" search={{ redirect }} className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({
  label, type, value, onChange, required, minLength,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-onyx/20 px-4 py-3 bg-white outline-none focus:border-gold"
      />
    </div>
  );
}
