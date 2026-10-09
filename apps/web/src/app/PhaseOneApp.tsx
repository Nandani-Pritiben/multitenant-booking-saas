import { Navigate, NavLink, Route, Routes, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { PhaseDashboard } from '../pages/PhaseDashboard';
import { PhaseLandingPage } from '../pages/PhaseLandingPage';
import { PhaseLoginPage } from '../pages/PhaseLoginPage';
import { PhaseOnboardingPage } from '../pages/PhaseOnboardingPage';
import { PhaseSettingsPage } from '../pages/PhaseSettingsPage';
import { PhaseSignupPage } from '../pages/PhaseSignupPage';
import { ServicesPage } from '../pages/ServicesPage';
import { ProvidersPage } from '../pages/ProvidersPage';
import { ProviderDetailPage } from '../pages/ProviderDetailPage';
import { PublicBookingPage } from '../pages/PublicBookingPage';
import { BookingsPage } from '../pages/BookingsPage';
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { CalendarPage } from '../pages/CalendarPage';
import { ClientsPage } from '../pages/ClientsPage';
import { ClientDetailPage } from '../pages/ClientDetailPage';
import { BillingPage } from '../pages/BillingPage';

function Protected({ children, needsBusiness = true }: { children: ReactNode; needsBusiness?: boolean }) {
  const { user, business, loading } = useAuth();
  if (loading) return <div className="state-screen">Loading your workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needsBusiness && !business) return <Navigate to="/onboarding" replace />;
  if (!needsBusiness && business) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout, business, user, plan } = useAuth();
  const navItems: string[] = [];
  const isPro = plan === 'pro';
  return <div className="workspace">
    <aside className="sidebar">
      <Link className="brand" to="/dashboard"><span className="brand-mark">B</span> booking / studio</Link>
      <p className="sidebar-label">WORKSPACE</p>
      <nav className="side-nav">
        <NavLink to="/dashboard" end className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Dashboard</NavLink>
        <NavLink to="/dashboard/services" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Services</NavLink>
        <NavLink to="/dashboard/providers" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Providers</NavLink>
        <NavLink to="/dashboard/bookings" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Bookings</NavLink>
        <NavLink to="/dashboard/clients" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}${!isPro ? ' nav-item-pro-locked' : ''}`}>
          Clients{!isPro && <small>pro</small>}
        </NavLink>
        <NavLink to="/dashboard/calendar" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}${!isPro ? ' nav-item-pro-locked' : ''}`}>
          Calendar{!isPro && <small>pro</small>}
        </NavLink>
        <NavLink to="/dashboard/billing" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Billing</NavLink>
        {navItems.map((item) => <span key={item} className="nav-item disabled">{item}<small>soon</small></span>)}
      </nav>
      <div className="sidebar-bottom"><NavLink to="/dashboard/settings" className={({ isActive }) => `nav-item${isActive ? ' selected' : ''}`}>Settings</NavLink><div className="account-row"><span className="avatar">{(user?.user_metadata?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span><span className="account-copy"><b>{user?.user_metadata?.name || 'Owner'}</b><small>{business?.name}</small></span></div><button className="text-button" onClick={() => void logout()}>Log out</button></div>
    </aside>
    <main className="workspace-main"><header className="workspace-header"><span>{business?.name}</span><span className="header-tag">{isPro ? 'PRO WORKSPACE' : 'FREE WORKSPACE'}</span></header><div className="workspace-content">{children}</div></main>
  </div>;
}

export function PhaseOneApp() {
  return <Routes>
    <Route path="/" element={<PhaseLandingPage />} />
    <Route path="/booking/:businessSlug" element={<PublicBookingPage />} />
    <Route path="/login" element={<PhaseLoginPage />} />
    <Route path="/signup" element={<PhaseSignupPage />} />
    <Route path="/onboarding" element={<Protected needsBusiness={false}><PhaseOnboardingPage /></Protected>} />
    <Route path="/dashboard" element={<Protected><DashboardLayout><PhaseDashboard /></DashboardLayout></Protected>} />
    <Route path="/dashboard/services" element={<Protected><DashboardLayout><ServicesPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/providers" element={<Protected><DashboardLayout><ProvidersPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/providers/:id" element={<Protected><DashboardLayout><ProviderDetailPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/bookings" element={<Protected><DashboardLayout><BookingsPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/bookings/:id" element={<Protected><DashboardLayout><BookingDetailPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/calendar" element={<Protected><DashboardLayout><CalendarPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/clients" element={<Protected><DashboardLayout><ClientsPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/clients/:id" element={<Protected><DashboardLayout><ClientDetailPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/settings" element={<Protected><DashboardLayout><PhaseSettingsPage /></DashboardLayout></Protected>} />
    <Route path="/dashboard/billing" element={<Protected><DashboardLayout><BillingPage /></DashboardLayout></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}