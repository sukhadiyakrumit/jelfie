import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAllUsers, setUserAdmin } from "@/lib/admin/users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const fetchList = useServerFn(listAllUsers);
  const doRole = useServerFn(setUserAdmin);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchList() });

  const m = useMutation({
    mutationFn: (input: { user_id: string; grant: boolean }) => doRole({ data: input }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="px-10 py-10">
      <h1 className="font-serif text-4xl italic mb-2">Users</h1>
      <p className="text-onyx/60 text-sm mb-8">{rows.length} registered accounts</p>

      <div className="border border-onyx/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-onyx/10 text-left text-[10px] uppercase tracking-widest text-onyx/50">
            <tr>
              <th className="p-4">Email</th>
              <th className="p-4">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Joined</th>
              <th className="p-4 text-right">Quotes</th>
              <th className="p-4">Role</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-b border-onyx/5">
                  <td className="p-4">{u.email ?? "—"}</td>
                  <td className="p-4">{u.profile?.full_name ?? "—"}</td>
                  <td className="p-4">{u.profile?.phone ?? u.phone ?? "—"}</td>
                  <td className="p-4">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-right">
                    {u.quoteCount} <span className="text-onyx/50 text-xs">/ ${u.quoteTotal.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    {isAdmin ? (
                      <span className="text-[10px] uppercase tracking-widest text-gold">Admin</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-onyx/40">Customer</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => m.mutate({ user_id: u.id, grant: !isAdmin })}
                      className="text-[11px] uppercase tracking-widest text-onyx/70 hover:text-gold"
                    >
                      {isAdmin ? "Revoke" : "Make admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-onyx/40 italic font-serif">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
