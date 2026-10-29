export type SessionStatus = 'active' | 'completed' | 'cancelled';
export type CounterStatus = 'open' | 'closed';

export interface ClubSettings {
  id: string;
  club_name: string;
  currency_symbol: string;
  timezone: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  default_rate_per_minute: number; // in whole PKR
  created_at: string;
  updated_at: string;
}

export interface ClubTable {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  counter_session_id: string;
  start_time: string; // ISO 8601 string
  end_time?: string | null;
  status: SessionStatus;
  applied_rate_per_minute: number;
  billable_minutes?: number | null;
  table_charge?: number | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  price: number; // PKR
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CounterSession {
  id: string;
  opening_cash: number; // PKR
  total_sales_cash: number; // PKR
  expected_cash: number; // opening_cash + total_sales_cash (Expenses never subtracted)
  status: CounterStatus;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SaleItemSnapshot {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

export interface Sale {
  id: string;
  session_id: string;
  counter_session_id: string;
  table_name_snapshot: string;
  start_time_snapshot: string;
  end_time_snapshot: string;
  duration_minutes: number;
  applied_rate_snapshot: number;
  table_charge: number;
  products_subtotal: number;
  total_amount: number;
  idempotency_key?: string | null;
  created_at: string;
  items?: SaleItemSnapshot[];
}

export interface Expense {
  id: string;
  counter_session_id?: string | null;
  title: string;
  amount: number; // PKR
  category: string;
  notes?: string | null;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}
