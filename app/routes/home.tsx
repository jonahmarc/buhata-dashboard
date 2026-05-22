import { redirect } from "react-router";
import { getStoredAuth } from "~/stores/authStore";

export function clientLoader() {
  const auth = getStoredAuth();
  if (!auth?.token || !auth?.user) {
    return redirect("/login");
  }
  return redirect(auth.user.role === "admin" ? "/admin" : "/login");
}

export default function Home() {
  return null;
}
