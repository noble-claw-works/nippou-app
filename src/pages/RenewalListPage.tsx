// =====================================================
// RenewalListPage — 更新一覧（保険契約 更新対応ワークリスト）
//
// 独立ページ (/renewals) として AppShell NAV から直接アクセス。
// §5 T5-02/T5-03:
//   - 日数は renewalDays util に統一（二重表示禁止）。本日基点=主表示 /
//     FC日基点=FC日横に併記（buildRenewalRowView で算出・入力不可列）。
//   - 入力ビュー切替（閲覧/編集）。編集では 手続日/更改保険料/手続き手段/状況 を
//     行内で直接入力し、行単位 debounce で自動保存（RenewalListRow が担当）。
// 満期日昇順・60日以内強調・閲覧時は行クリックで /renewals/:id。
// =====================================================
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Upload, Eye, Pencil, Filter, X } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import { RENEWAL_NEAR_DAYS } from "../utils/filterRenewalPolicies";
import {
  buildRenewalRowView,
  type RenewalListViewMode,
} from "../utils/renewalListView";
import {
  RENEWAL_STATUS_OPTIONS,
  RENEWAL_PRODUCT_TYPE_OPTIONS,
} from "../utils/renewalLabels";
import type { RenewalStatus, RenewalProductType } from "../types/renewal";
import { RenewalListRow } from "./RenewalListRow";

/** 当日 yyyy-MM-dd（ローカル） */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const TH_CLS = "text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap";

export function RenewalListPage() {
  const navigate = useNavigate();
  const {
    renewalCases,
    users,
    currentRole,
    currentUserId,
    getRenewalCases,
    saveRenewalSurvey,
    changeRenewalStatus,
    addToast,
  } = useAppStore(
    useShallow((s) => ({
      renewalCases: s.renewalCases,
      users: s.users,
      currentRole: s.currentRole,
      currentUserId: s.currentUserId,
      getRenewalCases: s.getRenewalCases,
      saveRenewalSurvey: s.saveRenewalSurvey,
      changeRenewalStatus: s.changeRenewalStatus,
      addToast: s.addToast,
    })),
  );

  const [mode, setMode] = useState<RenewalListViewMode>("view");

  // ⑦ フィルター状態
  const [filterStatus, setFilterStatus] = useState<RenewalStatus | "">("");
  const [filterProduct, setFilterProduct] = useState<RenewalProductType | "">("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterNear, setFilterNear] = useState<"all" | "near" | "expired">("all");

  // フィルター有効判定
  const hasFilter =
    filterStatus !== "" ||
    filterProduct !== "" ||
    filterOwner !== "" ||
    filterNear !== "all";

  const resetFilter = () => {
    setFilterStatus("");
    setFilterProduct("");
    setFilterOwner("");
    setFilterNear("all");
  };

  const today = todayStr();

  // ロール別フィルタ・maturityDate 昇順
  const cases = useMemo(
    () => getRenewalCases({ role: currentRole, userId: currentUserId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renewalCases, currentRole, currentUserId],
  );

  // 行表示モデル（算出列）を一括構築
  const allRows = useMemo(
    () => cases.map((rc) => ({ rc, view: buildRenewalRowView(rc, today) })),
    [cases, today],
  );

  // ⑦ フィルター適用
  const rows = useMemo(() => {
    return allRows.filter(({ rc, view }) => {
      if (filterStatus && rc.status !== filterStatus) return false;
      if (filterProduct && rc.productType !== filterProduct) return false;
      if (filterOwner && rc.ownerUserId !== filterOwner) return false;
      if (filterNear === "near" && !view.near) return false;
      if (filterNear === "expired" && !view.expired) return false;
      return true;
    });
  }, [allRows, filterStatus, filterProduct, filterOwner, filterNear]);

  const nearCount = useMemo(
    () => allRows.filter((r) => r.view.near).length,
    [allRows],
  );

  const userName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? "—";

  const onError = (message: string) =>
    addToast({ type: "error", message });

  return (
    <div className="w-full px-6 py-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            更新一覧
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            損害保険の更新対応ワークリスト {cases.length}件
            {nearCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {RENEWAL_NEAR_DAYS}日以内 {nearCount}件
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 入力ビュー切替（閲覧/編集） */}
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                mode === "view"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Eye className="w-4 h-4" />
              閲覧
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                mode === "edit"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Pencil className="w-4 h-4" />
              編集
            </button>
          </div>
          {/* M3: インポート導線 */}
          <Link
            to="/renewals/import"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            インポート
          </Link>
        </div>
      </div>

      {/* ⑦ フィルターバー */}
      {cases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">絞り込み</span>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilter}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
                リセット
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 期間トグル */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([
                ["all", "全て"],
                ["near", `${RENEWAL_NEAR_DAYS}日以内`],
                ["expired", "期限切れ"],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilterNear(val)}
                  className={`px-2.5 py-1.5 font-medium transition-colors ${
                    filterNear === val
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 状況 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RenewalStatus | "")}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">状況: 全て</option>
              {RENEWAL_STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* 種目 */}
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value as RenewalProductType | "")}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">種目: 全て</option>
              {RENEWAL_PRODUCT_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* 担当者 */}
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">担当者: 全て</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <div className="mt-2 text-[11px] text-gray-400">
              表示: {rows.length} / {allRows.length} 件
            </div>
          )}
        </div>
      )}

      {/* 凡例 */}
      {cases.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-100 border border-orange-300" />
            {RENEWAL_NEAR_DAYS}日以内
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-300" />
            期限切れ
          </span>
          {mode === "edit" && (
            <span className="text-blue-600">
              編集モード: 変更は自動保存されます
            </span>
          )}
        </div>
      )}

      {/* テーブル */}
      {cases.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          更新対応ワークリストがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={`${TH_CLS} sticky left-0 z-20 bg-gray-50 px-4`}>
                  契約者
                </th>
                <th className={TH_CLS}>団体名</th>
                <th className={TH_CLS}>担当者</th>
                <th className={TH_CLS}>保険会社</th>
                <th className={TH_CLS}>満期日 / 残日数</th>
                <th className={TH_CLS}>FC日 / FC基点</th>
                <th className={TH_CLS}>種目</th>
                <th className="text-right px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  前年保険料
                </th>
                <th className={TH_CLS}>手続日</th>
                <th className="text-right px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  更改保険料
                </th>
                <th className={TH_CLS}>手続き手段</th>
                <th className={TH_CLS}>状況</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ rc, view }) => (
                <RenewalListRow
                  key={rc.id}
                  rc={rc}
                  mode={mode}
                  view={view}
                  ownerName={userName(rc.ownerUserId)}
                  onNavigate={(id) => navigate(`/renewals/${id}`)}
                  saveSurvey={(id, patch) =>
                    saveRenewalSurvey(id, { consult: patch })
                  }
                  changeStatus={changeRenewalStatus}
                  onError={onError}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
