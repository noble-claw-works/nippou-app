// =====================================================
// RenewalListRow — 更新一覧の1行（§5 T5-03）
//
// view モード: 読取表示。
// edit モード: 編集可能4列（手続日/更改保険料/手続き手段/状況）を
//   行内インプット化し、行単位 debounce(400ms)で自動保存。
//   - 保存はフィールド単位パッチ（store 側で deep-merge → 他フィールド巻戻り防止）
//   - 離脱(アンマウント)時は pending を flush
//   - 失敗時は draft を保持し error トースト、値を store 最新へ復帰
// 算出列（満期日/各種日数/契約者名）は入力不可。契約者列は sticky 固定。
// =====================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  RENEWAL_METHOD_LABEL,
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_PRODUCT_TYPE_LABEL,
  RENEWAL_STATUS_LABEL,
  RENEWAL_STATUS_OPTIONS,
} from "../utils/renewalLabels";
import type { RenewalCase, RenewalStatus, RenewalMethod } from "../types";
import type { RenewalListViewMode, RenewalRowView } from "../utils/renewalListView";

const STATUS_COLOR: Record<RenewalCase["status"], string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const SAVE_DEBOUNCE_MS = 400;

export interface RenewalListRowProps {
  rc: RenewalCase;
  mode: RenewalListViewMode;
  view: RenewalRowView;
  ownerName: string;
  onNavigate: (id: string) => void;
  saveSurvey: (
    id: string,
    patch: { procedureDate?: string; renewedPremium?: number; renewalMethod?: RenewalMethod },
  ) => void;
  changeStatus: (id: string, status: RenewalStatus) => void;
  onError: (message: string) => void;
}

const INPUT_CLS =
  "w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300";

