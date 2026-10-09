import { api } from '../../lib/api-client';
import type {
  EffectiveSubscription,
  EntitlementsData,
  PlanInfo,
  Subscription,
  UsageCounters,
} from './types';

export const billingApi = {
  plans:        () => api.get<PlanInfo[]>('/billing/plans'),
  subscription: () => api.get<EffectiveSubscription>('/billing/subscription'),
  entitlements: () => api.get<EntitlementsData>('/billing/entitlements'),
  usage:        () => api.get<UsageCounters>('/billing/usage'),
  activateDemo: () => api.post<Subscription>('/billing/demo/activate'),
  cancelDemo:   () => api.post<Subscription>('/billing/demo/cancel'),
};
