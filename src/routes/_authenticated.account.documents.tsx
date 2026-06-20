import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { getMyDocuments, getDocumentSignedUrl } from "@/lib/account/documents.functions";
import { DOC_TYPES } from "@/lib/account/status";

const DOC_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

export const Route = createFileRoute("/_authenticated/account/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const fetchList = useServerFn(getMyDocuments);
  const fetchSigned = useServerFn(getDocumentSignedUrl);
  const { data, isLoading } = useQuery({ queryKey: ["account-documents"], queryFn: () => fetchList() });

  const download = useMutation({
    mutationFn: (id: string) => fetchSigned({ data: { id } }),
    onSuccess: (res) => { window.open(res.url, "_blank"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Document Vault</h1>
      <p className="text-onyx/60 text-sm mb-8">Invoices, packing lists, bills of lading and certificates from your orders.</p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <FileText className="w-8 h-8 mx-auto text-onyx/30 mb-3" />
          <p className="font-serif text-2xl italic text-onyx/50">No documents yet</p>
          <p className="text-onyx/50 text-sm mt-2">Documents will appear here once your order is processed.</p>
        </div>
      ) : (
        <div className="border border-onyx/10 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-onyx/50 border-b border-onyx/10">
              <tr>
                <th className="p-4">File</th>
                <th className="p-4">Type</th>
                <th className="p-4">Order</th>
                <th className="p-4">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((d: any) => (
                <tr key={d.id} className="border-b border-onyx/5">
                  <td className="p-4 flex items-center gap-2"><FileText className="w-4 h-4 text-gold" /> {d.file_name}</td>
                  <td className="p-4">{DOC_LABEL[d.doc_type] ?? d.doc_type}</td>
                  <td className="p-4">
                    <Link to="/account/orders/$id" params={{ id: d.quote_id }} className="text-gold">
                      #{d.quote_id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="p-4">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => download.mutate(d.id)} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-gold hover:text-onyx">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
