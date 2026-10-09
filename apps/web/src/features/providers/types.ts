export type ProviderStatus = 'active' | 'inactive';

export interface Provider {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: ProviderStatus;
  created_at: string;
  updated_at: string;
}

export interface ProviderInput {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface WorkingHour {
  id?: string;
  provider_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}