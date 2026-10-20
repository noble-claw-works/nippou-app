/**
 * HouseholdAccordion — 世帯1段グループ化アコーディオン
 *
 * 業務系トーン(SaaS管理画面)。ui-design-standards準拠:
 * - hex直書きなし。Tailwindトークンのみ
 * - タップ領域 44px 以上 (min-h-[44px])
 * - 開閉アイコン ▸/▾ (ChevronRight/ChevronDown)
 * - 空状態(0件)表示あり
 * - 件数バッジあり
 * - 「すべて開く/閉じる」トグル
 *
 * 設計方針 (主上確定 2026-07-12 C-2):
 *   - 世帯ごとの1段グループのみ（契約者は第2段のグループにしない）
 *   - 既定=全開（C-1で主上是認の全開踏襲）
 */

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { HouseholdGroup } from "../../utils/groupByHousehold";

export interface HouseholdAccordionProps<T> {
  /** グルーピング済みデータ */
  groups: HouseholdGroup<T>[];
  /** 既定で全開か（true=全開。C-1で主上是認の全開踏襲） */
  allOpenDefault?: boolean;
  /** 行レンダラー */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** テーブルヘッダー */
  renderTableHeader: () => React.ReactNode;
  /** テーブル全体のcolspan数（世帯ヘッダー行に使用） */
  colSpan: number;
  /** 件数バッジのラベル例: '商談' → '商談N件' */
  itemLabel: string;
  /** データ0件時のメッセージ */
  emptyMessage?: string;
  /**
   * 世帯ヘッダー行に追加表示するメタ情報（任意）。
   * ADR-B3: 代表アクティブ案件の律速ステージ・契約予定日・⚠️ 等。
   */
  renderHouseholdMeta?: (householdId: string) => React.ReactNode;
  /**
   * 世帯ヘッダー行右端に描画するアクションボタン群（任意）。
   * ADR-B4 v2 要件3: 「報告」ボタン等を注入する。
   * e.stopPropagation() は呼び出し側ボタンの onClick 内で行うこと。
   */
  renderHouseholdActions?: (householdId: string) => React.ReactNode;
}

/**
 * 世帯ヘッダー行のスタイル — 業務系・グループ親として視覚的に区別
 * 背景: gray-100, 左ボーダー: blue-400
 */
const HOUSEHOLD_HEADER_CLASS =
  "bg-gray-100 border-l-4 border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors select-none";

export function HouseholdAccordion<T>({
  groups,
  allOpenDefault = true,
  renderItem,
  renderTableHeader,
  colSpan,
  itemLabel,
  emptyMessage = "該当するデータがありません",
  renderHouseholdMeta,
  renderHouseholdActions,
}: HouseholdAccordionProps<T>) {
  /** 開いている世帯IDのSet */
  const buildInitialOpen = useCallback(
    (open: boolean): Set<string> => {
      if (!open) return new Set();
      return new Set(groups.map((g) => g.householdId));
    },
    [groups],
  );

  const [openSet, setOpenSet] = useState<Set<string>>(() =>
    buildInitialOpen(allOpenDefault),
  );

  const isAllOpen =
    groups.length > 0 && groups.every((g) => openSet.has(g.householdId));

  const toggleAll = () => {
    if (isAllOpen) {
      setOpenSet(new Set());
    } else {
      setOpenSet(buildInitialOpen(true));
    }
  };

  const toggleHousehold = (householdId: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(householdId)) {
        next.delete(householdId);
      } else {
        next.add(householdId);
      }
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            {renderTableHeader()}
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* すべて開く/閉じる */}
      <div className="flex justify-end px-4 py-2 border-b border-gray-100 bg-gray-50">
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline min-h-[32px] px-2"
        >
          {isAllOpen ? "すべて閉じる" : "すべて開く"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            {renderTableHeader()}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groups.map((group) => (
              <>
                {/* 世帯ヘッダー行 */}
                <tr
                  key={`hh-${group.householdId}`}
                  className={HOUSEHOLD_HEADER_CLASS}
                  onClick={() => toggleHousehold(group.householdId)}
                >
                  <td colSpan={colSpan} className="px-4 py-2.5 min-h-[44px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {openSet.has(group.householdId) ? (
                        <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-gray-800 text-sm">
                        {group.householdName}
                      </span>
                      <span className="ml-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {itemLabel}
                        {group.items.length}件
                      </span>
                      {renderHouseholdMeta?.(group.householdId)}
                      {renderHouseholdActions && (
                        <span className="ml-auto">
                          {renderHouseholdActions(group.householdId)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* 案件/契約行（世帯が開いている場合のみ） */}
                {openSet.has(group.householdId) &&
                  group.items.map((item, idx) => renderItem(item, idx))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
