import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  getMyProfile,
  updateMyProfile,
  listMyContacts,
  upsertContact,
  deleteContact,
} from "@/lib/account/profile.functions";

export const Route = createFileRoute("/_authenticated/account/profile")({
  component: ProfilePage,
});

type Profile = Record<string, any>;
type Address = { line1?: string; line2?: string; city?: string; state?: string; country?: string; postal_code?: string };

const TABS = ["Personal", "Company", "Billing", "Shipping", "Contacts"] as const;

function ProfilePage() {
  const fetchProfile = useServerFn(getMyProfile);
  const doUpdate = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Personal");
  const [form, setForm] = useState<Profile>({});

  const q = useQuery({ queryKey: ["account-profile"], queryFn: () => fetchProfile() });

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: (data: Profile) => doUpdate({ data }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["account-profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setAddr = (key: "billing_address" | "shipping_address", k: keyof Address, v: string) =>
    setForm((p) => ({ ...p, [key]: { ...(p[key] ?? {}), [k]: v } }));

  return (
    <div className="px-10 py-10 max-w-3xl">
      <h1 className="font-serif text-4xl italic mb-2">Profile</h1>
      <p className="text-onyx/60 text-sm mb-6">Company info, addresses and authorized contacts.</p>

      <nav className="flex gap-1 border-b border-onyx/10 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[11px] uppercase tracking-widest ${tab === t ? "border-b-2 border-gold text-gold" : "text-onyx/60 hover:text-onyx"}`}
          >{t}</button>
        ))}
      </nav>

      {tab !== "Contacts" && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
          {tab === "Personal" && (
            <>
              <Field label="Full name" value={form.full_name ?? ""} onChange={(v) => set("full_name", v)} />
              <Field label="Phone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Country" value={form.country ?? ""} onChange={(v) => set("country", v)} />
                <Field label="City" value={form.city ?? ""} onChange={(v) => set("city", v)} />
              </div>
              <Field label="Address line 1" value={form.address_line1 ?? ""} onChange={(v) => set("address_line1", v)} />
              <Field label="Address line 2" value={form.address_line2 ?? ""} onChange={(v) => set("address_line2", v)} />
              <Field label="Postal code" value={form.postal_code ?? ""} onChange={(v) => set("postal_code", v)} />
            </>
          )}
          {tab === "Company" && (
            <>
              <Field label="Company name" value={form.company_name ?? ""} onChange={(v) => set("company_name", v)} />
              <Field label="Company registration #" value={form.company_registration ?? ""} onChange={(v) => set("company_registration", v)} />
              <Field label="Tax ID / VAT" value={form.tax_id ?? ""} onChange={(v) => set("tax_id", v)} />
              <Field label="Website" value={form.website ?? ""} onChange={(v) => set("website", v)} />
            </>
          )}
          {(tab === "Billing" || tab === "Shipping") && (() => {
            const key = tab === "Billing" ? "billing_address" : "shipping_address";
            const addr: Address = form[key] ?? {};
            return (
              <>
                <Field label="Address line 1" value={addr.line1 ?? ""} onChange={(v) => setAddr(key, "line1", v)} />
                <Field label="Address line 2" value={addr.line2 ?? ""} onChange={(v) => setAddr(key, "line2", v)} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" value={addr.city ?? ""} onChange={(v) => setAddr(key, "city", v)} />
                  <Field label="State / Region" value={addr.state ?? ""} onChange={(v) => setAddr(key, "state", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" value={addr.country ?? ""} onChange={(v) => setAddr(key, "country", v)} />
                  <Field label="Postal code" value={addr.postal_code ?? ""} onChange={(v) => setAddr(key, "postal_code", v)} />
                </div>
              </>
            );
          })()}
          <button type="submit" disabled={save.isPending} className="px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {tab === "Contacts" && <ContactsPanel />}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-onyx/20 px-4 py-2.5 bg-white outline-none focus:border-gold" />
    </div>
  );
}

function ContactsPanel() {
  const fetchList = useServerFn(listMyContacts);
  const doUpsert = useServerFn(upsertContact);
  const doDelete = useServerFn(deleteContact);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["account-contacts"], queryFn: () => fetchList() });
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "" });

  const add = useMutation({
    mutationFn: () => doUpsert({ data: form }),
    onSuccess: () => { toast.success("Contact added"); setForm({ name: "", email: "", phone: "", role: "" }); qc.invalidateQueries({ queryKey: ["account-contacts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-contacts"] }),
  });

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-onyx/10 border border-onyx/10 bg-white">
        {(data ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-onyx/40 italic font-serif">No contacts yet</li>
        ) : (
          (data ?? []).map((c: any) => (
            <li key={c.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name} {c.role && <span className="text-[10px] uppercase tracking-widest text-onyx/50 ml-2">{c.role}</span>}</p>
                <p className="text-[11px] text-onyx/60">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={() => del.mutate(c.id)} className="text-onyx/40 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))
        )}
      </ul>

      <div className="border border-onyx/10 bg-white p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-onyx/60">Add contact</p>
        <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        </div>
        <Field label="Role / Title" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} />
        <button
          onClick={() => add.mutate()}
          disabled={!form.name || add.isPending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
