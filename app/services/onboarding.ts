import api from "./api";
import type { Client } from "./clients";

export interface Asset {
  id: string;
  client_id: string;
  asset_type: string;
  url: string | null;
  filename: string | null;
  uploaded_at: string;
}

export interface AssetCreate {
  asset_type: string;
  url?: string;
  filename?: string;
}

export interface OnboardingState {
  client_id: string;
  client_status: string;
  finalization_completed_at: string | null;
  build_clock_started_at: string | null;
  live_at: string | null;
  build_clock_elapsed_hours: number | null;
  is_finalized: boolean;
  is_build_started: boolean;
  is_live: boolean;
  assets: Asset[];
}

export async function getOnboardingState(
  clientId: string
): Promise<OnboardingState> {
  const { data } = await api.get<OnboardingState>(`/clients/${clientId}/onboarding`);
  return data;
}

export async function finalizeOnboarding(clientId: string): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${clientId}/onboarding/finalize`);
  return data;
}

export async function startBuild(clientId: string): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${clientId}/onboarding/start-build`);
  return data;
}

export async function goLive(clientId: string): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${clientId}/onboarding/go-live`);
  return data;
}

export async function addAsset(
  clientId: string,
  payload: AssetCreate
): Promise<Asset> {
  const { data } = await api.post<Asset>(`/clients/${clientId}/onboarding/assets`, payload);
  return data;
}

export async function listAssets(clientId: string): Promise<Asset[]> {
  const { data } = await api.get<Asset[]>(`/clients/${clientId}/onboarding/assets`);
  return data;
}
