/**
 * TwoLevelAccordion — 世帯>契約者 2段アコーディオンの共通UIコンポーネント
 *
 * 業務系トーン(SaaS管理画面)。ui-design-standards準拠:
 * - hex直書きなし。Tailwindトークンのみ
 * - タップ領域 44px 以上(min-h-[44px])
 * - 開閉アイコン ▸/▾(ChevronRight/ChevronDown)
 * - 空状態(0件)表示あり
 * - 件数バッジあり
 */

import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { HouseholdGroup } from '../../utils/grouping';

export interface TwoLevelAccordionProps<T> {
  /** グルーピング済みデータ */
  groups: HouseholdGroup<T>[];
  /** 全体の「すべて開く/閉じる」の初期状態 */
  allOpenDefault?: boolean;
  /** 行レンダラー */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** テーブルヘッダーのレンダー (renderRows と同じ colspan 体系) */
  renderTableHeader: () => React.ReactNode;
  /** colspan 数（世帯行・契約者行の colspan に使用） */
  colSpan: number;
  /** データ0件時のメッセージ */
  emptyMessage?: string;
}

/**
 * 世帯ヘッダー行のスタイル — 業務系・グループ親として視覚的に区別
 * 背景: gray-100(薄いがっちり系), 左ボーダー: blue-400
 */
const HOUSEHOLD_HEADER_CLASS =
  'bg-gray-100 border-l-4 border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors';

/**
 * 契約者ヘッダー行のスタイル — 第2段(子)として世帯より一段下げて表示
 * 背景: gray-50, 左padding で字下げ, 左ボーダー: gray-300
 */
const CONTRACTOR_HEADER_CLASS =
  'bg-gray-50 border-l-4 border-gray-300 hover:bg-gray-100 cursor-pointer transition-colors';

