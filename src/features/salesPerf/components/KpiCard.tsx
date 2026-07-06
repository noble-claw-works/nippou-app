// =====================================================
// KpiCard.tsx — KPIカード
// 達成=緑 / 未達=赤 / null=灰色(−表示)
// =====================================================
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ----------------------------------------
// 型
// ----------------------------------------
export type KpiCardVariant = 'neutral' | 'positive' | 'negative';

export interface KpiCardProps {
  /** カードタイトル */
  title: string;
  /** メイン値 (フォーマット済み文字列) */
  value: string;
  /** サブ値 (補足情報) */
  subValue?: string;
  /** 達成/未達の判定 (null=中立) */
  variant?: KpiCardVariant;
  /** アイコン */
  icon?: ReactNode;
  /** 前年比などのトレンド (正=上昇, 負=下落, null=不明) */
  trend?: number | null;
  /** ツールチップ/補足説明 */
  description?: string;
}

// ----------------------------------------
// ユーティリティ
// ----------------------------------------
function variantStyles(variant: KpiCardVariant): {
  border: string;
  badge: string;
  value: string;
} {
  switch (variant) {
    case 'positive':
      return {
        border: 'border-l-4 border-l-green-400',
        badge: 'bg-green-100 text-green-700',
        value: 'text-green-700',
      };
    case 'negative':
      return {
        border: 'border-l-4 border-l-red-400',
        badge: 'bg-red-100 text-red-700',
        value: 'text-red-700',
      };
    default:
      return {
        border: 'border-l-4 border-l-gray-200',
        badge: 'bg-gray-100 text-gray-600',
        value: 'text-gray-900',
      };
  }
}

// ----------------------------------------
// KpiCard
// ----------------------------------------
export function KpiCard({
  title,
  value,
  subValue,
  variant = 'neutral',
  icon,
  trend,
  description,
}: KpiCardProps) {
  const styles = variantStyles(variant);

  const TrendIcon =
    trend === null || trend === undefined
      ? Minus
      : trend >= 0
        ? TrendingUp
        : TrendingDown;

  const trendColor =
    trend === null || trend === undefined
      ? 'text-gray-400'
      : trend >= 0
        ? 'text-green-500'
        : 'text-red-500';

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-100 ${styles.border} p-4 flex flex-col gap-2 min-w-0`}
      title={description}
    >
      {/* ヘッダー: タイトル + アイコン */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 font-medium leading-tight truncate">{title}</span>
        {icon && (
          <span className="text-gray-400 flex-shrink-0">{icon}</span>
        )}
      </div>

      {/* メイン値 */}
      <div className={`text-2xl font-bold leading-tight ${styles.value}`}>
        {value}
      </div>

      {/* フッター: サブ値 + トレンド */}
      {(subValue || trend !== undefined) && (
        <div className="flex items-center justify-between gap-2 mt-auto">
          {subValue && (
            <span className="text-xs text-gray-500 truncate">{subValue}</span>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor} flex-shrink-0`}>
              <TrendIcon className="w-3 h-3" />
              {trend === null
                ? '−'
                : `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------
// KpiCardGrid: 5カード横並びラッパー
// ----------------------------------------
export function KpiCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {children}
    </div>
  );
}
