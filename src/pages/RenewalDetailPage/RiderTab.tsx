// RiderTab — renewal4 特約追加・提案項目
import type {
  RenewalCase,
  RenewalSurvey,
  RenewalRiderSurvey,
} from "../../types";

interface RiderTabProps {
  rc: RenewalCase;
  onSurveyChange: (patch: Partial<RenewalSurvey>) => void;
}

interface CheckItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckItem({ id, label, checked, onChange }: CheckItemProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-gray-50 px-2 rounded-lg -mx-2"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
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

export function RiderTab({ rc, onSurveyChange }: RiderTabProps) {
  const rider = rc.survey.rider ?? {};

  const handleCheck = (field: keyof RenewalRiderSurvey, checked: boolean) => {
    onSurveyChange({ rider: { [field]: checked || undefined } });
  };

  return (
    <div className="space-y-4">
      {/* 自動車特約 */}
      <SectionCard title="【自動車】特約追加">
        <div className="space-y-0.5">
          <CheckItem
            id="autoRentaRider"
            label="【自動車】レンタ特約"
            checked={!!rider.autoRentaRider}
            onChange={(v) => handleCheck("autoRentaRider", v)}
          />
          <CheckItem
            id="autoVehicleCoverage"
            label="【自動車】車両"
            checked={!!rider.autoVehicleCoverage}
            onChange={(v) => handleCheck("autoVehicleCoverage", v)}
          />
          <CheckItem
            id="autoDapAttachOrSwitch"
            label="【自動車】DAP付帯または切替"
            checked={!!rider.autoDapAttachOrSwitch}
            onChange={(v) => handleCheck("autoDapAttachOrSwitch", v)}
          />
        </div>
      </SectionCard>

      {/* 提案・アクション */}
      <SectionCard title="提案・アクション">
        <div className="space-y-0.5">
          <CheckItem
            id="myPairApp"
            label="【マイペアプリ】"
            checked={!!rider.myPairApp}
            onChange={(v) => handleCheck("myPairApp", v)}
          />
          <CheckItem
            id="superInsurance"
            label="【超保険化】"
            checked={!!rider.superInsurance}
            onChange={(v) => handleCheck("superInsurance", v)}
          />
          <CheckItem
            id="officialLine"
            label="公式LINE登録"
            checked={!!rider.officialLine}
            onChange={(v) => handleCheck("officialLine", v)}
          />
          <CheckItem
            id="lifePlanProposed"
            label="ライフプラン提案＆実施"
            checked={!!rider.lifePlanProposed}
            onChange={(v) => handleCheck("lifePlanProposed", v)}
          />
          <CheckItem
            id="lifeInsProposed"
            label="生保提案"
            checked={!!rider.lifeInsProposed}
            onChange={(v) => handleCheck("lifeInsProposed", v)}
          />
          <CheckItem
            id="mortgageRefiProposed"
            label="住宅ローン借換提案"
            checked={!!rider.mortgageRefiProposed}
            onChange={(v) => handleCheck("mortgageRefiProposed", v)}
          />
          <CheckItem
            id="npsSurvey"
            label="NPSアンケート"
            checked={!!rider.npsSurvey}
            onChange={(v) => handleCheck("npsSurvey", v)}
          />
        </div>
      </SectionCard>
    </div>
  );
}
