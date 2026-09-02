export type VisitPaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type OrderPaymentStatus = 'PAID' | 'UNPAID' | 'CANCELLED' | 'REFUNDED' | 'SUCCESSED';

export interface InvoiceSummary {
  visit_count: number;
  order_count: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
}

export interface ServiceOrderDetailItem {
  name: string | null;
  quantity: number;
  unit_price: number;
  sub_total: number;
}

export interface InvoiceItemDetail {
  id: string;
  invoice_id: string;
  service_id?: string;
  name: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

export interface InvoiceItem {
  invoice_id: string;
  status: string;
  payment_method?: string | null;
  payment_date?: string | null;
  total_amount: number;
  invoice_details?: InvoiceItemDetail[];
}

export interface TransactionItem {
  id: string;
  amount: number;
  transType?: string;
  status: string;
  transDate: string;
  docNo?: string;
}

export interface BillingOrderItem {
  service_order_id: string;
  name: string;
  type?: string;
  order_status?: string;
  payment_status: string;
  amount: number;
  invoice: InvoiceItem | null;
  latest_transaction: TransactionItem | null;
  invoices?: InvoiceItem[];
  transactions?: TransactionItem[];
  service_order_details?: ServiceOrderDetailItem[];
}

export interface BillingVisit {
  booking_id: string | null;
  visit_session_id: string | null;
  visit_date: string;
  ticket_code: string | null;
  visit_payment_status: VisitPaymentStatus;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  orders: BillingOrderItem[];
}

export interface PatientBillingData {
  patient_id: string;
  summary: InvoiceSummary;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  visits: BillingVisit[];
}

export interface PatientBillingResponse {
  code: number;
  status: string;
  message: string;
  data: PatientBillingData;
}

export interface PatientVisitBillingResponse {
  code: number;
  status: string;
  message: string;
  data: {
    patient_id: string;
    visit: BillingVisit;
  };
}
