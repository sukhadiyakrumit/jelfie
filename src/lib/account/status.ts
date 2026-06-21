export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  accepted: "Accepted",
  payment_pending: "Payment Pending",
  pending_payment: "Awaiting Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const TIMELINE_STATUSES = [
  "new",
  "quoted",
  "accepted",
  "paid",
  "processing",
  "shipped",
  "in_transit",
  "delivered",
];

export const DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "coa", label: "Certificate of Analysis" },
  { value: "coo", label: "Certificate of Origin" },
  { value: "other", label: "Other" },
] as const;

export function statusBadgeClass(status: string) {
  if (["delivered", "paid"].includes(status)) return "bg-green-100 text-green-800";
  if (["shipped", "in_transit", "processing"].includes(status)) return "bg-blue-100 text-blue-800";
  if (["cancelled"].includes(status)) return "bg-red-100 text-red-800";
  if (["payment_pending", "quoted", "accepted"].includes(status)) return "bg-amber-100 text-amber-800";
  return "bg-onyx/10 text-onyx/70";
}
