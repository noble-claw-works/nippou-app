// =====================================================
// ConsultTab — renewal2 コンサル入力（T5-05: 2エリア化）
//   エリアA: コンタクト履歴（FC日・FC基点日数併記・接触ログ時系列）
//   エリアB: コンサル内容 8項目（うち2項目は renewalDays util による算出・太字）
// 設計: specs/ARCH_DOC4_DOC5_design.md §5 / §0確定事項①
//   - 日数=本日基点を主表示、FC日基点を併記
//   - 手続き時点日数 = 手続日 − 満期日（満期前は負値 / 空は —）
//   - RenewalConsultSurvey を流用（新フィールドなし）
// =====================================================
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { User } from "../../types";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_FLYER_OPTIONS,
} from "../../utils/renewalLabels";
import {
  daysFromToday,
  daysFromFirstContact,
  daysAtProcedure,
  formatDayCount,
} from "../../utils/renewalDays";

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

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ consult: { [field]: value } });
  };

  // ── 算出値（renewalDays util） ──────────────────
  // 満期日までの日数（本日基点＝主表示）
  const daysTodayToMaturity = daysFromToday(rc.maturityDate, base);
  // 満期日までの日数（FC日基点＝併記）
  const daysFcToMaturity = daysFromFirstContact(
    rc.maturityDate,
    c.firstContactDate,
  );
  // 手続き時点での満期日からの日数（= 手続日 − 満期日・負値あり）
  const daysProc = daysAtProcedure(c.procedureDate, rc.maturityDate);

  // ── コンタクト履歴（接触ログ・時系列昇順） ──────
  const contactLogs = rc.activityLog
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
        subtitle="ファーストコンタクトからの接触を時系列で把握します"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ファーストコンタクト日 + FC基点日数併記 */}
          <div>
            <FieldLabel note="一番最初に連絡がついた日">
              ファーストコンタクト日
            </FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={c.firstContactDate ?? ""}
                onChange={(e) =>
                  handleChange("firstContactDate", e.target.value || undefined)
                }
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {/* FC日基点の満期日までの日数（併記） */}
              <span className="whitespace-nowrap text-[11px] text-gray-500">
                満期まで(FC基点)：
                <span className="font-medium text-gray-700 tabular-nums">
                  {formatDayCount(daysFcToMaturity)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 接触ログ（時系列）— 対応履歴にも表示される記録を参照表示 */}
        <div className="mt-4">
          <div className="text-[11px] font-medium text-gray-500 mb-1.5">
            接触記録（時系列）
          </div>
          {contactLogs.length === 0 ? (
            <p className="text-xs text-gray-400">
              接触記録はまだありません（対応履歴に「顧客接触」として記録されます）
            </p>
          ) : (
            <ul className="space-y-1.5">
              {contactLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-2 text-xs text-gray-600"
                >
                  <span className="whitespace-nowrap tabular-nums text-gray-400">
                    {log.at.slice(0, 16).replace("T", " ")}
                  </span>
                  <span className="flex-1">{log.body}</span>
                  <span className="whitespace-nowrap text-gray-400">
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
          {/* 1. FC日（参照・エリアAで入力。ここでは確認表示） */}
          <div>
            <FieldLabel note="エリアA「コンタクト履歴」で入力">
              ファーストコンタクト日
            </FieldLabel>
            <div className="px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-700">
              {c.firstContactDate || "—"}
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
