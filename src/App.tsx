import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { TodayPage } from './pages/TodayPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { SearchPage } from './pages/SearchPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportAdminPage } from './pages/ReportAdminPage';
import { HouseholdsPage } from './pages/HouseholdsPage';
import { HouseholdDetailPage } from './pages/HouseholdDetailPage';
import { HouseholdBatchEntryPage } from './pages/HouseholdBatchEntryPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SalesDashboardPage } from './pages/SalesDashboardPage';
import { TeamDashboardPage } from './pages/TeamDashboardPage';
import { SalesPerfPage } from './features/salesPerf/SalesPerfPage';
import { useAppStore } from './store';

/** /customers/:customerId → /households/:customerId リダイレクト */
function RedirectCustomerToHousehold() {
  const { customerId } = useParams<{ customerId: string }>();
  return <Navigate to={`/households/${customerId}`} replace />;
}

/** 認証ガード: 未ログインなら /login へリダイレクト */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAppStore(s => s.authSession !== null);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** 30 分無操作でセッションを自動失効 */
function SessionWatcher() {
  const touchSession = useAppStore(s => s.touchSession);
  const logout = useAppStore(s => s.logout);
  const addToast = useAppStore(s => s.addToast);

  useEffect(() => {
    // 操作イベントで expiresAt を伸ばす
    const onActivity = () => {
      if (useAppStore.getState().authSession) touchSession();
    };
    const events: (keyof DocumentEventMap)[] = ['click', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(e => document.addEventListener(e, onActivity, { passive: true }));

    // 30 秒おきに失効チェック
    const interval = window.setInterval(() => {
      const s = useAppStore.getState().authSession;
      if (s && new Date(s.expiresAt).getTime() < Date.now()) {
        logout();
        addToast({ type: 'warning', message: 'セッションが切れました。再度ログインしてください' });
      }
    }, 30_000);

    return () => {
      events.forEach(e => document.removeEventListener(e, onActivity));
      window.clearInterval(interval);
    };
  }, [touchSession, logout, addToast]);

  return null;
}

function AppLayout() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/reports/:date" element={<ReportDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/report-admin" element={<ReportAdminPage />} />
        {/* Household routes (Phase 1) */}
        <Route path="/households" element={<HouseholdsPage />} />
        <Route path="/households/:customerId" element={<HouseholdDetailPage />} />
        <Route path="/households/:customerId/batch-entry" element={<HouseholdBatchEntryPage />} />
        {/* Legacy /customers/* → /households/* リダイレクト */}
        <Route path="/customers" element={<Navigate to="/households" replace />} />
        <Route path="/customers/:customerId" element={<RedirectCustomerToHousehold />} />
        {/* Opportunity routes (Phase 2) */}
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        {/* Policy routes (Phase 3) */}
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/policies/:id" element={<PolicyDetailPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        {/* Sales Dashboard routes (Phase 4) */}
        <Route path="/sales-dashboard" element={<SalesDashboardPage />} />
        <Route path="/team-dashboard" element={<TeamDashboardPage />} />
        {/* 営業実績ダッシュボード v1 (P0) */}
        <Route path="/sales-perf" element={<SalesPerfPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<RequireAuth><AppLayout /></RequireAuth>} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
