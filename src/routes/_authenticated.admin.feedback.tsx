import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Star } from "lucide-react";
import {
  listContactMessages,
  updateContactMessage,
  listAllReviews,
  updateReview,
  deleteReview,
} from "@/lib/admin/feedback.functions";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const [tab, setTab] = useState<"messages" | "reviews">("messages");
  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-6">Feedback</h1>
      <div className="border-b border-onyx/10 mb-6 flex gap-6">
        {(["messages", "reviews"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-[11px] uppercase tracking-widest ${
              tab === t ? "text-gold border-b-2 border-gold" : "text-onyx/60"
            }`}
          >
            {t === "messages" ? "Contact messages" : "Product reviews"}
          </button>
        ))}
      </div>
      {tab === "messages" ? <Messages /> : <Reviews />}
    </div>
  );
}

function Messages() {
  const fetchList = useServerFn(listContactMessages);
  const doUpdate = useServerFn(updateContactMessage);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-contact-msgs"], queryFn: () => fetchList() });

  const m = useMutation({
    mutationFn: (input: { id: string; status?: string; reply_note?: string | null }) =>
      doUpdate({ data: input as any }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-contact-msgs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      {rows.map((r: any) => (
        <article key={r.id} className="bg-white border border-onyx/10 p-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-serif italic text-lg">{r.subject || "(no subject)"}</div>
              <div className="text-sm text-onyx/60 mt-1">
                {r.name} — <a href={`mailto:${r.email}`} className="text-gold">{r.email}</a> ·{" "}
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <select
              value={r.status}
              onChange={(e) => m.mutate({ id: r.id, status: e.target.value })}
              className="border border-onyx/20 px-2 py-1 text-xs bg-white capitalize"
            >
              <option value="new">new</option>
              <option value="replied">replied</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <p className="text-sm text-onyx/80 mt-3 whitespace-pre-wrap">{r.message}</p>
          <textarea
            defaultValue={r.reply_note ?? ""}
            onBlur={(e) =>
              e.target.value !== (r.reply_note ?? "") && m.mutate({ id: r.id, reply_note: e.target.value })
            }
            rows={2}
            placeholder="Internal reply notes…"
            className="w-full mt-3 border border-onyx/20 px-3 py-2 text-sm"
          />
        </article>
      ))}
      {rows.length === 0 && <p className="text-center text-onyx/40 italic py-12 font-serif">No messages.</p>}
    </div>
  );
}

function Reviews() {
  const fetchList = useServerFn(listAllReviews);
  const doApprove = useServerFn(updateReview);
  const doDelete = useServerFn(deleteReview);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-reviews"], queryFn: () => fetchList() });

  const approve = useMutation({
    mutationFn: (input: { id: string; is_approved: boolean }) => doApprove({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      {rows.map((r: any) => (
        <article key={r.id} className="bg-white border border-onyx/10 p-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-serif italic text-lg">{r.products?.name ?? "Product"}</div>
              <div className="text-sm text-onyx/60 mt-1 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-onyx/20"}`}
                  />
                ))}
                <span className="ml-2">
                  by {r.profiles?.full_name ?? "anonymous"} · {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={r.is_approved}
                  onChange={(e) => approve.mutate({ id: r.id, is_approved: e.target.checked })}
                />
                Approved
              </label>
              <button onClick={() => del.mutate(r.id)} className="text-onyx/50 hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {r.comment && <p className="text-sm text-onyx/80 mt-3 whitespace-pre-wrap">{r.comment}</p>}
        </article>
      ))}
      {rows.length === 0 && <p className="text-center text-onyx/40 italic py-12 font-serif">No reviews.</p>}
    </div>
  );
}
