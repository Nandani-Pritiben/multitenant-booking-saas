import { useCallback, useEffect, useState } from 'react';
import { billingApi } from './api';
import type { EntitlementsData, Plan, PlanLimits, UsageCounters } from './types';

interface EntitlementsState {
  plan:     Plan;
  limits:   PlanLimits;
  usage:    UsageCounters;
  loading:  boolean;
  error:    string;
  refresh:  () => void;
}

const FREE_LIMITS: PlanLimits = {
  services_max:          3,
  providers_max:         2,
  monthly_bookings_max:  50,
  crm_advanced:          false,
  calendar_advanced:     false,
  reminders_automated:   false,
  analytics_advanced:    false,
  team_advanced:         false,
  booking_status_emails: false,
};

const EMPTY_USAGE: UsageCounters = {
  services_count:         0,
  providers_count:        0,
  monthly_bookings_count: 0,
  month_label:            '',
};

export function useEntitlements(): EntitlementsState {
  const [data, setData]     = useState<EntitlementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tick, setTick]     = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void billingApi.entitlements()
      .then((e) => { if (active) setData(e); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load entitlements.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tick]);

  return {
    plan:    data?.plan    ?? 'free',
    limits:  data?.limits  ?? FREE_LIMITS,
    usage:   data?.usage   ?? EMPTY_USAGE,
    loading,
    error,
    refresh,
  };
}

/** Returns true if the tenant is at or over the given resource limit. */
export function isAtLimit(
  resource: 'services' | 'providers' | 'monthly_bookings',
  limits: PlanLimits,
  usage: UsageCounters,
): boolean {
  const max = limits[`${resource}_max`] as number | null;
  if (max === null) return false;
  const count = usage[`${resource}_count`] as number;
  return count >= max;
}

/** Returns a usage label like "2 / 3" or "Unlimited". */
export function usageLabel(
  resource: 'services' | 'providers' | 'monthly_bookings',
  limits: PlanLimits,
  usage: UsageCounters,
): string {
  const max   = limits[`${resource}_max`] as number | null;
  const count = usage[`${resource}_count`] as number;
  if (max === null) return `${count} / Unlimited`;
  return `${count} / ${max}`;
}
