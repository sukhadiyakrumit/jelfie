import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listProductReviews, submitProductReview } from "@/lib/feedback.functions";

export function ProductReviews({ productId }: { productId: string }) {
  const fetchList = useServerFn(listProductReviews);
  const submit = useServerFn(submitProductReview);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const q = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () => fetchList({ data: { product_id: productId } }),
  });

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const m = useMutation({
    mutationFn: () => submit({ data: { product_id: productId, rating, comment: comment || null } }),
    onSuccess: () => {
      toast.success("Review submitted — pending approval");
      setComment("");
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = q.data ?? [];
  const avg = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <section className="border-t border-onyx/10 pt-12 mt-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-serif italic text-3xl">Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-onyx/60">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(avg) ? "fill-gold text-gold" : "text-onyx/20"}`}
                  />
                ))}
              </div>
              <span>
                {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-10">
        {reviews.map((r: any) => (
          <article key={r.id} className="bg-white border border-onyx/10 p-5">
            <header className="flex items-center justify-between mb-2">
              <div className="font-serif italic">{r.profiles?.full_name ?? "Anonymous"}</div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-onyx/20"}`}
                  />
                ))}
              </div>
            </header>
            {r.comment && <p className="text-sm text-onyx/80 leading-relaxed">{r.comment}</p>}
          </article>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-onyx/40 italic font-serif">No reviews yet. Be the first.</p>
        )}
      </div>

      <div className="bg-white border border-onyx/10 p-6">
        <h3 className="font-serif italic text-xl mb-4">Write a review</h3>
        {!userId ? (
          <button
            onClick={() => navigate({ to: "/account/sign-in" })}
            className="px-6 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold"
          >
            Sign in to review
          </button>
        ) : (
          <>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={`w-6 h-6 ${n <= rating ? "fill-gold text-gold" : "text-onyx/20"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Share your thoughts…"
              className="w-full border border-onyx/20 px-3 py-2 text-sm mb-3"
            />
            <button
              onClick={() => m.mutate()}
              disabled={m.isPending}
              className="px-6 py-2.5 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold disabled:opacity-50"
            >
              {m.isPending ? "Submitting…" : "Submit review"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
