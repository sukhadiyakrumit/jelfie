import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVE_SHIPMENT = ["processing", "shipped", "in_transit"];
const OPEN_INQUIRY = ["new", "contacted", "quoted"];
const PAYMENT_PENDING = ["accepted", "payment_pending", "pending_payment"];

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: orders } = await supabase
      .from("quote_requests")
      .select("id, status, order_type, total_usd, created_at, tracking_number, carrier")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const list = orders ?? [];
    const instant = list.filter((o) => o.order_type === "instant");
    const quotations = list.filter((o) => o.order_type === "quotation");

    const stats = {
      totalOrders: instant.length,
      totalInquiries: quotations.length,
      activeShipments: list.filter((o) => ACTIVE_SHIPMENT.includes(o.status)).length,
      openInquiries: quotations.filter((o) => OPEN_INQUIRY.includes(o.status)).length,
      pendingPayment: list.filter((o) => PAYMENT_PENDING.includes(o.status)).length,
      delivered: list.filter((o) => o.status === "delivered").length,
      recent: list.slice(0, 5),
    };

    const { data: docs } = await supabase
      .from("order_documents")
      .select("id, quote_id, doc_type, file_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return { stats, recentDocuments: docs ?? [] };
  });
