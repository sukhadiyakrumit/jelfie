import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  listAllCategories,
  saveCategory,
  deleteCategory,
  type CategoryRow,
} from "@/lib/admin/categories.functions";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

const empty = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriesPage() {
  const fetchList = useServerFn(listAllCategories);
  const doSave = useServerFn(saveCategory);
  const doDelete = useServerFn(deleteCategory);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-categories"], queryFn: () => fetchList() });

  const [edit, setEdit] = useState<Partial<CategoryRow> | null>(null);

  const save = useMutation({
    mutationFn: (row: any) => doSave({ data: row }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["public-categories"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-4xl italic">Categories</h1>
        <button
          onClick={() => setEdit({ ...empty })}
          className="inline-flex gap-2 items-center px-6 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Sort</th>
              <th className="p-4">Active</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((c) => (
              <tr key={c.id} className="border-b border-onyx/5">
                <td className="p-4 font-serif italic">{c.name}</td>
                <td className="p-4 font-mono text-xs">{c.slug}</td>
                <td className="p-4">{c.sort_order}</td>
                <td className="p-4">{c.is_active ? "✓" : "—"}</td>
                <td className="p-4 text-right">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setEdit(c)}
                      className="text-[11px] uppercase tracking-widest text-onyx/70 hover:text-gold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirm(`Delete "${c.name}"?`) && del.mutate(c.id)}
                      className="text-onyx/50 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-onyx/50 grid place-items-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-white max-w-lg w-full p-6 border border-onyx/10" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif italic text-2xl mb-4">{edit.id ? "Edit" : "New"} category</h2>
            <div className="space-y-3">
              <Field label="Name">
                <input
                  value={edit.name ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, name: e.target.value, slug: edit.slug || slugify(e.target.value) })
                  }
                  className="w-full border border-onyx/20 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={edit.slug ?? ""}
                  onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                  className="w-full border border-onyx/20 px-3 py-2 text-sm font-mono"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={edit.description ?? ""}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  rows={3}
                  className="w-full border border-onyx/20 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Image URL">
                <input
                  value={edit.image_url ?? ""}
                  onChange={(e) => setEdit({ ...edit, image_url: e.target.value })}
                  className="w-full border border-onyx/20 px-3 py-2 text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order">
                  <input
                    type="number"
                    value={edit.sort_order ?? 0}
                    onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
                    className="w-full border border-onyx/20 px-3 py-2 text-sm"
                  />
                </Field>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={edit.is_active ?? true}
                    onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEdit(null)} className="px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => save.mutate(edit)}
                disabled={save.isPending}
                className="px-6 py-2 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
              >
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-onyx/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
