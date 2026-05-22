import api from "./api";

export type ClientStatus =
  | "onboarding"
  | "active"
  | "past_due"
  | "deactivated"
  | "cancelled";

export type BillingCycle = "monthly" | "annual";

export interface Client {
  id: string;
  business_name: string;
  domain: string;
  tier: 1 | 2 | 3 | 4 | 5;
  billing_cycle: BillingCycle;
  status: ClientStatus;
  onboarding_started_at: string;
  finalization_completed_at: string | null;
  assets_completed_at: string | null;
  build_clock_started_at: string | null;
  live_at: string | null;
  cancelled_at: string | null;
  custom_build_sla_days: number | null;
  created_at: string;
}

export interface CreateClientPayload {
  email: string;
  password: string;
  business_name: string;
  domain: string;
  tier: number;
  billing_cycle: BillingCycle;
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
  payload: Partial<Pick<Client, "tier" | "billing_cycle" | "status">>
): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${id}`, payload);
  return data;
}
