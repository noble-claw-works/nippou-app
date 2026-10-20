// PairMtgTab — ペアMTG時入力（編集→保存ボタン式）
import { useState } from "react";
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { RenewalPairMtgSurvey } from "../../types/renewal";
import {
  RENEWAL_METHOD_OPTIONS,
  RENEWAL_SUPER_INS_LOSS_OPTIONS,
} from "../../utils/renewalLabels";

interface PairMtgTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
  onCommit?: (logBody?: string) => void;
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

export function PairMtgTab({ rc, onSurveyChange, onCommit }: PairMtgTabProps) {
  const pm = rc.survey.pairMtg ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<RenewalPairMtgSurvey>>({});

  const handleEdit = () => {
    setDraft({ ...pm });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft({});
  };

  const handleSave = () => {
    onSurveyChange({ pairMtg: draft });
    onCommit?.("ペアMTGアンケートを保存しました");
    setEditing(false);
    setDraft({});
  };

  const handleChange = (field: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const display = editing ? { ...pm, ...draft } : pm;

  return (
    <div className="space-y-4">
      {/* 操作ボタン行 */}
      <div className="flex justify-end gap-2">
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

      <SectionCard title="ペアMTG時入力">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 予定手続き手段 */}
          <div>
            <FieldLabel>予定手続き手段</FieldLabel>
            <select
              value={display.plannedMethod ?? ""}
              onChange={(e) =>
                editing && handleChange("plannedMethod", e.target.value || undefined)
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

          {/* 超保険化損 */}
          <div>
            <FieldLabel>超保険化提案</FieldLabel>
            <select
              value={display.superInsuranceLoss ?? ""}
              onChange={(e) =>
                editing && handleChange("superInsuranceLoss", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
