import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveProduct } from "@/lib/admin.functions";
import { listAllCategories } from "@/lib/admin/categories.functions";
import type { ProductRow } from "@/lib/products.functions";

const METALS = ["gold", "rose gold", "silver", "platinum"];
const GEMSTONES = ["diamond", "ruby", "emerald", "sapphire", "pearl", "none"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  initial,
  onSaved,
}: {
  initial?: ProductRow;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveProduct);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState(initial?.category ?? "rings");
  const [metal, setMetal] = useState(initial?.metal ?? "gold");
  const [gemstone, setGemstone] = useState(initial?.gemstone ?? "none");
  const [weight, setWeight] = useState(initial?.weight_grams?.toString() ?? "");
  const [price, setPrice] = useState(initial?.price_usd?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [images, setImages] = useState<{ url: string; sort_order: number }[]>(
    initial?.images.map((i) => ({ url: i.url, sort_order: i.sort_order })) ?? [],
  );
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: initial?.id,
          slug: slug || slugify(name),
          name,
          category,
          metal: metal || null,
          gemstone: gemstone || null,
          weight_grams: weight ? Number(weight) : null,
          price_usd: Number(price),
          description: description || null,
          is_featured: isFeatured,
          in_stock: inStock,
          images,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["products"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const newImages = [...images];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw error;
        const { data: signed, error: sErr } = await supabase.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (sErr) throw sErr;
        newImages.push({ url: signed.signedUrl, sort_order: newImages.length });
      }
      setImages(newImages);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-6"
    >
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!initial && !slug) setSlug(slugify(e.target.value));
          }}
          className="input"
        />
      </Field>
      <Field label="Slug (URL)">
        <input
          required
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Metal">
          <select value={metal} onChange={(e) => setMetal(e.target.value)} className="input">
            {METALS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Stone">
          <select value={gemstone} onChange={(e) => setGemstone(e.target.value)} className="input">
            {GEMSTONES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Weight (g)">
          <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="input" />
        </Field>
        <Field label="Price (USD)">
          <input required type="number" step="1" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Images">
        <div className="space-y-3">
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square bg-white outline outline-1 outline-offset-[-1px] outline-black/5">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i).map((im, idx) => ({ ...im, sort_order: idx })))}
                    className="absolute top-1 right-1 w-7 h-7 bg-ivory/90 grid place-items-center hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-3 border border-onyx/20 text-[11px] uppercase tracking-widest cursor-pointer hover:border-gold">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload images"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        </div>
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured on homepage
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          In stock
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-8 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Create product"}
        </button>
      </div>

      <style>{`.input{width:100%;border:1px solid rgba(18,18,18,0.2);padding:0.625rem 0.875rem;background:#fff;outline:none;font-family:inherit;font-size:14px}.input:focus{border-color:#C5A059}`}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-onyx/60 block mb-2">{label}</label>
      {children}
    </div>
  );
}
