// PolicyCollectTab — 証券回収（編集→保存ボタン式）
import { useState } from "react";
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { RenewalPolicyCollectSurvey } from "../../types/renewal";
import { RENEWAL_POLICY_COLLECT_OPTIONS } from "../../utils/renewalLabels";

interface PolicyCollectTabProps {
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

export function PolicyCollectTab({
  rc,
  onSurveyChange,
  onCommit,
}: PolicyCollectTabProps) {
  const pc = rc.survey.policyCollect ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<RenewalPolicyCollectSurvey>>({});

  const handleEdit = () => {
    setDraft({ ...pc });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft({});
  };

  const handleSave = () => {
    onSurveyChange({ policyCollect: draft });
    onCommit?.("証券回収アンケートを保存しました");
    setEditing(false);
    setDraft({});
  };

  const handleChange = (field: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const display = editing ? { ...pc, ...draft } : pc;

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

      <SectionCard title="証券回収">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 自動車 */}
          <div>
            <FieldLabel>自動車</FieldLabel>
            <select
              value={display.auto ?? ""}
              onChange={(e) =>
                editing && handleChange("auto", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
              value={display.fire ?? ""}
              onChange={(e) =>
                editing && handleChange("fire", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
              value={display.other ?? ""}
              onChange={(e) =>
                editing && handleChange("other", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">—</option>
              {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* その他: 自由入力（T5-06） */}
            <input
              type="text"
              value={display.otherFree ?? ""}
              onChange={(e) =>
                editing && handleChange("otherFree", e.target.value || undefined)
              }
              disabled={!editing}
              placeholder="その他の内容を自由入力"
              className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* 生保 */}
          <div>
            <FieldLabel>生保</FieldLabel>
            <select
              value={display.life ?? ""}
              onChange={(e) =>
                editing && handleChange("life", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
