// =====================================================
// PeriodSwitcher — 月次/四半期/年間 セグメント + 年ナビ
// =====================================================
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PeriodType } from '../../utils/salesPeriod';

interface Props {
  year: number;
  periodType: PeriodType;
  onYearChange: (year: number) => void;
  onPeriodTypeChange: (pt: PeriodType) => void;
}

const TABS: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: '月次' },
  { value: 'quarterly', label: '四半期' },
  { value: 'annual', label: '年間' },
];

export function PeriodSwitcher({ year, periodType, onYearChange, onPeriodTypeChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 年ナビ */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onYearChange(year - 1)}
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="前年"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800 min-w-[48px] text-center">
          {year}年
        </span>
        <button
          onClick={() => onYearChange(year + 1)}
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="翌年"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 期間タブ */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onPeriodTypeChange(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              periodType === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
