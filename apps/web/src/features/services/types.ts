export type ServiceStatus = 'active' | 'inactive';

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string;
  currency: string;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
}