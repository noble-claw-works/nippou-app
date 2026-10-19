// =====================================================
// ConsultTab — renewal2 コンサル入力（実入力式コンタクト履歴版）
//   エリアA: コンタクト履歴（実入力式テーブル: 日付/結果5種/メモ/行追加削除）
//            FC日は contacts(talked最古) から自動判定して表示
//   エリアB: コンサル内容 8項目（うち2項目は renewalDays util による算出・太字）
// 設計: specs/ARCH_DOC4_DOC5_design.md §5 / §0確定事項①
//   - 独立「ファーストコンタクト日」入力は廃止（主上指摘）
//   - FC日=「話せた」の最古 date を自動判定（deriveFirstContactDate）
//   - 日数=本日基点を主表示、FC日基点(自動判定値)を併記
//   - 手続き時点日数 = 手続日 − 満期日（満期前は負値 / 空は —）
// =====================================================
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { User } from "../../types";
import type { RenewalContactRecord } from "../../types/renewal";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_FLYER_OPTIONS,
  RENEWAL_CONTACT_RESULT_LABEL,
} from "../../utils/renewalLabels";
import { ContactEditor } from "./ContactEditor";
import {
  daysFromToday,
  daysFromFirstContact,
  daysAtProcedure,
  formatDayCount,
} from "../../utils/renewalDays";
import {
  deriveFirstContactDate,
  sortContactsByDate,
} from "../../utils/renewalContacts";

interface ConsultTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
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

export function ConsultTab({ rc, onSurveyChange, today, users }: ConsultTabProps) {
  const c = rc.survey.consult ?? {};
  const base = today ?? todayStr();
  const contacts = c.contacts ?? [];

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ consult: { [field]: value } });
  };
  const handleContactsChange = (next: RenewalContactRecord[]) => {
    onSurveyChange({ consult: { contacts: next } });
  };

  // ── FC日（自動判定：talked最古、無ければ後方互換 firstContactDate） ──
  const derivedFc = deriveFirstContactDate(contacts, c.firstContactDate);

  // ── 算出値（renewalDays util） ──────────────────
  const daysTodayToMaturity = daysFromToday(rc.maturityDate, base);
  const daysFcToMaturity = daysFromFirstContact(rc.maturityDate, derivedFc);
  const daysProc = daysAtProcedure(c.procedureDate, rc.maturityDate);

  // ── 接触記録（時系列昇順・参照表示） ──────
  const contactsAsc = sortContactsByDate(contacts);
  const legacyContactLogs = rc.activityLog
    .filter((l) => l.kind === "contact")
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const userName = (userId: string) =>
    users?.find((u) => u.id === userId)?.name ?? userId;

  return (
    <div className="space-y-4">
      {/* ───────────── エリアA: コンタクト履歴 ───────────── */}
      <SectionCard
        title="コンタクト履歴"
        subtitle="各接触を実入力。FC日は「話せた」の最古日から自動判定します"
      >
        {/* 実入力テーブル */}
        <ContactEditor contacts={contacts} onChange={handleContactsChange} />

        {/* FC日の自動判定＋FC基点日数 */}
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
          <div className="text-[11px] text-gray-500">
            ファーストコンタクト日（自動判定）：
            <span className="font-medium text-gray-800">
              {derivedFc || "未接触"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            満期まで(FC基点)：
            <span className="font-medium text-gray-700 tabular-nums">
              {formatDayCount(daysFcToMaturity)}
            </span>
          </div>
        </div>

        {/* 接触記録（時系列・参照表示） */}
        <div className="mt-4">
          <div className="text-[11px] font-medium text-gray-500 mb-1.5">
            接触記録（時系列）
          </div>
          {contactsAsc.length === 0 ? (
            <p className="text-xs text-gray-400">
              接触記録はまだありません
            </p>
          ) : (
            <ul className="space-y-1.5">
              {contactsAsc.map((ct) => (
                <li
                  key={ct.id}
                  className="flex items-start gap-2 text-xs text-gray-600"
                >
                  <span className="whitespace-nowrap tabular-nums text-gray-400">
                    {ct.date || "日付未設定"}
                  </span>
                  <span className="whitespace-nowrap font-medium text-gray-700">
                    {RENEWAL_CONTACT_RESULT_LABEL[ct.result]}
                  </span>
                  {ct.memo && <span className="flex-1">{ct.memo}</span>}
                </li>
              ))}
            </ul>
          )}
          {legacyContactLogs.length > 0 && (
            <ul className="space-y-1.5 mt-2 pt-2 border-t border-gray-100">
              {legacyContactLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-2 text-xs text-gray-400"
                >
                  <span className="whitespace-nowrap tabular-nums">
                    {log.at.slice(0, 16).replace("T", " ")}
                  </span>
                  <span className="flex-1">{log.body}</span>
                  <span className="whitespace-nowrap">
                    {userName(log.byUserId)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      {/* ───────────── エリアB: コンサル内容（8項目） ───────────── */}
      <SectionCard title="コンサル内容">
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
              checked={c.earlyRenewalUnavailable ?? false}
              onChange={(e) =>
                handleChange(
                  "earlyRenewalUnavailable",
                  e.target.checked || undefined,
                )
              }
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-300"
            />
            <label
              htmlFor="earlyRenewalUnavailable"
              className="text-sm text-gray-700 cursor-pointer"
            >
              お客様都合 早期更新不可
            </label>
          </div>

          {/* 4. 手続日 */}
          <div>
            <FieldLabel>手続日</FieldLabel>
            <input
              type="date"
              value={c.procedureDate ?? ""}
              onChange={(e) =>
                handleChange("procedureDate", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
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
              value={c.flyerDistribution ?? ""}
              onChange={(e) =>
                handleChange("flyerDistribution", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
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
              value={c.renewedPremium ?? ""}
              onChange={(e) =>
                handleChange(
                  "renewedPremium",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="例: 55000"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 8. 更新方法 */}
          <div>
            <FieldLabel>更新方法（手続き手段）</FieldLabel>
            <select
              value={c.renewalMethod ?? ""}
              onChange={(e) =>
                handleChange("renewalMethod", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
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
      </SectionCard>
    </div>
  );
}
