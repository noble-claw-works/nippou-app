import { ChannelSelect } from "./ChannelSelect";

interface HouseholdHeaderSectionProps {
  personOptions: Array<{ id: string; name: string }>;
  headerContractorId: string;
  headerDate: string;
  headerChannelId: string;
  annualIncome: string;
  onContractorChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onChannelChange: (channelId: string) => void;
  onAnnualIncomeChange: (value: string) => void;
}

export function HouseholdHeaderSection({
  personOptions,
  headerContractorId,
  headerDate,
  headerChannelId,
  annualIncome,
  onContractorChange,
  onDateChange,
  onChannelChange,
  onAnnualIncomeChange,
}: HouseholdHeaderSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <h2 className="text-xs font-semibold text-gray-600 mb-3">
        📋 世帯共通情報（案件の既定値）
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 契約者 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            契約者
          </label>
          <select
            value={headerContractorId}
            onChange={(e) => onContractorChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">─ 選択してください ─</option>
            {personOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 商談日（既定） */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            商談日（既定）
          </label>
          <input
            type="date"
            value={headerDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* チャネル */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            チャネル（既定）
          </label>
          <ChannelSelect
            channelId={headerChannelId || undefined}
            onChange={onChannelChange}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            新規追加・複製時にこの値を既定として引き継ぎます
          </p>
        </div>

        {/* 年収 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            年収（円）
          </label>
          <input
            type="number"
            min={0}
            value={annualIncome}
            onChange={(e) => onAnnualIncomeChange(e.target.value)}
            placeholder="例: 6000000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
        </div>
      </div>
    </section>
  );
}
