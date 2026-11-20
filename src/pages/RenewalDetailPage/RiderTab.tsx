// RiderTab — renewal4 特約追加・提案項目（編集→保存ボタン式）
import { useState } from "react";
import type {
  RenewalCase,
  RenewalSurvey,
  RenewalRiderSurvey,
} from "../../types";

interface RiderTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
  onCommit?: (logBody?: string) => void;
}

interface CheckItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckItem({ id, label, checked, onChange, disabled }: CheckItemProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 py-2 px-2 rounded-lg -mx-2 ${disabled ? "cursor-default opacity-70" : "cursor-pointer hover:bg-gray-50"}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-300"
      />
      <span className="text-sm text-gray-700">{label}</span>
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
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function RiderTab({ rc, onSurveyChange, onCommit }: RiderTabProps) {
  const rider = rc.survey.rider ?? {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RenewalRiderSurvey>({ ...rider });

  const handleEdit = () => {
    setDraft({ ...(rc.survey.rider ?? {}) });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft({ ...(rc.survey.rider ?? {}) });
  };

  const handleSave = () => {
    onSurveyChange({ rider: draft });
    onCommit?.("特約・提案アンケートを保存しました");
    setEditing(false);
  };

  const handleCheck = (field: keyof RenewalRiderSurvey, checked: boolean) => {
    setDraft((prev) => ({ ...prev, [field]: checked || undefined }));
  };

  const displayRider = editing ? draft : rider;

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

      {/* 自動車特約 */}
      <SectionCard title="【自動車】特約追加">
        <div className="space-y-0.5">
          <CheckItem
            id="autoRentaRider"
            label="【自動車】レンタ特約"
            checked={!!displayRider.autoRentaRider}
            onChange={(v) => handleCheck("autoRentaRider", v)}
            disabled={!editing}
          />
          <CheckItem
            id="autoVehicleCoverage"
            label="【自動車】車両"
            checked={!!displayRider.autoVehicleCoverage}
            onChange={(v) => handleCheck("autoVehicleCoverage", v)}
            disabled={!editing}
          />
          <CheckItem
            id="autoDapAttachOrSwitch"
            label="【自動車】DAP付帯または切替"
            checked={!!displayRider.autoDapAttachOrSwitch}
            onChange={(v) => handleCheck("autoDapAttachOrSwitch", v)}
            disabled={!editing}
          />
        </div>
      </SectionCard>

      {/* 提案・アクション */}
      <SectionCard title="提案・アクション">
        <div className="space-y-0.5">
          <CheckItem
            id="myPairApp"
            label="【マイペアプリ】"
            checked={!!displayRider.myPairApp}
            onChange={(v) => handleCheck("myPairApp", v)}
            disabled={!editing}
          />
          <CheckItem
            id="superInsurance"
            label="【超保険化】"
            checked={!!displayRider.superInsurance}
            onChange={(v) => handleCheck("superInsurance", v)}
            disabled={!editing}
          />
          <CheckItem
            id="officialLine"
            label="公式LINE登録"
            checked={!!displayRider.officialLine}
            onChange={(v) => handleCheck("officialLine", v)}
            disabled={!editing}
          />
          <CheckItem
            id="lifePlanProposed"
            label="ライフプラン提案＆実施"
            checked={!!displayRider.lifePlanProposed}
            onChange={(v) => handleCheck("lifePlanProposed", v)}
            disabled={!editing}
          />
          <CheckItem
            id="lifeInsProposed"
            label="生保提案"
            checked={!!displayRider.lifeInsProposed}
            onChange={(v) => handleCheck("lifeInsProposed", v)}
            disabled={!editing}
          />
          <CheckItem
            id="mortgageRefiProposed"
            label="住宅ローン借換提案"
            checked={!!displayRider.mortgageRefiProposed}
            onChange={(v) => handleCheck("mortgageRefiProposed", v)}
            disabled={!editing}
          />
          <CheckItem
            id="npsSurvey"
            label="NPSアンケート"
            checked={!!displayRider.npsSurvey}
            onChange={(v) => handleCheck("npsSurvey", v)}
            disabled={!editing}
          />
        </div>
      </SectionCard>
    </div>
  );
}
