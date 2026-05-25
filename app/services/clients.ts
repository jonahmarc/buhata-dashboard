import api from "./api";

// Matches the backend `client_status` enum (models.py)
export type ClientStatus = "active" | "deactivated" | "cancelled" | "onboarding";

export type BillingCycle = "monthly" | "annual";

// Matches ClientOut schema from backend
export interface Client {
  id: string;
  user_id: string;
  business_name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  billing_cycle: BillingCycle;
  domain: string | null;
  status: ClientStatus;
  created_at: string;
}

// Matches ClientCreate schema — creates both user account and client record
export interface CreateClientPayload {
  email: string;
  password: string;
  business_name: string;
  tier: number;
  billing_cycle: BillingCycle;
  domain?: string;
}

// Matches UsageOut schema from backend
export interface Usage {
  client_id: string;
  period_year: number;
  period_month: number;
  updates_used: number;
  updates_limit: number | null; // null = unlimited (Tier 5)
  remaining: number | null;     // null = unlimited (Tier 5)
}

export async function getClients(): Promise<Client[]> {
  const { data } = await api.get<Client[]>("/clients");
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
}

export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const { data } = await api.post<Client>("/clients", payload);
  return data;
}

export async function updateClient(
  id: string,
  payload: Partial<Pick<Client, "tier" | "billing_cycle" | "status" | "domain">>
): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${id}`, payload);
  return data;
}

export async function getCurrentUsage(clientId: string): Promise<Usage> {
  const { data } = await api.get<Usage>(`/clients/${clientId}/usage`);
  return data;
}
