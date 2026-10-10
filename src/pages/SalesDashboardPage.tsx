// =====================================================
// SalesDashboardPage — 個人用営業進捗ダッシュボード
// =====================================================
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { PeriodSwitcher } from '../components/sales/PeriodSwitcher';
import { PersonSelector } from '../components/sales/PersonSelector';
import { AchievementCardRow } from '../components/sales/AchievementCardRow';
import { TargetProgressCard } from '../components/sales/TargetProgressCard';
import { SalesFunnelPanel } from '../components/sales/SalesFunnelPanel';
import { RecentPoliciesPanel } from '../components/sales/RecentPoliciesPanel';
import { TargetEditModal } from '../components/sales/TargetEditModal';
import { getScopeUsers } from '../utils/salesMetrics';
import { toPeriod } from '../utils/salesPeriod';
import type { PeriodType } from '../utils/salesPeriod';

export function SalesDashboardPage() {
  const {
    currentRole,
    currentUserId,
    users,
    teams,
    policies,
    opportunities,
    salesTargets,
    getTarget,
  } = useAppStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showEditModal, setShowEditModal] = useState(false);

  // URL クエリから状態を復元
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const periodType = (searchParams.get('pt') as PeriodType) ?? 'monthly';
  const rawPeriod = searchParams.get('period');
  const selectedPeriod = rawPeriod ?? toPeriod(new Date(), periodType);
  const targetUserId = searchParams.get('user') ?? currentUserId;

  // 権限: general は本人固定
  const scopeUsers = useMemo(
    () => getScopeUsers(currentRole, currentUserId, users, teams),
    [currentRole, currentUserId, users, teams],
  );

  // general が存在しないユーザーを指定してきた場合は本人にフォールバック
  const validUserId = scopeUsers.some(u => u.id === targetUserId)
    ? targetUserId
    : currentUserId;

  const targetUser = users.find(u => u.id === validUserId);

  const setYear = (y: number) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('year', String(y)); return n; });

  const setPeriodType = (pt: PeriodType) =>
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      n.set('pt', pt);
      // period を新しい periodType の当期にリセット
      n.set('period', toPeriod(new Date(), pt));
      return n;
    });

  const setSelectedPeriod = (period: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('period', period); return n; });

  const setTargetUser = (uid: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('user', uid); return n; });

  // ownerIds は対象ユーザー1人分
  const ownerIds = [validUserId];

  const currentTarget = getTarget('individual', validUserId, periodType, selectedPeriod);

  const canEditTarget =
    currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin';

  return (
    <div className="w-full px-4 py-4">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-lg font-bold text-gray-900">🎯 営業進捗</h1>
        {targetUser && (
          <span className="text-sm text-gray-500">{targetUser.name}</span>
        )}
        <div className="flex-1" />
        <PeriodSwitcher
          year={year}
          periodType={periodType}
          onYearChange={setYear}
          onPeriodTypeChange={setPeriodType}
        />
        <PersonSelector
          users={scopeUsers}
          selectedUserId={validUserId}
          onChange={setTargetUser}
        />
      </div>

      {/* 達成カードレーン (最重要 UI) */}
      <div className="mb-4">
        <AchievementCardRow
          policies={policies}
          ownerIds={ownerIds}
          salesTargets={salesTargets}
          targetOwnerId={validUserId}
          targetScope="individual"
          year={year}
          periodType={periodType}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
        />
      </div>

      {/* 詳細パネル群 */}
      <div className="space-y-3">
        <TargetProgressCard
          policies={policies}
          ownerIds={ownerIds}
          target={currentTarget}
          periodType={periodType}
          period={selectedPeriod}
          canEditTarget={canEditTarget}
          onEditTarget={() => setShowEditModal(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SalesFunnelPanel
            opportunities={opportunities}
            ownerIds={ownerIds}
          />
          <RecentPoliciesPanel
            policies={policies}
            ownerIds={ownerIds}
            periodType={periodType}
            period={selectedPeriod}
          />
        </div>
      </div>

      {/* 目標設定モーダル */}
      {showEditModal && (
        <TargetEditModal
          scope="individual"
          ownerId={validUserId}
          ownerName={targetUser?.name ?? ''}
          initialPeriodType={periodType}
          initialPeriod={selectedPeriod}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
