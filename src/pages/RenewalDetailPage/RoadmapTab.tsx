// RoadmapTab — renewal3 ロードマップチラシ（ヒアリング）
import type { RenewalCase, RenewalSurvey } from "../../types";
import {
  RENEWAL_GENDER_OPTIONS,
  RENEWAL_AGE_BAND_OPTIONS,
  RENEWAL_CONCERN_OPTIONS,
} from "../../utils/renewalLabels";

interface RoadmapTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}
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

export function RoadmapTab({ rc, onSurveyChange }: RoadmapTabProps) {
  const r = rc.survey.roadmap ?? {};

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ roadmap: { [field]: value } });
  };

  const otherConcerns = r.otherConcerns ?? ["", "", "", ""];
  const handleOtherConcern = (idx: number, value: string) => {
    const next = [...otherConcerns];
    next[idx] = value;
    onSurveyChange({ roadmap: { otherConcerns: next } });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="ロードマップチラシ（ヒアリング）">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 入力日 */}
          <div>
            <FieldLabel>入力日</FieldLabel>
            <input
              type="date"
              value={r.inputDate ?? ""}
              onChange={(e) =>
                handleChange("inputDate", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 性別 */}
          <div>
            <FieldLabel>性別</FieldLabel>
            <select
              value={r.gender ?? ""}
              onChange={(e) =>
                handleChange("gender", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 年代 */}
          <div>
            <FieldLabel>年代</FieldLabel>
            <select
              value={r.ageBand ?? ""}
              onChange={(e) =>
                handleChange("ageBand", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_AGE_BAND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 一番気になる項目 */}
          <div>
            <FieldLabel>一番気になる項目</FieldLabel>
            <select
              value={r.topConcern ?? ""}
              onChange={(e) =>
                handleChange("topConcern", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_CONCERN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 【その他】気になる項目 直接入力 */}
        <div className="mt-4">
          <FieldLabel>【その他】気になる項目 直接入力</FieldLabel>
          <input
            type="text"
            value={r.otherConcernFree ?? ""}
            onChange={(e) =>
              handleChange("otherConcernFree", e.target.value || undefined)
            }
            placeholder="直接入力"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* その他気になる項目（4行）*/}
        <div className="mt-4">
          <FieldLabel>その他気になる項目①〜④</FieldLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <input
                key={idx}
                type="text"
                value={otherConcerns[idx] ?? ""}
                onChange={(e) => handleOtherConcern(idx, e.target.value)}
                placeholder={`その他気になる項目${["①", "②", "③", "④"][idx]}`}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
