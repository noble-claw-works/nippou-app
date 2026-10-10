// PolicyCollectTab — 証券回収
import type { RenewalCase, RenewalSurvey } from "../../types";
import { RENEWAL_POLICY_COLLECT_OPTIONS } from "../../utils/renewalLabels";

interface PolicyCollectTabProps {
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

export function PolicyCollectTab({
  rc,
  onSurveyChange,
}: PolicyCollectTabProps) {
  const pc = rc.survey.policyCollect ?? {};

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ policyCollect: { [field]: value } });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="証券回収">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 自動車 */}
          <div>
            <FieldLabel>自動車</FieldLabel>
            <select
              value={pc.auto ?? ""}
              onChange={(e) =>
                handleChange("auto", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 火災 */}
          <div>
            <FieldLabel>火災</FieldLabel>
            <select
              value={pc.fire ?? ""}
              onChange={(e) =>
                handleChange("fire", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* その他 */}
          <div>
            <FieldLabel>その他</FieldLabel>
            <select
              value={pc.other ?? ""}
              onChange={(e) =>
                handleChange("other", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 生保 */}
          <div>
            <FieldLabel>生保</FieldLabel>
            <select
              value={pc.life ?? ""}
              onChange={(e) =>
                handleChange("life", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
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
