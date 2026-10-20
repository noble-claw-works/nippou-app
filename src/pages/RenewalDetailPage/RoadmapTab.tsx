// RoadmapTab — renewal3 ロードマップチラシ（ヒアリング）（編集→保存ボタン式）
import { useState } from "react";
import type { RenewalCase, RenewalSurvey } from "../../types";
import type { RenewalRoadmapSurvey } from "../../types/renewal";
import {
  RENEWAL_GENDER_OPTIONS,
  RENEWAL_AGE_BAND_OPTIONS,
  RENEWAL_CONCERN_OPTIONS,
} from "../../utils/renewalLabels";
import { RoadmapVersionedSection } from "./RoadmapVersionedSection";

interface RoadmapTabProps {
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

export function RoadmapTab({ rc, onSurveyChange, onCommit }: RoadmapTabProps) {
  const r = rc.survey.roadmap ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<RenewalRoadmapSurvey>>({});

  const handleEdit = () => {
    setDraft({ ...r });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft({});
  };

  const handleSave = () => {
    onSurveyChange({ roadmap: draft });
    onCommit?.("ロードマップアンケートを保存しました");
    setEditing(false);
    setDraft({});
  };

  const handleChange = (field: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleOtherConcern = (idx: number, value: string) => {
    const current = (editing ? draft.otherConcerns : r.otherConcerns) ?? ["", "", "", ""];
    const next = [...current];
    next[idx] = value;
    setDraft((prev) => ({ ...prev, otherConcerns: next }));
  };

  const display = editing ? { ...r, ...draft } : r;
  const otherConcerns = display.otherConcerns ?? ["", "", "", ""];

  return (
    <div className="space-y-4">
      {/* 版管理対応ロードマップ回答（T5-07 §5） */}
      <SectionCard title="ロードマップ（版管理）">
        <RoadmapVersionedSection rc={rc} />
      </SectionCard>

      {/* ロードマップチラシ（ヒアリング・旧式）— 編集→保存ボタン式 */}
      <SectionCard title="ロードマップチラシ（ヒアリング・旧式）">
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
          {/* 入力日 */}
          <div>
            <FieldLabel>入力日</FieldLabel>
            <input
              type="date"
              value={display.inputDate ?? ""}
              onChange={(e) =>
                editing && handleChange("inputDate", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* 性別 */}
          <div>
            <FieldLabel>性別</FieldLabel>
            <select
              value={display.gender ?? ""}
              onChange={(e) =>
                editing && handleChange("gender", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
              value={display.ageBand ?? ""}
              onChange={(e) =>
                editing && handleChange("ageBand", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
              value={display.topConcern ?? ""}
              onChange={(e) =>
                editing && handleChange("topConcern", e.target.value || undefined)
              }
              disabled={!editing}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
            value={display.otherConcernFree ?? ""}
            onChange={(e) =>
              editing && handleChange("otherConcernFree", e.target.value || undefined)
            }
            disabled={!editing}
            placeholder="直接入力"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
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
                onChange={(e) => editing && handleOtherConcern(idx, e.target.value)}
                disabled={!editing}
                placeholder={`その他気になる項目${["①", "②", "③", "④"][idx]}`}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
              />
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
