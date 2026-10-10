// PairMtgTab — ペアMTG時入力
import type { RenewalCase, RenewalSurvey } from "../../types";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_SUPER_INS_LOSS_OPTIONS,
} from "../../utils/renewalLabels";

interface PairMtgTabProps {
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

export function PairMtgTab({ rc, onSurveyChange }: PairMtgTabProps) {
  const pm = rc.survey.pairMtg ?? {};

  const handleChange = (field: string, value: unknown) => {
    onSurveyChange({ pairMtg: { [field]: value } });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="ペアMTG時入力">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 予定手続き手段 */}
          <div>
            <FieldLabel>予定手続き手段</FieldLabel>
            <select
              value={pm.plannedMethod ?? ""}
              onChange={(e) =>
                handleChange("plannedMethod", e.target.value || undefined)
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

          {/* 超保険化損 */}
          <div>
            <FieldLabel>超保険化損</FieldLabel>
            <select
              value={pm.superInsuranceLoss ?? ""}
              onChange={(e) =>
                handleChange("superInsuranceLoss", e.target.value || undefined)
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">—</option>
              {RENEWAL_SUPER_INS_LOSS_OPTIONS.map((opt) => (
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
