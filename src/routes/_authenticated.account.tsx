import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AccountSidebar } from "@/components/account/account-sidebar";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [{ title: "Client Portal — Jelfie Jewellers" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <div className="min-h-screen bg-ivory text-onyx flex">
      <AccountSidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
