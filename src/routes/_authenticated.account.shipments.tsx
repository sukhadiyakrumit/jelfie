import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Truck } from "lucide-react";
import { getMyShipments } from "@/lib/account/orders.functions";
import { statusBadgeClass, STATUS_LABEL } from "@/lib/account/status";

export const Route = createFileRoute("/_authenticated/account/shipments")({
  component: ShipmentsPage,
});

function ShipmentsPage() {
  const fetchList = useServerFn(getMyShipments);
  const { data, isLoading } = useQuery({ queryKey: ["account-shipments"], queryFn: () => fetchList() });

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Active Shipments</h1>
      <p className="text-onyx/60 text-sm mb-8">Orders currently being prepared or in transit.</p>

      {isLoading ? (
        <p className="text-onyx/50">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-onyx/10 bg-white p-12 text-center">
          <Truck className="w-8 h-8 mx-auto text-onyx/30 mb-3" />
          <p className="font-serif text-2xl italic text-onyx/50">No active shipments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((o: any) => (
            <Link key={o.id} to="/account/orders/$id" params={{ id: o.id }} className="border border-onyx/10 bg-white p-6 hover:border-gold">
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-serif text-lg italic">#{o.id.slice(0, 8).toUpperCase()}</p>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusBadgeClass(o.status)}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <p className="text-sm">{o.carrier ? `${o.carrier} · ${o.tracking_number ?? "no tracking #"}` : "Tracking pending"}</p>
              {o.estimated_delivery && (
                <p className="text-[11px] text-onyx/50 mt-1">ETA {new Date(o.estimated_delivery).toLocaleDateString()}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
