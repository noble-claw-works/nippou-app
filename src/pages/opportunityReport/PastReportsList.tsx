import type { OpportunityActivityReport } from "../../types";
import { ACTIVITY_TYPE_OPTIONS } from "./constants";

interface PastReportsListProps {
  reports: OpportunityActivityReport[];
}

export function PastReportsList({ reports }: PastReportsListProps) {
  if (reports.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-500">この案件の過去報告</h2>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
        {reports.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-400">{r.reportDate}</span>
              <span className="text-xs text-gray-400">
                {
                  ACTIVITY_TYPE_OPTIONS.find((o) => o.value === r.activityType)
                    ?.label
                }
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{r.summary}</p>
            {r.nextAction && (
              <p className="text-xs text-blue-600 mt-0.5">→ {r.nextAction}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
