// =====================================================
// S1Summary.tsx — S1 サマリー画面
// KPIカード5種 + 月次手数料折線 + 確度別積上げ + ランキング横棒
// =====================================================
import { useMemo, useState } from 'react';
import { BarChart2, TrendingUp, Target, ArrowUpDown, CalendarDays } from 'lucide-react';
import { useSalesPerfStore } from '../store';
import { useAppStore } from '../../../store/index';
import {
  kpiSummary,
  monthlyCommissionVsBudget,
  stackedByConfidence,
  ownerRanking,
} from '../lib/salesPerfMetrics';
import { formatAmount, formatPercent } from '../lib/format';
import { KpiCard, KpiCardGrid } from '../components/KpiCard';
import { LineBudgetActual } from '../components/charts/LineBudgetActual';
import { StackedConfidenceBar } from '../components/charts/StackedConfidenceBar';
import { RankingBar } from '../components/charts/RankingBar';
import type { KpiCardVariant } from '../components/KpiCard';

// ----------------------------------------
// セクションタイトル
// ----------------------------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
      {children}
    </h2>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

// ----------------------------------------
// S1Summary
// ----------------------------------------
export function S1Summary() {
  const { filter, masters, contracts, targets } = useSalesPerfStore();
  const currentRole = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  // 百万円丸めトグル
  const [showMillions, setShowMillions] = useState(true);
  // 月次グラフ: 累計/月次トグル
  const [showCumulative, setShowCumulative] = useState(false);

  // ----------------------------------------
  // 集計
  // ----------------------------------------
  const kpi = useMemo(
    () => kpiSummary(contracts, targets, filter, masters, currentRole, currentUserId),
    [contracts, targets, filter, masters, currentRole, currentUserId],
  );

  const monthlyData = useMemo(
    () => monthlyCommissionVsBudget(contracts, targets, filter, masters, currentRole, currentUserId),
    [contracts, targets, filter, masters, currentRole, currentUserId],
  );

  const stackedData = useMemo(
    () => stackedByConfidence(contracts, filter, masters, currentRole, currentUserId),
    [contracts, filter, masters, currentRole, currentUserId],
  );

  const rankingData = useMemo(
    () => ownerRanking(contracts, targets, filter, masters, currentRole, currentUserId),
    [contracts, targets, filter, masters, currentRole, currentUserId],
  );

  // ----------------------------------------
  // KPI カード 5種
  // ----------------------------------------
  const progressVariant: KpiCardVariant =
    kpi.progressRate === null
      ? 'neutral'
      : kpi.progressRate >= 100
        ? 'positive'
        : 'negative';

  const gapVariant: KpiCardVariant =
    kpi.budgetGap >= 0 ? 'positive' : 'negative';

  const yoyVariant: KpiCardVariant =
    kpi.yoyRate === null
      ? 'neutral'
      : kpi.yoyRate >= 100
        ? 'positive'
        : 'negative';

  // ----------------------------------------
  // 確度別棒グラフの visibleCodes (確度シナリオ対応)
  // ----------------------------------------
  const visibleCodes = useMemo(() => {
    if (filter.confidenceScenario === 'fixed') return ['fixed'];
    if (filter.confidenceScenario === 'fixed_s') return ['fixed', 'S'];
    return ['fixed', 'S', 'A', 'B', 'C', 'D', 'first'];
  }, [filter.confidenceScenario]);

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------------------- */}
      {/* KPI カード */}
      {/* ---------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>
            <BarChart2 className="w-4 h-4 text-blue-600" />
            KPI サマリー
          </SectionTitle>
          {/* 百万円丸めトグル */}
          <button
            onClick={() => setShowMillions(v => !v)}
            className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50 transition-colors"
          >
            {showMillions ? '円表示に切替' : '百万円表示に切替'}
          </button>
        </div>
        <KpiCardGrid>
          {/* 年間予算 */}
          <KpiCard
            title="年間予算"
            value={formatAmount(kpi.annualBudget, showMillions)}
            icon={<Target className="w-4 h-4" />}
            description="当期の年間手数料予算合計"
          />
          {/* 確定手数料 */}
          <KpiCard
            title="確定手数料"
            value={formatAmount(kpi.confirmedCommission, showMillions)}
            icon={<TrendingUp className="w-4 h-4" />}
            variant={progressVariant}
            description={`確度シナリオ内の手数料合計`}
          />
          {/* 進捗率 */}
          <KpiCard
            title="進捗率"
            value={formatPercent(kpi.progressRate)}
            icon={<BarChart2 className="w-4 h-4" />}
            variant={progressVariant}
            subValue="確定累計 ÷ 予算積上げ"
            description="確定手数料 ÷ 年間予算 × 100"
          />
          {/* 目標差額 */}
          <KpiCard
            title="目標差額"
            value={`${kpi.budgetGap >= 0 ? '+' : ''}${formatAmount(kpi.budgetGap, showMillions)}`}
            icon={<ArrowUpDown className="w-4 h-4" />}
            variant={gapVariant}
            subValue={kpi.budgetGap >= 0 ? '予算超過' : '予算未達'}
            description="確定手数料 − 年間予算"
          />
          {/* 前年比 */}
          <KpiCard
            title="前年比"
            value={formatPercent(kpi.yoyRate)}
            icon={<CalendarDays className="w-4 h-4" />}
            variant={yoyVariant}
            trend={kpi.yoyRate !== null ? kpi.yoyRate - 100 : null}
            description="今期確定手数料 ÷ 前期確定手数料 × 100"
          />
        </KpiCardGrid>
      </div>

      {/* ---------------------------------------- */}
      {/* 月次手数料 × 予算折線グラフ */}
      {/* ---------------------------------------- */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
            月次手数料 × 予算
          </SectionTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCumulative(false)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                !showCumulative
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              月次
            </button>
            <button
              onClick={() => setShowCumulative(true)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                showCumulative
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              累計
            </button>
          </div>
        </div>
        <LineBudgetActual
          data={monthlyData}
          showCumulative={showCumulative}
          annualBudget={showCumulative ? kpi.annualBudget : undefined}
          height={280}
        />
      </SectionCard>

      {/* ---------------------------------------- */}
      {/* 下段: 確度別積上げ + ランキング */}
      {/* ---------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 確度別見込み積上げ棒 */}
        <SectionCard>
          <SectionTitle>
            <BarChart2 className="w-4 h-4 text-purple-600" />
            確度別見込み積上げ
          </SectionTitle>
          <StackedConfidenceBar
            data={stackedData}
            visibleCodes={visibleCodes}
            height={260}
          />
        </SectionCard>

        {/* 担当者進捗ランキング */}
        <SectionCard>
          <SectionTitle>
            <ArrowUpDown className="w-4 h-4 text-green-600" />
            担当者別進捗ランキング
          </SectionTitle>
          {rankingData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              対象データなし
            </div>
          ) : (
            <RankingBar data={rankingData} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
