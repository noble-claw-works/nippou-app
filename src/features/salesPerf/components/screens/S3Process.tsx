// =====================================================
// S3Process.tsx — S3プロセス管理(ファネル+ヒート)
// T2-1: funnelMetrics + ownerFunnelHeat 連動
// =====================================================
import { useAppStore } from '../../../../store/index';
import { useShallow } from 'zustand/shallow';
import { useSalesPerfStore } from '../../store';
import { funnelMetrics, ownerFunnelHeat } from '../../lib/salesPerfMetrics';
import { formatPercent } from '../../lib/format';
import { FunnelChart } from '../FunnelChart';
import { HeatTable } from '../HeatTable';

// ----------------------------------------
// KPIタイル (ファネル上部サマリー)
// ----------------------------------------
interface KpiTileProps {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}

function KpiTile({ label, value, sub, highlight = false }: KpiTileProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center rounded-lg border px-4 py-3 min-w-[100px]
        ${highlight
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-700'}
      `}
    >
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
    </div>
  );
}

// ----------------------------------------
// 転換率サマリー行
// ----------------------------------------
interface ConvRowProps {
  label: string;
  value: number | null;
  desc: string;
}

function ConvRow({ label, value, desc }: ConvRowProps) {
  const isLow = value !== null && value < 30;
  const isMid = value !== null && value >= 30 && value < 60;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="ml-2 text-xs text-gray-400">{desc}</span>
      </div>
      <span
        className={`
          text-sm font-bold tabular-nums px-2 py-0.5 rounded
          ${value === null
            ? 'text-gray-400 bg-gray-50'
            : isLow
              ? 'text-red-600 bg-red-50'
              : isMid
                ? 'text-yellow-600 bg-yellow-50'
                : 'text-green-600 bg-green-50'}
        `}
      >
        {value !== null ? formatPercent(value) : '−'}
      </span>
    </div>
  );
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export function S3Process() {
  const currentRole   = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  const { filter, contracts, masters } = useSalesPerfStore(useShallow(s => ({
    filter:    s.filter,
    contracts: s.contracts,
    masters:   s.masters,
  })));

  // ----------------------------------------
  // 集計
  // ----------------------------------------
  const funnel = funnelMetrics(contracts, filter, masters, currentRole, currentUserId);
  const heatRows = ownerFunnelHeat(contracts, filter, masters, currentRole, currentUserId);

  // 1世帯あたり件数
  const avgContractsPerHousehold =
    funnel.contracts > 0
      ? funnel.contractCount / funnel.contracts
      : null;

  // 証券回収率 (商談→証券回収)
  const policyCollectRate =
    funnel.meetings > 0
      ? (funnel.policyCollections / funnel.meetings) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">プロセス管理</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          商談→LP→証券回収→提案→契約 の各段件数と転換率。分母0は「−」
        </p>
      </div>

      {/* KPIタイル行 */}
      <div className="flex flex-wrap gap-3">
        <KpiTile label="商談数"   value={funnel.meetings}          sub="件" />
        <KpiTile label="LP数"     value={funnel.lifeplans}         sub="件" />
        <KpiTile label="証券回収" value={funnel.policyCollections} sub="件" />
        <KpiTile label="提案数"   value={funnel.proposals}         sub="件" />
        <KpiTile label="契約世帯" value={funnel.contracts}         sub="世帯" highlight />
        <KpiTile label="契約件数" value={funnel.contractCount}     sub="件"  highlight />
      </div>

      {/* 2ペインレイアウト: ファネル + 転換率サマリー */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ファネルチャート */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ファネル (件数比例)</h3>
          <FunnelChart data={funnel} />
        </div>

        {/* 転換率サマリー */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">転換率サマリー</h3>
          <div className="flex flex-col">
            <ConvRow
              label="LP率"
              value={funnel.lpRate}
              desc="LP数 ÷ 商談数"
            />
            <ConvRow
              label="証券回収率"
              value={policyCollectRate}
              desc="証券回収 ÷ 商談数"
            />
            <ConvRow
              label="提案率"
              value={funnel.proposalRate}
              desc="提案数 ÷ 商談数"
            />
            <ConvRow
              label="契約率"
              value={funnel.contractRate}
              desc="契約世帯 ÷ 提案数"
            />
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-700">件数/世帯</span>
                <span className="ml-2 text-xs text-gray-400">契約件数 ÷ 契約世帯</span>
              </div>
              <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded text-blue-600 bg-blue-50">
                {avgContractsPerHousehold !== null
                  ? avgContractsPerHousehold.toFixed(2)
                  : '−'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-700">1世帯単価</span>
                <span className="ml-2 text-xs text-gray-400">手数料 ÷ 契約世帯</span>
              </div>
              <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded text-blue-600 bg-blue-50">
                {funnel.avgHouseholdValue !== null
                  ? Math.round(funnel.avgHouseholdValue).toLocaleString('ja-JP') + '円'
                  : '−'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 担当者比較ヒートテーブル */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700">担当者比較 ヒートテーブル</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            赤=低転換率 / 緑=高転換率。同一列内での相対比較。
          </p>
        </div>
        <HeatTable rows={heatRows} />
      </div>

      {/* 注記 */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>
          <span className="text-red-500 font-semibold">赤</span>: 転換率が担当者内で最低水準（25%未満相当）
        </p>
        <p>
          契約世帯: 同一 household_id をユニーク集計 / 契約件数: 確定(fixed)件数の合計
        </p>
        <p>確度シナリオはグローバルフィルタに連動（契約カウントは「確定」のみ）</p>
      </div>
    </div>
  );
}
