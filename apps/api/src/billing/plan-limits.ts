import type { Plan } from './billing.service.js';

/**
 * Single source of truth for plan limits and feature flags.
 * Never accept these values from the frontend.
 */
export interface PlanLimits {
  services_max:           number | null; // null = unlimited
  providers_max:          number | null;
  monthly_bookings_max:   number | null;
  crm_advanced:           boolean;
  calendar_advanced:      boolean;
  reminders_automated:    boolean;
  analytics_advanced:     boolean;
  team_advanced:          boolean;
  booking_status_emails:  boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    services_max:          3,
    providers_max:         2,
    monthly_bookings_max:  50,
    crm_advanced:          false,
    calendar_advanced:     false,
    reminders_automated:   false,
    analytics_advanced:    false,
    team_advanced:         false,
    booking_status_emails: false,
  },
  pro: {
    services_max:          null,
    providers_max:         null,
    monthly_bookings_max:  null,
    crm_advanced:          true,
    calendar_advanced:     true,
    reminders_automated:   true,   // reserved for Phase 8B
    analytics_advanced:    false,  // not yet implemented — coming soon
    team_advanced:         false,  // not yet implemented — coming soon
    booking_status_emails: true,
  },
};

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}
