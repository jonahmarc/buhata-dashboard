import { Outlet, redirect } from "react-router";
import { Sidebar } from "~/components/layout/Sidebar";
import { getStoredAuth } from "~/stores/authStore";

export function clientLoader() {
  const auth = getStoredAuth();

  if (!auth?.token || !auth?.user) {
    return redirect("/login");
  }
  if (auth.user.role !== "admin") {
    return redirect("/login");
  }

  return null;
}

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-dark-base overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
