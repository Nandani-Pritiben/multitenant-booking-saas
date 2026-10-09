export type Plan      = 'free' | 'pro';
export type SubStatus = 'active' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: Plan;
  status: SubStatus;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EffectiveSubscription {
  subscription: Subscription | null;
  effective_plan: Plan;
  is_pro_active: boolean;
}

export interface PlanLimits {
  services_max:          number | null;
  providers_max:         number | null;
  monthly_bookings_max:  number | null;
  crm_advanced:          boolean;
  calendar_advanced:     boolean;
  reminders_automated:   boolean;
  analytics_advanced:    boolean;
  team_advanced:         boolean;
  booking_status_emails: boolean;
}

export interface UsageCounters {
  services_count:         number;
  providers_count:        number;
  monthly_bookings_count: number;
  month_label:            string;
}

export interface EntitlementsData {
  plan:   Plan;
  limits: PlanLimits;
  usage:  UsageCounters;
}

export interface PlanFeature {
  text:     string;
  included: boolean;
  soon?:    boolean;
}

export interface PlanInfo {
  id:            Plan;
  name:          string;
  price_display: string;
  features:      PlanFeature[];
  demo_note?:    string;
}