export function TwoLevelAccordion<T>({
  groups,
  allOpenDefault = true,
  renderItem,
  renderTableHeader,
  colSpan,
  emptyMessage = '該当するデータがありません',
}: TwoLevelAccordionProps<T>) {
  /**
   * 開閉状態管理:
   * - householdOpen: Set<householdId>
   * - contractorOpen: Set<"${householdId}:::${contractorPersonId}">
   *
   * 既定開閉の設計判断:
   * allOpenDefault=true (既定: 全開) を採用。
   * 理由: 保険営業実務では日々数件〜十数件の案件・契約を確認するユースケースが主。
   * 全閉からの「探す」より全開で「ひと目で把握」できる体験の方が業務効率が高い。
   * 件数が多い場合はユーザーが「すべて閉じる」ボタンで折りたためる。
   */
  const buildInitialOpen = useCallback(
    (open: boolean): Set<string> => {
      if (!open) return new Set();
      const ids = new Set<string>();
      for (const hg of groups) {
        ids.add(hg.householdId);
        for (const cg of hg.contractorGroups) {
          ids.add(`${hg.householdId}:::${cg.contractorPersonId}`);
        }
      }
      return ids;
    },
    [groups],
  );

  const [householdOpen, setHouseholdOpen] = useState<Set<string>>(
    () => buildInitialOpen(allOpenDefault),
  );
  const [contractorOpen, setContractorOpen] = useState<Set<string>>(
    () => buildInitialOpen(allOpenDefault),
  );

  const isAllOpen =
    groups.every(hg => householdOpen.has(hg.householdId)) &&
    groups.every(hg =>
      hg.contractorGroups.every(cg =>
        contractorOpen.has(`${hg.householdId}:::${cg.contractorPersonId}`),
      ),
    );

  const toggleAll = () => {
    if (isAllOpen) {
      setHouseholdOpen(new Set());
      setContractorOpen(new Set());
    } else {
      setHouseholdOpen(buildInitialOpen(true));
      setContractorOpen(buildInitialOpen(true));
    }
  };

  const toggleHousehold = (householdId: string) => {
    setHouseholdOpen(prev => {
      const next = new Set(prev);
      if (next.has(householdId)) next.delete(householdId);
      else next.add(householdId);
      return next;
    });
  };

  const toggleContractor = (householdId: string, contractorPersonId: string) => {
    const key = `${householdId}:::${contractorPersonId}`;
    setContractorOpen(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-8 text-center text-gray-400 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* すべて開く/閉じるトグル */}
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 min-h-[32px]"
        >
          {isAllOpen ? 'すべて閉じる ▴' : 'すべて開く ▾'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {renderTableHeader()}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map(hg => {
                const hOpen = householdOpen.has(hg.householdId);
                return (
                  <HouseholdSection
                    key={hg.householdId}
                    hg={hg}
                    hOpen={hOpen}
                    contractorOpen={contractorOpen}
                    colSpan={colSpan}
                    onToggleHousehold={toggleHousehold}
                    onToggleContractor={toggleContractor}
                    renderItem={renderItem}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 世帯セクション（分離でメモ化対象） ─────────────────────
interface HouseholdSectionProps<T> {
  hg: HouseholdGroup<T>;
  hOpen: boolean;
  contractorOpen: Set<string>;
  colSpan: number;
  onToggleHousehold: (id: string) => void;
  onToggleContractor: (householdId: string, contractorId: string) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}

function HouseholdSection<T>({
  hg,
  hOpen,
  contractorOpen,
  colSpan,
  onToggleHousehold,
  onToggleContractor,
  renderItem,
}: HouseholdSectionProps<T>) {
  return (
    <>
      {/* ── 世帯ヘッダー行 ── */}
      <tr
        className={HOUSEHOLD_HEADER_CLASS}
        onClick={() => onToggleHousehold(hg.householdId)}
        role="button"
        aria-expanded={hOpen}
      >
        <td colSpan={colSpan} className="px-4 min-h-[44px] py-2.5">
          <div className="flex items-center gap-2">
            {hOpen
              ? <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-blue-500 shrink-0" />}
            <span className="font-semibold text-gray-800 text-sm">{hg.householdName}</span>
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
              {hg.totalCount}件
            </span>
          </div>
        </td>
      </tr>

      {/* ── 世帯が開いているとき: 契約者グループを表示 ── */}
      {hOpen && hg.contractorGroups.map(cg => {
        const cKey = `${hg.householdId}:::${cg.contractorPersonId}`;
        const cOpen = contractorOpen.has(cKey);
        return (
          <ContractorSection
            key={cKey}
            cg={cg}
            cOpen={cOpen}
            householdId={hg.householdId}
            colSpan={colSpan}
            onToggle={onToggleContractor}
            renderItem={renderItem}
          />
        );
      })}
    </>
  );
}

// ─── 契約者セクション ─────────────────────────────────────
interface ContractorSectionProps<T> {
  cg: import('../../utils/grouping').ContractorGroup<T>;
  cOpen: boolean;
  householdId: string;
  colSpan: number;
  onToggle: (householdId: string, contractorId: string) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}

function ContractorSection<T>({
  cg,
  cOpen,
  householdId,
  colSpan,
  onToggle,
  renderItem,
}: ContractorSectionProps<T>) {
  return (
    <>
      {/* ── 契約者ヘッダー行 ── */}
      <tr
        className={CONTRACTOR_HEADER_CLASS}
        onClick={() => onToggle(householdId, cg.contractorPersonId)}
        role="button"
        aria-expanded={cOpen}
      >
        <td colSpan={colSpan} className="px-8 min-h-[44px] py-2">
          <div className="flex items-center gap-2">
            {cOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
            <span className="text-sm text-gray-700">👤 {cg.contractorName}</span>
            <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
              {cg.items.length}件
            </span>
          </div>
        </td>
      </tr>

      {/* ── 契約者が開いているとき: 実データ行を表示 ── */}
      {cOpen && cg.items.map((item, idx) => renderItem(item, idx))}
    </>
  );
}
