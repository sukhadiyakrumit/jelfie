import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/account/profile")({
  ssr: false,
  head: () => ({
    meta: [{ title: "My Profile — Jelfie Jewellers" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

type Profile = {
  full_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
};

const EMPTY: Profile = {
  full_name: "",
  phone: "",
  country: "",
  city: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/account/sign-in", search: { redirect: "/account/profile" } });
        return;
      }
      setEmail(data.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, country, city, address_line1, address_line2, postal_code")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p) setProfile({ ...EMPTY, ...p });
      setLoading(false);
    })();
  }, [navigate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: u.user.id, ...profile }, { onConflict: "id" });
      if (error) throw error;
      toast.success("Profile saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const set = <K extends keyof Profile>(k: K, v: string) =>
    setProfile((p) => ({ ...p, [k]: v }));

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory text-onyx flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center text-onyx/50">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-onyx flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-medium">Account</span>
        <div className="flex items-end justify-between mt-2 mb-2">
          <h1 className="font-serif text-4xl italic">My Profile</h1>
          <Link to="/account/orders" className="text-[11px] uppercase tracking-widest text-onyx/70 hover:text-gold">
            View orders →
          </Link>
        </div>
        <p className="text-onyx/60 text-sm mb-8">{email}</p>

        <form onSubmit={save} className="space-y-5">
          <Field label="Full name" value={profile.full_name ?? ""} onChange={(v) => set("full_name", v)} />
          <Field label="Phone (with country code)" value={profile.phone ?? ""} onChange={(v) => set("phone", v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Country" value={profile.country ?? ""} onChange={(v) => set("country", v)} />
            <Field label="City" value={profile.city ?? ""} onChange={(v) => set("city", v)} />
          </div>
          <Field label="Address line 1" value={profile.address_line1 ?? ""} onChange={(v) => set("address_line1", v)} />
          <Field label="Address line 2" value={profile.address_line2 ?? ""} onChange={(v) => set("address_line2", v)} />
          <Field label="Postal code" value={profile.postal_code ?? ""} onChange={(v) => set("postal_code", v)} />

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={busy}
              className="px-8 py-4 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="px-8 py-4 border border-onyx/20 text-[11px] uppercase tracking-[0.3em] hover:border-onyx"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-onyx/20 px-4 py-3 bg-white outline-none focus:border-gold"
      />
    </div>
  );
}
