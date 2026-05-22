import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  role: "admin" | "client";
  is_active: boolean;
  created_at: string;
  /** Populated for client-role users; null for admins. Added via backend /auth/me. */
  client_id: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "buhata-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

/** Read auth state without subscribing to the store (safe in non-React contexts). */
export function getStoredAuth() {
  const raw = localStorage.getItem("buhata-auth");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      state: { token?: string; user?: User };
    };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}
