import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ToastContainer } from "./components/ui/Toast";
import { LoginPage } from "./pages/LoginPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { SearchPage } from "./pages/SearchPage";
import { ReportAdminPage } from "./pages/ReportAdminPage";
import { HouseholdDetailPage } from "./pages/HouseholdDetailPage";
import { HouseholdBatchEntryPage } from "./pages/HouseholdBatchEntryPage";
import { OpportunitiesPage } from "./pages/OpportunitiesPage";
import { OpportunityDetailPage } from "./pages/OpportunityDetailPage";
import { OpportunityReportPage } from "./pages/OpportunityReportPage";
import { PolicyDetailPage } from "./pages/PolicyDetailPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { AdminPage } from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SalesDashboardPage } from "./pages/SalesDashboardPage";
import { TeamDashboardPage } from "./pages/TeamDashboardPage";
import { DashboardWithPerfPage, SalesPerfRedirect } from "./pages/DashboardWithPerfPage";
import { NippouPage } from "./pages/NippouPage";
import { CustomerListPage } from "./pages/CustomerListPage";
import { useAppStore } from "./store";

/** 認証ガード: 未ログインなら /login へリダイレクト */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAppStore((s) => s.authSession !== null);
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

/** 30 分無操作でセッションを自動失効 */
function SessionWatcher() {
  const touchSession = useAppStore((s) => s.touchSession);
  const logout = useAppStore((s) => s.logout);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    // 操作イベントで expiresAt を伸ばす
    const onActivity = () => {
      if (useAppStore.getState().authSession) touchSession();
    };
    const events: (keyof DocumentEventMap)[] = [
      "click",
      "keydown",
      "mousemove",
      "touchstart",
    ];
    events.forEach((e) =>
      document.addEventListener(e, onActivity, { passive: true }),
    );

    // 30 秒おきに失効チェック
    const interval = window.setInterval(() => {
      const s = useAppStore.getState().authSession;
      if (s && new Date(s.expiresAt).getTime() < Date.now()) {
        logout();
        addToast({
          type: "warning",
          message: "セッションが切れました。再度ログインしてください",
        });
      }
    }, 30_000);

    return () => {
      events.forEach((e) => document.removeEventListener(e, onActivity));
      window.clearInterval(interval);
    };
  }, [touchSession, logout, addToast]);

  return null;
}

function AppLayout() {
  return (
    <AppShell>
      <Routes>
        {/* デフォルト: /dashboard へ */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* IA-1: ダッシュボード＋営業実績タブ統合 */}
        <Route path="/dashboard" element={<DashboardWithPerfPage />} />
        {/* IA-1: /sales-perf → /dashboard?tab=salesperf リダイレクト */}
        <Route path="/sales-perf" element={<SalesPerfRedirect />} />
        {/* IA-2: 日報＋カレンダータブ統合（/nippou） */}
        <Route path="/nippou" element={<NippouPage />} />
        {/* 後方互換: /today → /nippou */}
        <Route path="/today" element={<Navigate to="/nippou" replace />} />
        {/* 後方互換: /calendar → /nippou?tab=calendar */}
        <Route path="/calendar" element={<Navigate to="/nippou?tab=calendar" replace />} />
        <Route path="/reports/:date" element={<ReportDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        {/* IA-3: 顧客一覧（世帯＋契約タブ統合、/customers） */}
        <Route path="/customers" element={<CustomerListPage />} />
        {/* 後方互換: /households → /customers（顧客一覧・世帯タブ） */}
        <Route path="/households" element={<Navigate to="/customers" replace />} />
        {/* 後方互換: /policies → /customers?tab=policies */}
        <Route path="/policies" element={<Navigate to="/customers?tab=policies" replace />} />
        {/* 詳細ページはそのまま維持 */}
        <Route
          path="/households/:customerId"
          element={<HouseholdDetailPage />}
        />
        <Route
          path="/households/:customerId/batch-entry"
          element={<HouseholdBatchEntryPage />}
        />
        <Route
          path="/customers/:customerId"
          element={<HouseholdDetailPage />}
        />
        <Route path="/policies/:id" element={<PolicyDetailPage />} />
        {/* Opportunity routes (Phase 2) */}
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        {/* ADR-B4 v2 要件6: 報告ページ */}
        <Route
          path="/opportunities/:id/report"
          element={<OpportunityReportPage />}
        />
        <Route path="/report-admin" element={<ReportAdminPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        {/* Sales Dashboard routes (Phase 4) - 直接アクセス用に残す */}
        <Route path="/sales-dashboard" element={<SalesDashboardPage />} />
        <Route path="/team-dashboard" element={<TeamDashboardPage />} />
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
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
