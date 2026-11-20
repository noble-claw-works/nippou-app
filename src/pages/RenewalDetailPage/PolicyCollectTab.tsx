// PolicyCollectTab — 証券回収（編集→保存ボタン式）
// 項目9: 編集モード時は select → ラジオボタン群に変更
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

/** 編集モード: ラジオボタン群 */
function RadioGroup({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | undefined;
  onChange: (val: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
      {/* 空選択（—） */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="radio"
          name={name}
          value=""
          checked={!value}
          onChange={() => onChange(undefined)}
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className="text-sm text-gray-500">—</span>
      </label>
      {RENEWAL_POLICY_COLLECT_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="w-3.5 h-3.5 accent-blue-600"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

/** 表示モード: 選択済みラベルのテキスト表示（未選択は—） */
function DisplayValue({ value }: { value: string | undefined }) {
  const opt = RENEWAL_POLICY_COLLECT_OPTIONS.find((o) => o.value === value);
  return (
    <p className="text-sm text-gray-700 mt-1">{opt ? opt.label : "—"}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 自動車 */}
          <div>
            <FieldLabel>自動車</FieldLabel>
            {editing ? (
              <RadioGroup
                name="pc-auto"
                value={display.auto}
                onChange={(val) => handleChange("auto", val)}
              />
            ) : (
              <DisplayValue value={display.auto} />
            )}
          </div>

          {/* 火災 */}
          <div>
            <FieldLabel>火災</FieldLabel>
            {editing ? (
              <RadioGroup
                name="pc-fire"
                value={display.fire}
                onChange={(val) => handleChange("fire", val)}
              />
            ) : (
              <DisplayValue value={display.fire} />
            )}
          </div>

          {/* その他 */}
          <div>
            <FieldLabel>その他</FieldLabel>
            {editing ? (
              <RadioGroup
                name="pc-other"
                value={display.other}
                onChange={(val) => handleChange("other", val)}
              />
            ) : (
              <DisplayValue value={display.other} />
            )}
            {/* その他: 自由入力（T5-06）— 編集/表示両モードで維持 */}
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
            {editing ? (
              <RadioGroup
                name="pc-life"
                value={display.life}
                onChange={(val) => handleChange("life", val)}
              />
            ) : (
              <DisplayValue value={display.life} />
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
