// =====================================================
// ConsultTab — renewal2 コンサル入力（実入力式コンタクト履歴版）
//   エリアA: コンタクト履歴（編集ボタンでモード切替: 表示↔編集）
//   エリアB: コンサル内容 8項目（編集→保存ボタン式・保存時のみ履歴1件push）
// =====================================================
import { useState } from "react";
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { User } from "../../types";
import type { RenewalContactRecord, RenewalConsultSurvey } from "../../types/renewal";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_FLYER_OPTIONS,
} from "../../utils/renewalLabels";
import { ContactEditor } from "./ContactEditor";
import {
  daysFromToday,
  daysFromFirstContact,
  daysAtProcedure,
  formatDayCount,
} from "../../utils/renewalDays";
import { deriveFirstContactDate } from "../../utils/renewalContacts";
import { RENEWAL_CONTACT_RESULT_OPTIONS } from "../../utils/renewalLabels";

interface ConsultTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
  onCommit?: (logBody?: string) => void;
  /** 本日 (YYYY-MM-DD)。未指定時はシステム日付（テスト注入可能） */
  today?: string;
  /** 接触ログの担当者名解決用（省略時は userId 表示） */
  users?: User[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function FieldLabel({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label className="block mb-1">
      <span className="block text-xs font-medium text-gray-600">{children}</span>
      {note && (
        <span className="block text-[11px] font-normal text-gray-400 leading-tight">
          {note}
        </span>
      )}
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** 算出日数のバッジ表示（太字・符号付き） */
function ComputedDays({
  label,
  note,
  value,
}: {
  label: string;
  note?: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg bg-blue-50/60 border border-blue-100 px-3 py-2">
      <div className="text-[11px] font-medium text-blue-700">{label}</div>
      {note && <div className="text-[10px] text-blue-400 mb-0.5">{note}</div>}
      <div className="text-sm font-bold text-blue-900 tabular-nums">
        {formatDayCount(value)}
      </div>
    </div>
  );
}

/** コンタクト履歴の表示モード（読み取り専用） */
function ContactReadView({ contacts }: { contacts: RenewalContactRecord[] }) {
  if (contacts.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        接触記録はまだありません。「編集」から入力できます。
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {contacts.map((c) => {
        const resultLabel =
          RENEWAL_CONTACT_RESULT_OPTIONS.find((o) => o.value === c.result)
            ?.label ?? c.result;
        return (
          <div
            key={c.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-700"
          >
            <span className="text-gray-500 whitespace-nowrap w-28 shrink-0">
              {c.date ?? "—"}
              {c.time && (
                <span className="ml-1 text-gray-400">{c.time}</span>
              )}
            </span>
            <span className="text-gray-600 whitespace-nowrap">{resultLabel}</span>
            {c.memo && (
              <span className="text-gray-500 text-xs">{c.memo}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ConsultTab({ rc, onSurveyChange, onCommit, today, users }: ConsultTabProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const c = rc.survey.consult ?? {};
  const base = today ?? todayStr();
  const contacts = c.contacts ?? [];

  // エリアA: コンタクト履歴の編集モード
  const [contactEditing, setContactEditing] = useState(false);
  const [contactDraft, setContactDraft] = useState<RenewalContactRecord[]>([]);

  const handleContactEditStart = () => {
    setContactDraft([...contacts]);
    setContactEditing(true);
  };

  const handleContactCancel = () => {
    setContactEditing(false);
    setContactDraft([]);
  };

  const handleContactSave = () => {
    onSurveyChange({ consult: { contacts: contactDraft } });
    setContactEditing(false);
    setContactDraft([]);
  };

  // エリアB用ドラフト（コンサル内容8項目）
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<RenewalConsultSurvey>>({});

  const handleEdit = () => {
    setDraft({
      earlyRenewalUnavailable: c.earlyRenewalUnavailable,
      procedureDate: c.procedureDate,
      flyerDistribution: c.flyerDistribution,
      renewedPremium: c.renewedPremium,
      renewalMethod: c.renewalMethod,
    });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft({});
  };

  const handleSave = () => {
    onSurveyChange({ consult: draft });
    onCommit?.("コンサル内容を保存しました");
    setEditing(false);
    setDraft({});
  };

  const handleDraftChange = (field: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  // 表示値（編集中はdraft、非編集中はstore値）
  const displayC = editing ? { ...c, ...draft } : c;

  // ── FC日（自動判定：talked最古、無ければ後方互換 firstContactDate） ──
  const derivedFc = deriveFirstContactDate(contacts, c.firstContactDate);

  // ── 算出値（renewalDays util） ──────────────────
  const daysTodayToMaturity = daysFromToday(rc.maturityDate, base);
  const daysFcToMaturity = daysFromFirstContact(rc.maturityDate, derivedFc);
  const daysProc = daysAtProcedure(displayC.procedureDate, rc.maturityDate);

  return (
    <div className="space-y-4">
      {/* ───────────── エリアA: コンタクト履歴（編集モード切替） ───────────── */}
      <SectionCard
        title="コンタクト履歴"
        subtitle="各接触を実入力。FC日は「話せた」の最古日から自動判定します"
      >
        {/* セクションヘッダー：編集/保存・キャンセルボタン */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-medium text-gray-500">
            コンタクト履歴（実入力）
          </div>
          <div className="flex gap-2">
            {contactEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleContactCancel}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleContactSave}
                  className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  保存
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleContactEditStart}
                className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                編集
              </button>
            )}
          </div>
        </div>

        {/* 表示モード / 編集モード */}
        {contactEditing ? (
          <ContactEditor
            contacts={contactDraft}
            onChange={setContactDraft}
          />
        ) : (
          <ContactReadView contacts={contacts} />
        )}
        {/* 修正D: FC日注記ブロックを削除（ヘッダー側に同情報があるため） */}
      </SectionCard>

      {/* ───────────── エリアB: コンサル内容（編集→保存ボタン式） ───────────── */}
      <SectionCard title="コンサル内容">
        {/* 操作ボタン行 */}
        <div className="flex justify-end gap-2 mb-4">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              編集
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. FC日（参照・自動判定値） */}
          <div>
            <FieldLabel note="エリアA「コンタクト履歴」から自動判定">
              ファーストコンタクト日
            </FieldLabel>
            <div className="px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-700">
              {derivedFc || "—"}
            </div>
          </div>

          {/* 2. 満期日までの日数（本日基点・算出・太字） */}
          <ComputedDays
            label="満期日までの日数"
            note="本日基点（算出）"
            value={daysTodayToMaturity}
          />

          {/* 3. 早期更新不可 */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="earlyRenewalUnavailable"
              checked={displayC.earlyRenewalUnavailable ?? false}
              onChange={(e) =>
                editing && handleDraftChange(
                  "earlyRenewalUnavailable",
                  e.target.checked || undefined,
                )
              }
              disabled={!editing}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-300"
            />
            <label
              htmlFor="earlyRenewalUnavailable"
              className={`text-sm text-gray-700 ${editing ? "cursor-pointer" : "cursor-default"}`}
            >
              お客様都合 早期更新不可
            </label>
          </div>

          {/* 4. 手続日 */}
          <div>
            <FieldLabel>手続日</FieldLabel>
            <input
              type="date"
              value={displayC.procedureDate ?? ""}
              onChange={(e) =>
                editing && handleDraftChange("procedureDate", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* 5. 手続き時点での満期日からの日数（算出・太字） */}
          <ComputedDays
            label="手続き時点での満期日からの日数"
            note="手続日 − 満期日（算出・満期前は負値）"
            value={daysProc}
          />

          {/* 6. チラシ配布 */}
          <div>
            <FieldLabel>チラシ配布</FieldLabel>
            <select
              value={displayC.flyerDistribution ?? ""}
              onChange={(e) =>
                editing && handleDraftChange("flyerDistribution", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">—</option>
              {RENEWAL_FLYER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 7. 更改保険料 */}
          <div>
            <FieldLabel note="年間保険料／長期分割は1年分">
              更改保険料
            </FieldLabel>
            <input
              type="number"
              min={0}
              value={displayC.renewedPremium ?? ""}
              onChange={(e) =>
                editing && handleDraftChange(
                  "renewedPremium",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              disabled={!editing}
              placeholder="例: 55000"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* 8. 更新方法 */}
          <div>
            <FieldLabel>更新方法（手続き手段）</FieldLabel>
            <select
              value={displayC.renewalMethod ?? ""}
              onChange={(e) =>
                editing && handleDraftChange("renewalMethod", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">—</option>
              {RENEWAL_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FC基点の日数表示（エリアBの下部に参照用として残す） */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ComputedDays
            label="満期まで(FC基点)"
            note="ファーストコンタクト日から満期日まで"
            value={daysFcToMaturity}
          />
        </div>
      </SectionCard>
    </div>
  );
}
