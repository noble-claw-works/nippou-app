import { useAppStore } from "../../store";

export function AuditLogTab() {
  const { auditLogs, users } = useAppStore();
  const sorted = [...auditLogs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <div>
      <div className="space-y-2">
        {sorted.map((log) => {
          const user = users.find((u) => u.id === log.userId);
          return (
            <div
              key={log.id}
              className="p-3 bg-white rounded-xl border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                  {user?.avatarInitials ?? "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {user?.name ?? log.userId}
                    </span>
                    <span className="text-sm text-gray-700">{log.action}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${log.result === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {log.result === "success" ? "成功" : "失敗"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.createdAt.slice(0, 16).replace("T", " ")} · IP:{" "}
                    {log.ip}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
