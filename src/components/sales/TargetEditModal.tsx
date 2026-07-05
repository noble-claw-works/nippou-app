// =====================================================
// TargetEditModal — 目標設定 UI
// =====================================================
import { useState } from 'react';
import { useAppStore } from '../../store';
import type { PeriodType } from '../../utils/salesPeriod';
import { toPeriod, shiftPeriod, periodLabel, periodsOfYear } from '../../utils/salesPeriod';
import { checkTargetRollup, calcAchievement } from '../../utils/salesMetrics';
import type { TargetScope } from '../../types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  scope: TargetScope;
  ownerId: string;
  ownerName: string;
  initialPeriodType: PeriodType;
  initialPeriod: string;
  onClose: () => void;
}

const PT_TABS: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: '月次' },
  { value: 'quarterly', label: '四半期' },
  { value: 'annual', label: '年間' },
];

export function TargetEditModal({
  scope,
  ownerId,
  ownerName,
  initialPeriodType,
  initialPeriod,
  onClose,
}: Props) {
  const { currentRole, currentUserId, salesTargets, upsertTarget, policies, addToast } =
    useAppStore();

  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriodType);
  const [period, setPeriod] = useState(initialPeriod);

  const existing = salesTargets.find(
    t =>
      t.scope === scope &&
      t.ownerId === ownerId &&
      t.periodType === periodType &&
      t.period === period,
  );

  const [countVal, setCountVal] = useState(String(existing?.targetPolicyCount ?? ''));
  const [premVal, setPremVal] = useState(String(existing?.targetPremium ?? ''));
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [saving, setSaving] = useState(false);

  // period が変わったら値を更新
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const t = salesTargets.find(
      x =>
        x.scope === scope &&
        x.ownerId === ownerId &&
        x.periodType === periodType &&
        x.period === newPeriod,
    );
    setCountVal(t ? String(t.targetPolicyCount) : '');
    setPremVal(t ? String(t.targetPremium) : '');
    setMemo(t?.memo ?? '');
  };

  // periodType が変わったら period もリセット
  const handlePeriodTypeChange = (pt: PeriodType) => {
    setPeriodType(pt);
    const newPeriod = toPeriod(new Date(), pt);
    setPeriod(newPeriod);
    const t = salesTargets.find(
      x =>
        x.scope === scope &&
        x.ownerId === ownerId &&
        x.periodType === pt &&
        x.period === newPeriod,
    );
    setCountVal(t ? String(t.targetPolicyCount) : '');
    setPremVal(t ? String(t.targetPremium) : '');
    setMemo(t?.memo ?? '');
  };

  // 保存時ロールアップチェック
  const countNum = Number(countVal) || 0;
  const premNum = Number(premVal) || 0;

  // 上位目標との整合確認
  const rollupWarning = (() => {
    if (periodType === 'annual') return null;
    const year = period.slice(0, 4);
    const parentType: PeriodType = periodType === 'monthly' ? 'quarterly' : 'annual';
    const parentPeriod =
      periodType === 'monthly'
        ? toPeriod(new Date(Number(year), Number(period.slice(5, 7)) - 1, 1), 'quarterly')
        : year;
    const parentTarget = salesTargets.find(
      t =>
        t.scope === scope &&
        t.ownerId === ownerId &&
        t.periodType === parentType &&
        t.period === parentPeriod,
    );
    if (!parentTarget) return null;

    const siblings =
      periodType === 'monthly'
        ? periodsOfYear(Number(year), 'monthly').filter(p => {
            const m = Number(p.slice(5, 7));
            const parentQ =
              Math.floor((Number(parentPeriod.split('-Q')[1] ?? 1) - 1) * 3) + 1;
            return m >= parentQ && m < parentQ + 3;
          })
        : periodsOfYear(Number(year), 'quarterly');

    const siblingCounts = siblings.map(p => {
      if (p === period) return countNum; // 今入力中の値
      return (
        salesTargets.find(
          t =>
            t.scope === scope &&
            t.ownerId === ownerId &&
            t.periodType === periodType &&
            t.period === p,
        )?.targetPolicyCount ?? 0
      );
    });
    const check = checkTargetRollup(parentTarget.targetPolicyCount, siblingCounts);
    if (check.status === 'ok' || check.status === 'no_data') return null;
    return check.status === 'under'
      ? `上位(${parentType})目標 ${parentTarget.targetPolicyCount}件 に対して合計が ${check.sumOfChildren}件 (残 ${check.gap}件)`
      : `上位(${parentType})目標 ${parentTarget.targetPolicyCount}件 に対して合計が ${check.sumOfChildren}件 (超過 ${Math.abs(check.gap ?? 0)}件)`;
  })();

  const canSave =
    currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin';

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    try {
      upsertTarget(scope, ownerId, periodType, period, {
        targetPolicyCount: countNum,
        targetPremium: premNum,
        memo,
      }, currentUserId);
      addToast({ type: 'success', message: `目標を保存しました (${periodLabel(periodType, period)})` });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            🎯 目標設定 — {ownerName}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 期間タイプ選択 */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
          {PT_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handlePeriodTypeChange(tab.value)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                periodType === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 期間ナビ */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => handlePeriodChange(shiftPeriod(periodType, period, -1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[80px] text-center">
            {periodLabel(periodType, period)}
          </span>
          <button
            onClick={() => handlePeriodChange(shiftPeriod(periodType, period, 1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 入力フィールド */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">成約件数目標</label>
            <input
              type="number"
              min={0}
              value={countVal}
              onChange={e => setCountVal(e.target.value)}
              placeholder="例: 3"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              月換算保険料目標 (円)
            </label>
            <input
              type="number"
              min={0}
              value={premVal}
              onChange={e => setPremVal(e.target.value)}
              placeholder="例: 40000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ (任意)</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="例: Q3重点商品: 医療保険"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ロールアップ警告 */}
        {rollupWarning && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4 text-xs text-orange-700">
            ⚠ 目標整合: {rollupWarning}（保存はできますが確認を推奨）
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
