// =====================================================
// GlobalFilterBar.tsx — 全画面共通グローバルフィルタ
// T1-1: 全フィルタ項目 + 件数常時表示 + ロール出し分け
// =====================================================
import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { useSalesPerfStore } from '../store';
import { useAppStore } from '../../../store/index';
import { applyFilter } from '../lib/salesPerfMetrics';
import { getScopeUserIds } from '../lib/salePerfScope';
import {
  DEFAULT_FISCAL_YEAR,
  CONFIDENCE_AGG_LABELS,
  FISCAL_MONTH_LABELS,
} from '../constants';
import type { LineFilter, ConfidenceAgg } from '../types';

// ----------------------------------------
// 選択肢定義
// ----------------------------------------
const LINE_OPTIONS: { value: LineFilter; label: string }[] = [
  { value: 'both',    label: '両方' },
  { value: 'life',    label: '生保' },
  { value: 'nonlife', label: '損保' },
];

const FISCAL_YEAR_OPTIONS = [DEFAULT_FISCAL_YEAR - 1, DEFAULT_FISCAL_YEAR, DEFAULT_FISCAL_YEAR + 1];

const PERIOD_OPTIONS = [
  { value: 'full'   as const, label: '通期' },
  { value: 'h1'     as const, label: '上期' },
  { value: 'h2'     as const, label: '下期' },
  { value: 'single' as const, label: '単月' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceAgg; label: string }[] = [
  { value: 'fixed',     label: CONFIDENCE_AGG_LABELS.fixed },
  { value: 'fixed_s',   label: CONFIDENCE_AGG_LABELS.fixed_s },
  { value: 'fixed_s_a', label: CONFIDENCE_AGG_LABELS.fixed_s_a },
];

// ----------------------------------------
// ユーティリティ
// ----------------------------------------
function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] text-gray-400 leading-none">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[80px]"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ----------------------------------------
// GlobalFilterBar
// ----------------------------------------
export function GlobalFilterBar() {
  const { filter, setFilter, masters, contracts } = useSalesPerfStore();
  const currentRole = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);

  // 件数計算 (AND条件フィルタ後の件数)
  const filteredCount = useMemo(() => {
    const scopeIds = getScopeUserIds(currentRole, currentUserId, filter, masters);
    return applyFilter(contracts, filter, scopeIds).length;
  }, [contracts, filter, masters, currentRole, currentUserId]);

  // フィルタ項目の変更ハンドラ
  const handleLine = (v: string) => setFilter({ line: v as LineFilter });
  const handleFY = (v: string) => setFilter({ fiscalYear: parseInt(v, 10) });
  const handlePeriod = (v: string) => {
    const mode = v as 'full' | 'h1' | 'h2' | 'single';
    if (mode !== 'single') {
      setFilter({ periodMode: mode, singleMonth: undefined });
    } else {
      setFilter({ periodMode: mode, singleMonth: filter.singleMonth ?? 1 });
    }
  };
  const handleSingleMonth = (v: string) => setFilter({ singleMonth: parseInt(v, 10) });
  const handleOwner = (v: string) => setFilter({ ownerId: v || undefined });
  const handleGroup = (v: string) => setFilter({ groupId: v || undefined, ownerId: undefined });
  const handleConfidence = (v: string) => setFilter({ confidenceScenario: v as ConfidenceAgg });
  const handleInsurer = (v: string) => setFilter({ insurer: v || undefined });
  const handleProductType = (v: string) => setFilter({ productType: v || undefined });
  const handleChannel = (v: string) => setFilter({ channel: v || undefined });

  // 担当者リスト (グループ絞り)
  const ownerOptions = useMemo(() => {
    const base = filter.groupId
      ? masters.users.filter(u => u.groupId === filter.groupId)
      : masters.users;
    return [
      { value: '', label: '全員' },
      ...base.map(u => ({ value: u.id, label: u.name })),
    ];
  }, [masters.users, filter.groupId]);

  // グループリスト
  const groupOptions = useMemo(() => [
    { value: '', label: '全グループ' },
    ...masters.groups.map(g => ({ value: g.id, label: g.name })),
  ], [masters.groups]);

  // 保険会社リスト (商品ラインで絞り)
  const insurerOptions = useMemo(() => {
    const base = masters.insurers.filter(ins =>
      filter.line === 'both' || ins.line === filter.line || ins.line === 'both',
    );
    return [
      { value: '', label: '全保険会社' },
      ...base.map(ins => ({ value: ins.name, label: ins.name })),
    ];
  }, [masters.insurers, filter.line]);

  // 種目リスト (商品ラインで絞り)
  const productTypeOptions = useMemo(() => {
    const base = masters.productTypes.filter(pt =>
      filter.line === 'both' || pt.line === filter.line,
    );
    return [
      { value: '', label: '全種目' },
      ...base.map(pt => ({ value: pt.name, label: pt.name })),
    ];
  }, [masters.productTypes, filter.line]);

  // チャネルリスト
  const channelOptions = useMemo(() => [
    { value: '', label: '全チャネル' },
    ...masters.channels.map(ch => ({ value: ch.name, label: ch.name })),
  ], [masters.channels]);

  // 確度シナリオ: 両ライン混在時は3集約のみ (既にそうなっている)
  const confidenceOptions = CONFIDENCE_OPTIONS;

  // 単月選択用
  const singleMonthOptions = Object.entries(FISCAL_MONTH_LABELS).map(([m, lbl]) => ({
    value: m,
    label: lbl,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        {/* アイコン */}
        <div className="flex items-center gap-1 text-gray-500 self-end pb-1">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">フィルタ</span>
        </div>

        {/* 商品ライン */}
        <SelectField
          label="商品ライン"
          value={filter.line}
          onChange={handleLine}
          options={LINE_OPTIONS}
        />

        {/* 年度 */}
        <SelectField
          label="年度"
          value={String(filter.fiscalYear)}
          onChange={handleFY}
          options={FISCAL_YEAR_OPTIONS.map(y => ({ value: String(y), label: `FY${y}` }))}
        />

        {/* 期間 */}
        <SelectField
          label="期間"
          value={filter.periodMode}
          onChange={handlePeriod}
          options={PERIOD_OPTIONS}
        />

        {/* 単月 (periodMode=single 時のみ表示) */}
        {filter.periodMode === 'single' && (
          <SelectField
            label="月"
            value={String(filter.singleMonth ?? 1)}
            onChange={handleSingleMonth}
            options={singleMonthOptions}
          />
        )}

        {/* グループ (担当ロール以外) */}
        {currentRole !== 'general' && (
          <SelectField
            label="グループ"
            value={filter.groupId ?? ''}
            onChange={handleGroup}
            options={groupOptions}
          />
        )}

        {/* 担当者 (担当ロールは非表示) */}
        {currentRole !== 'general' && (
          <SelectField
            label="担当者"
            value={filter.ownerId ?? ''}
            onChange={handleOwner}
            options={ownerOptions}
          />
        )}

        {/* 確度シナリオ */}
        <SelectField
          label="確度シナリオ"
          value={filter.confidenceScenario}
          onChange={handleConfidence}
          options={confidenceOptions}
        />

        {/* 保険会社 */}
        <SelectField
          label="保険会社"
          value={filter.insurer ?? ''}
          onChange={handleInsurer}
          options={insurerOptions}
        />

        {/* 種目 */}
        <SelectField
          label="種目"
          value={filter.productType ?? ''}
          onChange={handleProductType}
          options={productTypeOptions}
        />

        {/* チャネル */}
        <SelectField
          label="チャネル"
          value={filter.channel ?? ''}
          onChange={handleChannel}
          options={channelOptions}
        />

        {/* 件数 (右端常時表示) */}
        <div className="ml-auto flex items-center gap-1.5 self-end pb-0.5">
          <span className="text-xs text-gray-400">組合せ結果</span>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {filteredCount.toLocaleString('ja-JP')}件
          </span>
        </div>
      </div>
    </div>
  );
}
