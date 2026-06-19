import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./_shared";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export const listAllCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<CategoryRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug, description, image_url, sort_order, is_active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as CategoryRow[];
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        description: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        sort_order: z.number().int().default(0),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("categories").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: ins, error } = await supabaseAdmin.from("categories").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      return { id: ins.id };
    }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
