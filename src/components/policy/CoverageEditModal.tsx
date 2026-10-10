import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Coverage, CoverageType } from '../../types';

const COVERAGE_TYPE_LABELS: Record<CoverageType, string> = {
  death: '死亡保険金', living_benefit: '生前給付', medical_hospital: '入院給付金',
  medical_surgery: '手術給付金', cancer: 'がん保障', critical_illness: '三大疾病',
  disability: '就業不能', nursing: '介護', savings: '貯蓄/年金',
  liability: '賠償', asset_damage: '物損', other: 'その他',
};

interface Props {
  policyId: string;
  insuredPersonIds: string[];
  householdId: string;
  coverage?: Coverage;
  onClose: () => void;
}

type Draft = Omit<Coverage, 'id' | 'policyId'>;

export function CoverageEditModal({ policyId, insuredPersonIds, householdId, coverage, onClose }: Props) {
  const { addCoverage, updateCoverage, getPersonsByHousehold, addToast } = useAppStore();
  const persons = getPersonsByHousehold(householdId);

  const defaultPersonId = insuredPersonIds[0] ?? persons[0]?.id ?? '';

  const [draft, setDraft] = useState<Draft>(() => coverage
    ? { ...coverage }
    : {
        type: 'death',
        label: '',
        insuredPersonId: defaultPersonId,
        isMain: false,
        faceAmount: undefined,
        unitAmount: undefined,
        unit: 'JPY',
        memo: '',
      }
  );

  const set = <K extends keyof Draft>(key: K, val: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const handleSave = () => {
    if (!draft.label) {
      addToast({ type: 'error', message: 'ラベルは必須です' });
      return;
    }
    if (coverage) {
      updateCoverage(coverage.id, draft);
      addToast({ type: 'success', message: '保障を更新しました' });
    } else {
      addCoverage(policyId, draft);
      addToast({ type: 'success', message: '保障を追加しました' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {coverage ? '保障を編集' : '保障を追加'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">保障種別</label>
            <select
              value={draft.type}
              onChange={e => {
                const t = e.target.value as CoverageType;
                setDraft(d => ({ ...d, type: t, label: COVERAGE_TYPE_LABELS[t] }));
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {(Object.keys(COVERAGE_TYPE_LABELS) as CoverageType[]).map(k => (
                <option key={k} value={k}>{COVERAGE_TYPE_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ラベル *</label>
            <input
              value={draft.label}
              onChange={e => set('label', e.target.value)}
              placeholder="例: 死亡保険金、入院給付金日額"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {persons.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">被保険者</label>
              <select
                value={draft.insuredPersonId}
                onChange={e => set('insuredPersonId', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">保険金額 (円)</label>
              <input
                type="number"
                value={draft.faceAmount ?? ''}
                onChange={e => set('faceAmount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="例: 10000000"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">日額/回額</label>
              <input
                type="number"
                value={draft.unitAmount ?? ''}
                onChange={e => set('unitAmount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="例: 5000"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">単位</label>
              <select
                value={draft.unit ?? 'JPY'}
                onChange={e => set('unit', e.target.value as Coverage['unit'])}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="JPY">円</option>
                <option value="day">日額</option>
                <option value="time">回額</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">特約名</label>
              <input
                value={draft.riderName ?? ''}
                onChange={e => set('riderName', e.target.value || undefined)}
                placeholder="例: がん特約"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isMain"
              checked={draft.isMain}
              onChange={e => set('isMain', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isMain" className="text-sm text-gray-700">主契約</label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
            <textarea
              value={draft.memo}
              onChange={e => set('memo', e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            {coverage ? '更新する' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  );
}
