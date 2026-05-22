import api from "./api";

export type TicketType =
  | "content_update"
  | "upgrade_request"
  | "support"
  | "billing";

export type TicketStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed";

// Matches TicketOut schema from backend
export interface Ticket {
  id: string;
  client_id: string;
  type: TicketType;
  status: TicketStatus;
  subject: string;
  description: string;
  sla_acknowledged_at: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Matches Paginated[T] schema from backend
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ListTicketsParams {
  page?: number;
  page_size?: number;
  status?: TicketStatus;
  type?: TicketType;
  client_id?: string; // admin only
}

export async function getTickets(
  params?: ListTicketsParams
): Promise<Paginated<Ticket>> {
  const { data } = await api.get<Paginated<Ticket>>("/tickets", { params });
  return data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await api.get<Ticket>(`/tickets/${id}`);
  return data;
}

export interface CreateTicketPayload {
  type: TicketType;
  subject: string;
  description: string;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const { data } = await api.post<Ticket>("/tickets", payload);
  return data;
}

export async function acknowledgeTicket(id: string): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/acknowledge`);
  return data;
}

export async function startTicket(id: string): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/start`);
  return data;
}

export async function resolveTicket(id: string): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/resolve`);
  return data;
}

export async function closeTicket(id: string): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/close`);
  return data;
}
