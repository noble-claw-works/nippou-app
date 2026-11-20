// =====================================================
// SalesFunnelPanel — Opportunity 8 stage ファネル
// =====================================================
import type { Opportunity } from '../../types';
import { calcFunnel } from '../../utils/salesMetrics';
import type { OpportunityStage } from '../../types';

interface Props {
  opportunities: Opportunity[];
  ownerIds: string[];
}

const STAGE_LABELS: Record<OpportunityStage, string> = {
  approach: '🌱 アプローチ',
  fact_finding: '🔍 ヒアリング',
  needs_analysis: '📊 ニーズ分析',
  proposal: '📄 設計書提示',
  negotiation: '💬 検討中',
  application: '✍️ 申込',
  underwriting: '🏥 査定中',
  issued: '🎉 証券発行',
  lost: '❌ 失注',
};

const FUNNEL_ORDER: OpportunityStage[] = [
  'approach',
  'fact_finding',
  'needs_analysis',
  'proposal',
  'negotiation',
  'application',
  'underwriting',
  'issued',
];

export function SalesFunnelPanel({ opportunities, ownerIds }: Props) {
  const funnel = calcFunnel(opportunities, ownerIds);
  const maxCount = Math.max(...FUNNEL_ORDER.map(s => funnel[s]), 1);
  const total = FUNNEL_ORDER.reduce((s, stage) => s + funnel[stage], 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        📊 商談ファネル
        <span className="ml-2 text-xs font-normal text-gray-400">合計 {total}件</span>
      </h3>

      <div className="space-y-1.5">
        {FUNNEL_ORDER.map(stage => {
          const count = funnel[stage];
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-32 flex-shrink-0">
                {STAGE_LABELS[stage]}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                <div
                  className="h-3 rounded-full bg-blue-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
            </div>
          );
        })}

        {/* 失注は別行 */}
        {funnel.lost > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400 w-32 flex-shrink-0">
              {STAGE_LABELS['lost']}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
              <div
                className="h-2 rounded-full bg-red-300 transition-all"
                style={{
                  width: `${Math.round((funnel.lost / maxCount) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{funnel.lost}</span>
          </div>
        )}
      </div>
    </div>
  );
}
