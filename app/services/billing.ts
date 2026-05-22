import api from "./api";

// Python Decimal serializes to string in JSON
export type DecimalString = string;

// Matches InvoiceOut schema from backend
export interface Invoice {
  id: string;
  client_id: string;
  kind: "setup" | "monthly" | "annual" | "late_fee" | "upgrade_work" | "overage";
  parent_invoice_id: string | null;
  amount: DecimalString;
  due_date: string; // ISO date string "YYYY-MM-DD"
  status: "pending" | "paid" | "past_due" | "void";
  paid_at: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
}

// Matches BillingStatusOut schema from backend
export interface BillingStatus {
  client_id: string;
  /** current | past_due | deactivation_pending | no_invoices */
  status: "current" | "past_due" | "deactivation_pending" | "no_invoices";
  next_due_date: string | null; // "YYYY-MM-DD"
  days_past_due: number;
  current_invoice: Invoice | null;
  accrued_late_fees: DecimalString;
}

export async function getBillingStatus(clientId: string): Promise<BillingStatus> {
  const { data } = await api.get<BillingStatus>(
    `/clients/${clientId}/billing-status`
  );
  return data;
}

export async function getInvoices(clientId: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>(`/clients/${clientId}/invoices`);
  return data;
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${invoiceId}`);
  return data;
}

export interface MarkPaidPayload {
  payment_reference: string;
  payment_notes?: string;
}

export async function markInvoicePaid(
  invoiceId: string,
  payload: MarkPaidPayload
): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(
    `/invoices/${invoiceId}/mark-paid`,
    payload
  );
  return data;
}

export async function startRecurring(
  clientId: string,
  finalizationDate: string
): Promise<Invoice> {
  const { data } = await api.post<Invoice>(
    `/clients/${clientId}/billing/start-recurring`,
    null,
    { params: { finalization_date: finalizationDate } }
  );
  return data;
}

export async function reactivateClient(
  clientId: string
): Promise<{ id: string; status: string }> {
  const { data } = await api.post<{ id: string; status: string }>(
    `/clients/${clientId}/reactivate`
  );
  return data;
}
