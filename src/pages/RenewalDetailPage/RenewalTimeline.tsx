// RenewalTimeline — 対応履歴タイムライン（右サイドバー用）
import type { RenewalActivityLog, User } from "../../types";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

interface RenewalTimelineProps {
  logs: RenewalActivityLog[];
  users: User[];
}

const KIND_COLOR: Record<RenewalActivityLog["kind"], string> = {
  note: "border-l-yellow-400",
  status_change: "border-l-purple-400",
  survey_saved: "border-l-blue-400",
  contact: "border-l-green-400",
  task: "border-l-gray-400",
  other: "border-l-gray-200",
};

const KIND_DOT: Record<RenewalActivityLog["kind"], string> = {
  note: "border-yellow-400",
  status_change: "border-purple-400",
  survey_saved: "border-blue-400",
  contact: "border-green-400",
  task: "border-gray-400",
  other: "border-gray-300",
};

export function RenewalTimeline({ logs, users }: RenewalTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        対応履歴がありません
      </p>
    );
  }

  // 新しい順に表示
  const sorted = [...logs].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="relative pl-5">
      {/* タイムライン縦線 */}
      <div
        className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-3">
        {sorted.map((log) => {
          const user = users.find((u) => u.id === log.byUserId);
          return (
            <li key={log.id} className="relative">
              {/* ドット */}
              <span
                className={`absolute -left-[17px] top-2.5 w-3 h-3 rounded-full bg-white border-2 shadow-sm ${KIND_DOT[log.kind]}`}
                aria-hidden="true"
              />
              <div
                className={`border border-gray-200 border-l-4 ${KIND_COLOR[log.kind]} rounded-lg p-2.5 bg-white shadow-sm`}
              >
                <p className="text-xs text-gray-800 leading-relaxed break-words">
                  {log.body}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {format(parseISO(log.at), "MM/dd HH:mm", { locale: ja })}
                  {user && (
                    <span className="ml-1 text-gray-400">{user.name}</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
