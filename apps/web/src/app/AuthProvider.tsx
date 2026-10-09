import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from '../features/auth/api';
import { businessApi, type Business } from '../features/business/api';
import { billingApi } from '../features/billing/api';
import type { Plan } from '../features/billing/types';

interface AuthState {
  user: AuthUser | null;
  business: Business | null;
  plan: Plan;
  loading: boolean;
  acceptAuth: (user: AuthUser, business?: Business) => Promise<void>;
  refreshBusiness: () => Promise<Business | null>;
  refreshPlan: () => Promise<void>;
  setBusiness: (business: Business) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [plan, setPlan]       = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  async function loadAuth() {
    try {
      const profile = await authApi.me();
      setUser(profile);
      const biz = await businessApi.getMe();
      setBusiness(biz);
      // Load subscription — non-fatal if it fails (defaults to free)
      if (biz) {
        try {
          const sub = await billingApi.subscription();
          setPlan(sub.effective_plan);
        } catch {
          setPlan('free');
        }
      }
    } catch {
      setUser(null); setBusiness(null); setPlan('free');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAuth(); }, []);

  async function acceptAuth(nextUser: AuthUser, nextBusiness?: Business) {
    setUser(nextUser);
    if (nextBusiness) {
      setBusiness(nextBusiness);
    } else {
      await refreshBusiness();
    }
  }

  async function refreshBusiness() {
    const nextBusiness = await businessApi.getMe();
    setBusiness(nextBusiness);
    return nextBusiness;
  }

  async function refreshPlan() {
    try {
      const sub = await billingApi.subscription();
      setPlan(sub.effective_plan);
    } catch {
      setPlan('free');
    }
  }

  async function logout() {
    try { await authApi.logout(); } finally {
      setUser(null); setBusiness(null); setPlan('free');
    }
  }

  return (
    <AuthContext.Provider value={{
      user, business, plan, loading,
      acceptAuth, refreshBusiness, refreshPlan, setBusiness, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
