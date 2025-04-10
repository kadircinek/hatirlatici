export interface Customer {
  id: string;
  name: string;
  company: string;
  address: string | null;
  sector: string | null;
  contactPerson: string | null;
  call_interval: number | null;
  visit_interval: number | null;
  last_call_date: string | null;
  last_visit_date: string | null;
  next_call_date: string | null;
  next_visit_date: string | null;
  notes: string | null;
  products: Product[];
}

export interface Product {
  id: string;
  customer_id: string;
  name: string;
  average_tonnage: number | null;
}

export interface Reminder {
  id: string;
  customer_id: string;
  type: 'call' | 'visit';
  due_date: string;
  status: 'pending' | 'completed';
  created_at: string;
  customer?: Customer;
}

export interface Stats {
  totalCustomers: number;
  totalCalls: number;
  totalVisits: number;
  topProducts: Array<{
    name: string;
    count: number;
  }>;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
} 