import { useEffect, useState } from 'react';
import { useAuth } from '../app/AuthProvider';
import { billingApi } from '../features/billing/api';
import { useEntitlements, isAtLimit } from '../features/billing/useEntitlements';
import { UsageBar } from '../features/billing/components/UsageBar';
import type { EffectiveSubscription, PlanFeature, PlanInfo } from '../features/billing/types';
import { ApiError } from '../lib/api-client';
import '../styles/billing.css';

function fmtDate(iso: string | null, timezone: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone, dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(iso));
}

function daysLeft(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

function FeatureRow({ feature }: { feature: PlanFeature }) {
  return (
    <li className={`billing-feature-row ${feature.included ? 'included' : 'excluded'}`}>
      <span className="billing-feature-icon" aria-hidden="true">
        {feature.included ? '✓' : '✗'}
      </span>
      <span>
        {feature.text}
        {feature.soon && <span className="billing-soon-tag">soon</span>}
      </span>
    </li>
  );
}

export function BillingPage() {
  const { business, plan: authPlan, refreshPlan } = useAuth();
  const tz = business?.timezone ?? 'UTC';

  const ent = useEntitlements();

  const [sub, setSub]             = useState<EffectiveSubscription | null>(null);
  const [plans, setPlans]         = useState<PlanInfo[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError]   = useState('');
  const [acting, setActing]       = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  function loadSub() {
    setSubLoading(true); setSubError('');
    void Promise.all([billingApi.subscription(), billingApi.plans()])
      .then(([s, p]) => { setSub(s); setPlans(p); })
      .catch((cause: unknown) => {
        setSubError(cause instanceof Error ? cause.message : 'Unable to load billing info.');
      })
      .finally(() => setSubLoading(false));
  }

  useEffect(loadSub, []);

  async function handleActivate() {
    setActing(true); setActionMsg(''); setActionErr('');
    try {
      await billingApi.activateDemo();
      setActionMsg('🎉 Pro activated! You now have 30 days of Pro features.');
      loadSub();
      await refreshPlan();
      ent.refresh();
    } catch (cause) {
      setActionErr(cause instanceof ApiError ? cause.message
        : cause instanceof Error ? cause.message : 'Unable to activate.');
    } finally { setActing(false); }
  }

  async function handleCancel() {
    setConfirmCancel(false);
    setActing(true); setActionMsg(''); setActionErr('');
    try {
      await billingApi.cancelDemo();
      setActionMsg('Subscription cancelled. Reverted to Free.');
      loadSub();
      await refreshPlan();
      ent.refresh();
    } catch (cause) {
      setActionErr(cause instanceof ApiError ? cause.message
        : cause instanceof Error ? cause.message : 'Unable to cancel.');
    } finally { setActing(false); }
  }

  const isProActive  = sub?.is_pro_active ?? false;
  const currentPlan  = sub?.effective_plan ?? authPlan ?? 'free';
  const activeSub    = sub?.subscription ?? null;
  const { limits, usage } = ent;

  return (
    <section className="billing-page" aria-labelledby="billing-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1 id="billing-heading">Billing</h1>
          <p className="muted">Manage your subscription plan.</p>
        </div>
      </header>

      {/* Demo banner */}
      <div className="billing-demo-banner" role="note">
        🧪 <strong>DEMO MODE — NO REAL PAYMENTS.</strong>{' '}
        Activate Pro to unlock premium features free for 30 days.
      </div>

      {/* Feedback */}
      {actionMsg && <p className="success billing-feedback" role="status">{actionMsg}</p>}
      {actionErr && <p className="alert billing-feedback" role="alert">{actionErr}</p>}

      {subLoading ? (
        <div className="services-state" role="status">Loading billing information…</div>
      ) : subError ? (
        <div className="alert" role="alert">
          {subError} <button type="button" className="text-button" onClick={loadSub}>Retry</button>
        </div>
      ) : (
        <>
          {/* Current plan card */}
          <div className="billing-status-card">
            <div className="billing-status-left">
              <p className="eyebrow">CURRENT PLAN</p>
              <div className="billing-plan-name-row">
                <span className="billing-plan-name-big">
                  {currentPlan === 'pro' ? 'Pro' : 'Free'}
                </span>
                <span className={`billing-plan-badge ${currentPlan}`}>
                  {currentPlan === 'pro' ? '● Pro' : '● Free'}
                </span>
              </div>
              {activeSub && (
                <div className="billing-dates">
                  <span>Started: <strong>{fmtDate(activeSub.started_at, tz)}</strong></span>
                  {activeSub.expires_at && (
                    <span>
                      {activeSub.status === 'cancelled' ? 'Access until:' : 'Expires:'}
                      {' '}<strong>{fmtDate(activeSub.expires_at, tz)}</strong>
                      {' '}
                      <span className="billing-days-left">{daysLeft(activeSub.expires_at)}</span>
                    </span>
                  )}
                </div>
              )}
              {!activeSub && (
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  No active subscription — you are on the Free plan.
                </p>
              )}
            </div>

            <div className="billing-status-actions">
              {isProActive && !confirmCancel && (
                <button type="button" className="button secondary" disabled={acting}
                  onClick={() => setConfirmCancel(true)}>
                  Cancel subscription
                </button>
              )}
              {isProActive && confirmCancel && (
                <div className="billing-confirm-cancel">
                  <p>Cancel Pro? You'll immediately revert to Free.</p>
                  <div className="billing-confirm-actions">
                    <button type="button" className="button secondary delete-text" disabled={acting}
                      onClick={() => void handleCancel()}>
                      {acting ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button type="button" className="button secondary"
                      onClick={() => setConfirmCancel(false)}>Keep Pro</button>
                  </div>
                </div>
              )}
              {!isProActive && (
                <button type="button" className="button primary" disabled={acting}
                  onClick={() => void handleActivate()}>
                  {acting ? 'Activating…' : '✨ Activate Demo Pro — free for 30 days'}
                </button>
              )}
            </div>
          </div>

          {/* Usage */}
          {!ent.loading && (
            <div className="billing-usage-card">
              <p className="eyebrow" style={{ marginBottom: 14 }}>
                USAGE — {usage.month_label || 'This month'}
              </p>
              <div className="billing-usage-grid">
                <UsageBar
                  label="Services"
                  count={usage.services_count}
                  max={limits.services_max}
                />
                <UsageBar
                  label="Providers"
                  count={usage.providers_count}
                  max={limits.providers_max}
                />
                <UsageBar
                  label="Bookings this month"
                  count={usage.monthly_bookings_count}
                  max={limits.monthly_bookings_max}
                />
              </div>

              {/* Limit warnings */}
              {isAtLimit('services', limits, usage) && (
                <p className="billing-limit-warning" role="alert">
                  ⚠️ Services limit reached ({limits.services_max}). Upgrade to Pro to add more.
                </p>
              )}
              {isAtLimit('providers', limits, usage) && (
                <p className="billing-limit-warning" role="alert">
                  ⚠️ Providers limit reached ({limits.providers_max}). Upgrade to Pro to add more.
                </p>
              )}
              {isAtLimit('monthly_bookings', limits, usage) && (
                <p className="billing-limit-warning" role="alert">
                  ⚠️ Monthly booking limit reached ({limits.monthly_bookings_max}).
                  New public bookings are paused until next month or you upgrade.
                </p>
              )}
            </div>
          )}

          {/* Plan cards */}
          <h2 className="billing-section-title">Plans</h2>
          <div className="billing-plans-grid">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div key={plan.id}
                  className={`billing-plan-card ${plan.id}${isCurrent ? ' current' : ''}`}>
                  {isCurrent && <span className="billing-current-label">Current plan</span>}
                  <div className="billing-plan-card-header">
                    <h3 className="billing-plan-card-name">{plan.name}</h3>
                    <p className="billing-plan-price">{plan.price_display}</p>
                    {plan.demo_note && (
                      <p className="billing-plan-demo-note">{plan.demo_note}</p>
                    )}
                  </div>
                  <ul className="billing-feature-list" aria-label={`${plan.name} plan features`}>
                    {plan.features.map((f) => (
                      <FeatureRow key={f.text} feature={f} />
                    ))}
                  </ul>
                  {plan.id === 'pro' && !isProActive && (
                    <button type="button" className="button primary billing-plan-cta"
                      disabled={acting} onClick={() => void handleActivate()}>
                      {acting ? 'Activating…' : '✨ Activate Demo Pro'}
                    </button>
                  )}
                  {plan.id === 'pro' && isProActive && (
                    <span className="billing-plan-active-tag">✓ Active until {fmtDate(activeSub?.expires_at ?? null, tz)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
