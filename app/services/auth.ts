import api from "./api";
import type { User } from "~/stores/authStore";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getMe(token?: string): Promise<User> {
  const { data } = await api.get<User>("/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout").catch(() => {});
}
