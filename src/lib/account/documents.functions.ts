import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: orders } = await supabase
      .from("quote_requests")
      .select("id, created_at")
      .eq("user_id", userId);
    const ids = (orders ?? []).map((o) => o.id);
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("order_documents")
      .select("id, quote_id, doc_type, file_path, file_name, created_at")
      .in("quote_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("order_documents")
      .select("file_path, file_name, quote_id, quote_requests!inner(user_id)")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    if ((doc as any).quote_requests?.user_id !== userId) throw new Error("Forbidden");
    const { data: signed, error } = await supabase.storage
      .from("trade-documents")
      .createSignedUrl(doc.file_path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, fileName: doc.file_name };
  });
