import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Search = { redirect?: string };

export const Route = createFileRoute("/account/sign-in")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Jelfie Jewellers" },
      { name: "description", content: "Sign in to your Jelfie Jewellers account to request quotes and track orders." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/account/sign-in" });
  const dest = redirect && redirect.startsWith("/") ? redirect : "/account/profile";

  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: dest });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + dest,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        navigate({ to: dest });
      }
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Code sent");
    } catch (err) {
      toast.error((err as Error).message + " — SMS provider may need to be enabled in backend settings.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      navigate({ to: dest });
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
        <h1 className="font-serif text-4xl italic mt-2 mb-2">Sign in</h1>
        <p className="text-onyx/60 text-sm mb-8">
          Sign in to request quotes and view your order history.
        </p>

        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          className="w-full mb-6 px-6 py-3 border border-onyx/20 text-[11px] uppercase tracking-[0.3em] hover:border-onyx disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex gap-2 border-b border-onyx/10 mb-6 text-[11px] uppercase tracking-widest">
          <button
            onClick={() => setTab("email")}
            className={`pb-3 px-1 ${tab === "email" ? "text-gold border-b-2 border-gold" : "text-onyx/50"}`}
          >
            Email
          </button>
          <button
            onClick={() => setTab("phone")}
            className={`pb-3 px-1 ${tab === "phone" ? "text-gold border-b-2 border-gold" : "text-onyx/50"}`}
          >
            Phone
          </button>
        </div>

        {tab === "email" ? (
          <form onSubmit={signInEmail} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : !otpSent ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <Field
              label="Phone (with country code, e.g. +1…)"
              type="tel"
              value={phone}
              onChange={setPhone}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <Field label="Verification code" type="text" value={otp} onChange={setOtp} required />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
          </form>
        )}

        <p className="mt-8 text-xs text-onyx/60 text-center">
          New here?{" "}
          <Link
            to="/account/sign-up"
            search={{ redirect }}
            className="text-gold hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-onyx/20 px-4 py-3 bg-white outline-none focus:border-gold"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
