// =====================================================
// FunnelChart.tsx — S3プロセス用自作SVGファネルチャート
// 段ごとの横幅=件数, 段間に転換率%表示
// =====================================================
import type { FunnelMetrics } from '../types';
import { formatPercent } from '../lib/format';

// ----------------------------------------
// 型定義
// ----------------------------------------
export interface FunnelChartProps {
  data: FunnelMetrics;
  className?: string;
}

// ----------------------------------------
// 段定義
// ----------------------------------------
interface FunnelStage {
  label: string;
  count: number;
  color: string;
  convLabel?: string;
  convValue?: number | null;
}

function buildStages(data: FunnelMetrics): FunnelStage[] {
  return [
    {
      label: '商談数',
      count: data.meetings,
      color: '#3b82f6',
      convLabel: 'LP率',
      convValue: data.lpRate,
    },
    {
      label: 'LP数',
      count: data.lifeplans,
      color: '#6366f1',
      convLabel: '証券回収率',
      convValue:
        data.meetings > 0
          ? (data.policyCollections / data.meetings) * 100
          : null,
    },
    {
      label: '証券回収',
      count: data.policyCollections,
      color: '#8b5cf6',
      convLabel: '提案率',
      convValue: data.proposalRate,
    },
    {
      label: '提案数',
      count: data.proposals,
      color: '#a855f7',
      convLabel: '契約率',
      convValue: data.contractRate,
    },
    {
      label: '契約世帯',
      count: data.contracts,
      color: '#10b981',
      convLabel: '件数/世帯',
      convValue:
        data.contracts > 0
          ? data.contractCount / data.contracts
          : null,
    },
    {
      label: '契約件数',
      count: data.contractCount,
      color: '#059669',
    },
  ];
}

// ----------------------------------------
// レイアウト定数
// ----------------------------------------
const SVG_WIDTH = 520;
const LABEL_WIDTH = 90;
const BAR_AREA = SVG_WIDTH - LABEL_WIDTH - 40;
const BAR_H = 32;
const CONV_H = 22;
const PADDING_TOP = 8;

// ----------------------------------------
// 各段のY座標を事前計算
// ----------------------------------------
function calcYPositions(stageCount: number): number[] {
  const positions: number[] = [];
  let y = PADDING_TOP;
  for (let i = 0; i < stageCount; i++) {
    positions.push(y);
    y += BAR_H + (i < stageCount - 1 ? CONV_H : 0);
  }
  return positions;
}

// ----------------------------------------
// コンポーネント
// ----------------------------------------
export function FunnelChart({ data, className = '' }: FunnelChartProps) {
  const stages = buildStages(data);
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const yPositions = calcYPositions(stages.length);

  const totalHeight =
    PADDING_TOP +
    stages.reduce((acc, _s, i) => acc + BAR_H + (i < stages.length - 1 ? CONV_H : 0), 0) +
    8;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${totalHeight}`}
        width="100%"
        style={{ maxWidth: SVG_WIDTH }}
        role="img"
        aria-label="プロセスファネルチャート"
      >
        {stages.map((stage, i) => {
          const barWidth = maxCount > 0 ? (stage.count / maxCount) * BAR_AREA : 4;
          const barX = LABEL_WIDTH + (BAR_AREA - Math.max(barWidth, 4)) / 2;
          const barY = yPositions[i];
          const convY = barY + BAR_H;

          const isLow =
            stage.convValue !== null &&
            stage.convValue !== undefined &&
            stage.convValue < 30;

          return (
            <g key={`${stage.label}-${i}`}>
              {/* 左ラベル */}
              <text
                x={LABEL_WIDTH - 6}
                y={barY + BAR_H / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#374151"
                fontFamily="system-ui,sans-serif"
              >
                {stage.label}
              </text>

              {/* バー */}
              <rect
                x={barX}
                y={barY + 2}
                width={Math.max(barWidth, 4)}
                height={BAR_H - 4}
                fill={stage.color}
                rx={3}
                opacity={0.85}
              />

              {/* 件数テキスト */}
              {barWidth > 30 ? (
                <text
                  x={barX + Math.max(barWidth, 4) - 6}
                  y={barY + BAR_H / 2 + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="white"
                  fontWeight="600"
                  fontFamily="system-ui,sans-serif"
                >
                  {stage.count}
                </text>
              ) : (
                <text
                  x={barX + Math.max(barWidth, 4) + 5}
                  y={barY + BAR_H / 2 + 4}
                  textAnchor="start"
                  fontSize={11}
                  fill={stage.color}
                  fontWeight="600"
                  fontFamily="system-ui,sans-serif"
                >
                  {stage.count}
                </text>
              )}

              {/* 転換率行 (最終段以外) */}
              {i < stages.length - 1 && stage.convLabel !== undefined && (
                <g>
                  <line
                    x1={LABEL_WIDTH}
                    y1={convY + CONV_H / 2}
                    x2={SVG_WIDTH - 20}
                    y2={convY + CONV_H / 2}
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                  <text
                    x={SVG_WIDTH / 2}
                    y={convY + CONV_H / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill={isLow ? '#ef4444' : '#9ca3af'}
                    fontWeight={isLow ? '600' : '400'}
                    fontFamily="system-ui,sans-serif"
                  >
                    ↓ {stage.convLabel}:{' '}
                    {stage.convValue !== null && stage.convValue !== undefined
                      ? formatPercent(stage.convValue)
                      : '−'}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
