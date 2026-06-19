import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: AdminProfile,
});

function AdminProfile() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p) {
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: u.user.id, full_name: fullName, phone });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPw("");
    }
  };

  return (
    <div className="px-10 py-10 max-w-2xl">
      <h1 className="font-serif text-4xl italic mb-10">Admin profile</h1>

      <section className="bg-white border border-onyx/10 p-6 mb-8">
        <h2 className="font-serif italic text-xl mb-4">Account</h2>
        <Field label="Email">
          <input value={email} disabled className="w-full bg-ivory border border-onyx/10 px-3 py-2 text-sm" />
        </Field>
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-onyx/20 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-onyx/20 px-3 py-2 text-sm"
          />
        </Field>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-4 px-6 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </section>

      <section className="bg-white border border-onyx/10 p-6">
        <h2 className="font-serif italic text-xl mb-4">Change password</h2>
        <Field label="New password">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full border border-onyx/20 px-3 py-2 text-sm"
          />
        </Field>
        <button
          onClick={changePassword}
          disabled={pwSaving}
          className="mt-4 px-6 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
        >
          {pwSaving ? "Updating…" : "Update password"}
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] uppercase tracking-widest text-onyx/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
