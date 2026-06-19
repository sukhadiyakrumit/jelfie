import { createServerFn } from "@tanstack/react-start";

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
};

export const listPublicCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug, description, image_url")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicCategory[];
  },
);
