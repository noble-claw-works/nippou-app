// =====================================================
// TeamDashboardPage — マネージャー用チーム進捗ダッシュボード
// =====================================================
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ForbiddenState } from '../components/ui/EmptyState';
import { PeriodSwitcher } from '../components/sales/PeriodSwitcher';
import { AchievementCardRow } from '../components/sales/AchievementCardRow';
import { TeamSummaryCard } from '../components/sales/TeamSummaryCard';
import { MemberRankingTable } from '../components/sales/MemberRankingTable';
import { UnderTargetAlert } from '../components/sales/UnderTargetAlert';
import { SalesFunnelPanel } from '../components/sales/SalesFunnelPanel';
import { TargetEditModal } from '../components/sales/TargetEditModal';
import { toPeriod } from '../utils/salesPeriod';
import type { PeriodType } from '../utils/salesPeriod';

export function TeamDashboardPage() {
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
  const teamIdParam = searchParams.get('team');

  // チーム一覧: manager は自チームのみ / executive・admin は全チーム
  const visibleTeams = useMemo(() => {
    if (currentRole === 'manager') {
      return teams.filter(t => t.managerIds.includes(currentUserId));
    }
    return teams;
  }, [currentRole, currentUserId, teams]);

  // general は閲覧禁止 (フックは全て上記に移動済み)
  if (currentRole === 'general') {
    return (
      <div className="px-4 py-8">
        <ForbiddenState />
      </div>
    );
  }

  const selectedTeamId =
    teamIdParam && visibleTeams.some(t => t.id === teamIdParam)
      ? teamIdParam
      : visibleTeams[0]?.id ?? '';

  const selectedTeam = visibleTeams.find(t => t.id === selectedTeamId);

  const setYear = (y: number) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('year', String(y)); return n; });

  const setPeriodType = (pt: PeriodType) =>
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      n.set('pt', pt);
      n.set('period', toPeriod(new Date(), pt));
      return n;
    });

  const setSelectedPeriod = (period: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('period', period); return n; });

  const setTeam = (teamId: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('team', teamId); return n; });

  if (!selectedTeam) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm text-gray-400">所属チームがありません</p>
      </div>
    );
  }

  // チームのメンバー (general/manager の営業職のみ)
  const teamMembers = users.filter(
    u =>
      selectedTeam.memberIds.includes(u.id) &&
      (u.role === 'general' || u.role === 'manager'),
  );
  const memberIds = teamMembers.map(u => u.id);

  const teamTarget = getTarget('team', selectedTeamId, periodType, selectedPeriod);

  const canEditTarget =
    currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin';

  return (
    <div className="w-full px-4 py-4">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-lg font-bold text-gray-900">📈 チーム進捗</h1>
        <div className="flex-1" />
        <PeriodSwitcher
          year={year}
          periodType={periodType}
          onYearChange={setYear}
          onPeriodTypeChange={setPeriodType}
        />
        {/* チームセレクタ */}
        {visibleTeams.length > 1 && (
          <select
            value={selectedTeamId}
            onChange={e => setTeam(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {visibleTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* チーム集計 達成カードレーン */}
      <div className="mb-4">
        <AchievementCardRow
          policies={policies}
          ownerIds={memberIds}
          salesTargets={salesTargets}
          targetOwnerId={selectedTeamId}
          targetScope="team"
          year={year}
          periodType={periodType}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
        />
      </div>

      {/* チームサマリーカード */}
      <div className="space-y-3">
        <TeamSummaryCard
          team={selectedTeam}
          policies={policies}
          target={teamTarget}
          periodType={periodType}
          period={selectedPeriod}
          canEditTarget={canEditTarget}
          onEditTarget={() => setShowEditModal(true)}
        />

        {/* 未達アラート */}
        <UnderTargetAlert
          members={teamMembers}
          policies={policies}
          salesTargets={salesTargets}
          periodType={periodType}
          period={selectedPeriod}
        />

        {/* メンバーランキング */}
        <MemberRankingTable
          members={teamMembers}
          policies={policies}
          salesTargets={salesTargets}
          periodType={periodType}
          period={selectedPeriod}
        />

        {/* チームファネル */}
        <SalesFunnelPanel
          opportunities={opportunities}
          ownerIds={memberIds}
        />
      </div>

      {/* 目標設定モーダル */}
      {showEditModal && (
        <TargetEditModal
          scope="team"
          ownerId={selectedTeamId}
          ownerName={selectedTeam.name}
          initialPeriodType={periodType}
          initialPeriod={selectedPeriod}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
