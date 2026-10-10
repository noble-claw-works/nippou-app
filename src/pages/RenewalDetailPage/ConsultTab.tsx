// ConsultTab — renewal2 コンサル入力
import type { RenewalCase, RenewalSurvey } from "../../types";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_FLYER_OPTIONS,
} from "../../utils/renewalLabels";

interface ConsultTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
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
      <span className="block text-xs font-medium text-gray-600">
        {children}
      </span>
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function ConsultTab({ rc, onSurveyChange }: ConsultTabProps) {
  const c = rc.survey.consult ?? {};

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ consult: { [field]: value } });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="コンサル入力">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ファーストコンタクト日 */}
          <div>
            <FieldLabel note="一番最初に連絡がついた日">
              ファーストコンタクト日
            </FieldLabel>
            <input
              type="date"
              value={c.firstContactDate ?? ""}
              onChange={(e) =>
                handleChange("firstContactDate", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 手続日 */}
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

          {/* 更改保険料 */}
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

          {/* 更新方法 */}
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

          {/* チラシ配布 */}
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

          {/* お客様都合 早期更新不可 */}
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
        </div>
      </SectionCard>
    </div>
  );
}
