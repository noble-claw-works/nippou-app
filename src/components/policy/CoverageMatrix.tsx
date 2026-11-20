import { useMemo } from 'react';
import { useAppStore } from '../../store';
import type { CoverageType } from '../../types';

const COVERAGE_COLS: Array<{ type: CoverageType; label: string }> = [
  { type: 'death',            label: '死亡' },
  { type: 'living_benefit',   label: '生前給付' },
  { type: 'medical_hospital', label: '入院' },
  { type: 'medical_surgery',  label: '手術' },
  { type: 'cancer',           label: 'がん' },
  { type: 'critical_illness', label: '三大疾病' },
  { type: 'disability',       label: '就業不能' },
  { type: 'nursing',          label: '介護' },
  { type: 'savings',          label: '貯蓄/年金' },
  { type: 'liability',        label: '賠償' },
  { type: 'asset_damage',     label: '物損' },
  { type: 'other',            label: 'その他' },
];

const COMPACT_COLS: Array<{ type: CoverageType; label: string }> = [
  { type: 'death',            label: '死亡' },
  { type: 'medical_hospital', label: '入院' },
  { type: 'cancer',           label: 'がん' },
  { type: 'disability',       label: '就業不能' },
  { type: 'nursing',          label: '介護' },
  { type: 'savings',          label: '貯蓄' },
];

const RELATION_LABELS: Record<string, string> = {
  head: '世帯主', spouse: '配偶者', child: '子',
  parent: '親', sibling: '兄弟姉妹', other: 'その他',
};

function fmt(yen: number): string {
  if (yen >= 100_000_000) return `${(yen / 100_000_000).toFixed(1)}億`;
  if (yen >= 10_000) return `${Math.round(yen / 10_000)}万`;
  return `${yen.toLocaleString()}円`;
}

interface Props {
  householdId: string;
  compact?: boolean;
}

export function CoverageMatrix({ householdId, compact = false }: Props) {
  const { getCoverageMatrix, persons } = useAppStore();

  const matrix = useMemo(() => getCoverageMatrix(householdId), [householdId, getCoverageMatrix]);
  const householdPersons = useMemo(
    () => persons.filter(p => p.householdId === householdId),
    [persons, householdId]
  );

  const cols = compact ? COMPACT_COLS : COVERAGE_COLS;

  if (householdPersons.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">世帯員データがありません</div>
    );
  }

  // 警告: 世帯主に死亡保障がない場合
  const headPerson = householdPersons.find(p => p.relation === 'head');
  const headMatrix = headPerson ? matrix.find(m => m.personId === headPerson.id) : null;
  const warnNoDeath = headMatrix ? !headMatrix.coverageTypes.has('death') : false;

  return (
    <div className="overflow-x-auto">
      {warnNoDeath && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          <span>⚠️</span>
          <span>世帯主 <strong>{headPerson?.name}</strong> に死亡保障がありません</span>
        </div>
      )}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-2 px-3 text-gray-600 font-medium whitespace-nowrap min-w-[100px] border-b border-gray-200">
              世帯員
            </th>
            {cols.map(col => (
              <th
                key={col.type}
                className="text-center py-2 px-2 text-gray-600 font-medium whitespace-nowrap border-b border-gray-200 min-w-[60px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {householdPersons.map(person => {
            const row = matrix.find(m => m.personId === person.id);
            return (
              <tr key={person.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <div className="font-medium text-gray-800">{person.name}</div>
                  <div className="text-[10px] text-gray-400">{RELATION_LABELS[person.relation] ?? person.relation}</div>
                </td>
                {cols.map(col => {
                  const has = row?.coverageTypes.has(col.type);
                  const face = row?.totalFaceByType[col.type];
                  return (
                    <td key={col.type} className="text-center py-2 px-2">
                      {has ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-green-600 text-base">✅</span>
                          {face && face > 0 && (
                            <span className="text-[10px] text-gray-500">{fmt(face)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">✗</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-gray-400">※ 有効中・申込中の契約のみ表示</p>
    </div>
  );
}
