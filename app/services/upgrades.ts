import api from "./api";
import type { Paginated } from "./tickets";

export type UpgradeStatus =
  | "pending_scope"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed";

export interface UpgradeRequest {
  id: string;
  client_id: string;
  ticket_id: string | null;
  description: string;
  complexity_class: string | null;
  estimated_hours: string | null;
  estimated_cost: string | null;
  actual_hours: string;
  status: UpgradeStatus;
  invoice_id: string | null;
  client_approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListUpgradesParams {
  status?: UpgradeStatus;
  page?: number;
  page_size?: number;
}

export interface CreateUpgradePayload {
  description: string;
  ticket_id?: string;
}

export interface ScopeUpgradePayload {
  complexity_class: string;
  estimated_hours: number;
}

export async function getUpgrades(
  params?: ListUpgradesParams
): Promise<Paginated<UpgradeRequest>> {
  const { data } = await api.get<Paginated<UpgradeRequest>>("/upgrades", { params });
  return data;
}

export async function getUpgrade(id: string): Promise<UpgradeRequest> {
  const { data } = await api.get<UpgradeRequest>(`/upgrades/${id}`);
  return data;
}

export async function createUpgrade(
  payload: CreateUpgradePayload
): Promise<UpgradeRequest> {
  const { data } = await api.post<UpgradeRequest>("/upgrades", payload);
  return data;
}

export async function scopeUpgrade(
  id: string,
  payload: ScopeUpgradePayload
): Promise<UpgradeRequest> {
  const { data } = await api.patch<UpgradeRequest>(`/upgrades/${id}/scope`, payload);
  return data;
}

export async function approveUpgrade(id: string): Promise<UpgradeRequest> {
  const { data } = await api.patch<UpgradeRequest>(`/upgrades/${id}/approve`);
  return data;
}

export async function rejectUpgrade(id: string): Promise<UpgradeRequest> {
  const { data } = await api.patch<UpgradeRequest>(`/upgrades/${id}/reject`);
  return data;
}

export async function logHours(
  id: string,
  hours: number
): Promise<UpgradeRequest> {
  const { data } = await api.patch<UpgradeRequest>(`/upgrades/${id}/log-hours`, { hours });
  return data;
}

export async function completeUpgrade(id: string): Promise<UpgradeRequest> {
  const { data } = await api.patch<UpgradeRequest>(`/upgrades/${id}/complete`);
  return data;
}
