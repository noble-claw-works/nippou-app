import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "../store";
import { ForbiddenState } from "../components/ui/EmptyState";
import { UsersTab } from "../components/admin/UsersTab";
import { TeamsTab } from "../components/admin/TeamsTab";
import { AuditLogTab } from "./admin/AuditLogTab";
import { TaskTemplatesTab } from "./admin/TaskTemplatesTab";

type AdminTab = "users" | "teams" | "audit" | "task_templates";

const TAB_LIST: { id: AdminTab; label: string }[] = [
  { id: "users", label: "👥 ユーザー" },
  { id: "teams", label: "🏢 チーム" },
  { id: "audit", label: "📜 監査ログ" },
  { id: "task_templates", label: "☑️ タスク初期値" },
];

export function AdminPage() {
  const { currentRole } = useAppStore();
  const [searchParams] = useSearchParams();
  const _initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<AdminTab>(
    _initialTab === "task_templates" ||
      _initialTab === "teams" ||
      _initialTab === "audit"
      ? _initialTab
      : "users",
  );

  // admin: 読み書き / executive: 読取専用 / それ以外: Forbidden
  if (!["admin", "executive"].includes(currentRole)) {
    return (
      <div className="px-4 py-8">
        <ForbiddenState />
      </div>
    );
  }

  const canEdit = currentRole === "admin";

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">管理</h1>
      {currentRole === "executive" && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。
        </div>
      )}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 w-fit flex-wrap">
        {TAB_LIST.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === id
                ? "bg-white shadow font-medium text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        {activeTab === "users" && <UsersTab canEdit={canEdit} />}
        {activeTab === "teams" && <TeamsTab canEdit={canEdit} />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "task_templates" && (
          <TaskTemplatesTab canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}
