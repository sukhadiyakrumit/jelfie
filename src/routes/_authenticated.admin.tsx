import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { checkIsAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const fetchCheck = useServerFn(checkIsAdmin);
  const navigate = useNavigate();

  const adminCheck = useQuery({ queryKey: ["admin-check"], queryFn: () => fetchCheck() });

  useEffect(() => {
    if (!adminCheck.data) return;
    if (!adminCheck.data.isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
    }
  }, [adminCheck.data, navigate]);

  if (adminCheck.isLoading || !adminCheck.data?.isAdmin) {
    return (
      <div className="min-h-screen bg-ivory grid place-items-center text-onyx/60 text-sm">
        Checking admin access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-onyx flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