export function RenewalListRow({
  rc,
  mode,
  view,
  ownerName,
  onNavigate,
  saveSurvey,
  changeStatus,
  onError,
}: RenewalListRowProps) {
  const editing = mode === "edit";

  // 編集ドラフト（store 値を初期値に。store が外部更新されたら同期）
  const [procedureDate, setProcedureDate] = useState(
    rc.survey.consult?.procedureDate ?? "",
  );
  const [renewedPremium, setRenewedPremium] = useState(
    rc.survey.consult?.renewedPremium != null
      ? String(rc.survey.consult.renewedPremium)
      : "",
  );
  const [method, setMethod] = useState<RenewalMethod | "">(
    rc.survey.consult?.renewalMethod ?? rc.method,
  );
  const [status, setStatus] = useState<RenewalStatus>(rc.status);

  // store 最新への追従（他画面編集・保存反映）。ドラフト未編集時のみ。
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (dirtyRef.current) return;
    setProcedureDate(rc.survey.consult?.procedureDate ?? "");
    setRenewedPremium(
      rc.survey.consult?.renewedPremium != null
        ? String(rc.survey.consult.renewedPremium)
        : "",
    );
    setMethod(rc.survey.consult?.renewalMethod ?? rc.method);
    setStatus(rc.status);
  }, [rc]);

  // debounce 保存（フィールド単位パッチ）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<null | (() => void)>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const fn = pendingRef.current;
    pendingRef.current = null;
    if (!fn) return;
    try {
      fn();
      dirtyRef.current = false;
    } catch {
      onError("保存に失敗しました。もう一度お試しください。");
    }
  }, [onError]);

  const scheduleSave = useCallback(
    (fn: () => void) => {
      dirtyRef.current = true;
      pendingRef.current = fn;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // アンマウント時に pending を flush（離脱時保存）
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        try {
          pendingRef.current();
        } catch {
          /* unmount: トースト不可のため黙ってドロップ */
        }
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commitSurvey = (patch: {
    procedureDate?: string;
    renewedPremium?: number;
    renewalMethod?: RenewalMethod;
  }) => {
    scheduleSave(() => saveSurvey(rc.id, patch));
  };

  const handleStatus = (next: RenewalStatus) => {
    setStatus(next);
    // status は即時確定（履歴記録を伴うため debounce せず）
    try {
      changeStatus(rc.id, next);
      dirtyRef.current = false;
    } catch {
      onError("ステータス保存に失敗しました。");
      setStatus(rc.status);
    }
  };

  const rowCls = `transition-colors ${
    view.expired
      ? "bg-red-50/30"
      : view.near
        ? "bg-orange-50/30"
        : ""
  } ${editing ? "" : "hover:bg-blue-50/50 cursor-pointer"}`;

  const go = () => {
    if (!editing) onNavigate(rc.id);
  };

  return (
    <tr className={rowCls}>
      {/* 契約者（sticky 固定・算出/読取） */}
      <td
        className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium text-gray-900 whitespace-nowrap"
        onClick={go}
      >
        {rc.contractorName || <span className="text-gray-300">—</span>}
      </td>
      {/* 団体名 */}
      <td className="px-3 py-3 text-gray-600 whitespace-nowrap" onClick={go}>
        {rc.groupName ? (
          <span>{rc.groupName}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 担当者 */}
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap" onClick={go}>
        {ownerName}
      </td>
      {/* 保険会社 */}
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap" onClick={go}>
        {rc.insurer}
      </td>
      {/* 満期日 + 本日基点残日数（主表示・算出/読取） */}
      <td className="px-3 py-3 whitespace-nowrap" onClick={go}>
        <span
          className={
            view.expired
              ? "font-semibold text-red-600"
              : view.near
                ? "font-semibold text-orange-600"
                : "text-gray-700"
          }
        >
          {rc.maturityDate}
        </span>
        <span className="ml-2">
          {view.expired ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
              <AlertTriangle className="w-2.5 h-2.5" />
              期限切れ
            </span>
          ) : view.near ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
              <AlertTriangle className="w-2.5 h-2.5" />
              残{view.maturityDaysLabel}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">
              残{view.maturityDaysLabel}
            </span>
          )}
        </span>
      </td>
      {/* FC日 + FC日基点日数（算出/読取） */}
      <td className="px-3 py-3 whitespace-nowrap text-gray-600" onClick={go}>
        {view.fcDate ? (
          <>
            <span className="text-gray-700">{view.fcDate}</span>
            <span className="ml-1.5 text-[10px] text-gray-400">
              FC基点 {view.fcDaysLabel}
            </span>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 種目（読取） */}
      <td className="px-3 py-3 text-gray-700 whitespace-nowrap" onClick={go}>
        {RENEWAL_PRODUCT_TYPE_LABEL[rc.productType]}
      </td>
      {/* 前年保険料（読取） */}
      <td
        className="px-3 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums"
        onClick={go}
      >
        {rc.prevYearPremium != null ? (
          `¥${rc.prevYearPremium.toLocaleString()}`
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 手続日（編集可） */}
      <td className="px-3 py-3 whitespace-nowrap" onClick={go}>
        {editing ? (
          <input
            type="date"
            value={procedureDate}
            onChange={(e) => {
              const v = e.target.value;
              setProcedureDate(v);
              commitSurvey({ procedureDate: v || undefined });
            }}
            onBlur={flush}
            className={INPUT_CLS}
          />
        ) : procedureDate ? (
          <span className="text-gray-700">{procedureDate}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 更改保険料（編集可） */}
      <td className="px-3 py-3 text-right whitespace-nowrap" onClick={go}>
        {editing ? (
          <input
            type="number"
            min={0}
            value={renewedPremium}
            onChange={(e) => {
              const v = e.target.value;
              setRenewedPremium(v);
              commitSurvey({
                renewedPremium: v ? Number(v) : undefined,
              });
            }}
            onBlur={flush}
            placeholder="—"
            className={`${INPUT_CLS} text-right tabular-nums`}
          />
        ) : renewedPremium ? (
          <span className="text-gray-700 tabular-nums">
            ¥{Number(renewedPremium).toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* 手続き手段 method（編集可） */}
      <td className="px-3 py-3 whitespace-nowrap" onClick={go}>
        {editing ? (
          <select
            value={method}
            onChange={(e) => {
              const v = (e.target.value || "") as RenewalMethod | "";
              setMethod(v);
              if (v) commitSurvey({ renewalMethod: v });
            }}
            onBlur={flush}
            className={INPUT_CLS}
          >
            <option value="">—</option>
            {RENEWAL_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-600">
            {RENEWAL_METHOD_LABEL[rc.method]}
          </span>
        )}
      </td>
      {/* 状況 status（編集可） */}
      <td className="px-3 py-3 whitespace-nowrap" onClick={go}>
        {editing ? (
          <select
            value={status}
            onChange={(e) => handleStatus(e.target.value as RenewalStatus)}
            className={INPUT_CLS}
          >
            {RENEWAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rc.status]}`}
          >
            {RENEWAL_STATUS_LABEL[rc.status]}
          </span>
        )}
      </td>
    </tr>
  );
}
