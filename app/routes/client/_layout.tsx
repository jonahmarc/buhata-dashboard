import { Outlet, redirect } from "react-router";
import { ClientSidebar } from "~/components/layout/ClientSidebar";
import { getStoredAuth } from "~/stores/authStore";

export function clientLoader() {
  const auth = getStoredAuth();

  if (!auth?.token || !auth?.user) {
    return redirect("/login");
  }
  if (auth.user.role !== "client") {
    // Admins who land on /client go to their own dashboard
    return redirect("/admin");
  }

  return null;
}

export default function ClientLayout() {
  return (
    <div className="flex h-screen bg-dark-base overflow-hidden">
      <ClientSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
