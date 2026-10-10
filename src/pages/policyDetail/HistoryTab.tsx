import type { PolicyStatusHistory, User } from "../../types";
import { PolicyStatusBadge } from "../../components/policy/PolicyStatusBadge";

interface HistoryTabProps {
  entries: PolicyStatusHistory[];
  users: User[];
}

export function HistoryTab({ entries, users }: HistoryTabProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        履歴がありません
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((h) => {
        const changedBy = users.find((u) => u.id === h.changedByUserId);
        return (
          <div
            key={h.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3"
          >
            <div className="mt-0.5">
              <PolicyStatusBadge status={h.status} size="sm" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">
                {h.changedAt.slice(0, 10)} {h.changedAt.slice(11, 16)}
                {changedBy && ` · ${changedBy.name}`}
              </p>
              {h.note && (
                <p className="text-sm text-gray-700 mt-0.5">{h.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
