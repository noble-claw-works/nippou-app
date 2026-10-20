import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "../store";
import { ForbiddenState } from "../components/ui/EmptyState";
import { UsersTab } from "../components/admin/UsersTab";
import { TeamsTab } from "../components/admin/TeamsTab";
import { AuditLogTab } from "./admin/AuditLogTab";
import { TaskTemplatesTab } from "./admin/TaskTemplatesTab";
import { RoadmapTemplateTab } from "./admin/RoadmapTemplateTab";
import { isAdmin } from "../utils/roles";

type AdminTab = "users" | "teams" | "audit" | "task_templates" | "roadmap";

const ALL_TABS: { id: AdminTab; label: string }[] = [
  { id: "users", label: "👥 ユーザー" },
  { id: "teams", label: "🏢 チーム" },
  { id: "audit", label: "📜 監査ログ" },
  { id: "task_templates", label: "☑️ タスク初期値" },
  { id: "roadmap", label: "🗺️ ロードマップ項目" },
];

export function AdminPage() {
  const { currentRole } = useAppStore();
  const [searchParams] = useSearchParams();

  // ロール別に表示可能タブを決定。
  // - admin/executive: 既存4タブ + ロードマップ
  // - manager: ロードマップのみ（編集可）
  const isManager = isAdmin(currentRole);
  const isAdminOrExec = ["admin", "executive"].includes(currentRole);

  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.id === "roadmap") return isAdminOrExec || isManager;
    return isAdminOrExec;
  });

  const _initialTab = searchParams.get("tab") as AdminTab | null;
  const defaultTab = visibleTabs[0]?.id ?? "roadmap";
  const [activeTab, setActiveTab] = useState<AdminTab>(
    _initialTab && visibleTabs.some((t) => t.id === _initialTab)
      ? _initialTab
      : defaultTab,
  );

  // admin/executive でも manager でもなければ Forbidden
  if (!isAdminOrExec && !isManager) {
    return (
      <div className="px-4 py-8">
        <ForbiddenState />
      </div>
    );
  }

  // activeTab が表示可能タブに無い場合は先頭にフォールバック
  const safeTab = visibleTabs.some((t) => t.id === activeTab)
    ? activeTab
    : defaultTab;

  // 既存管理系（users/teams/audit/task_templates）の編集権: admin のみ
  const canEditAdmin = currentRole === "admin";
  // ロードマップ項目の編集権: 管理者(manager)のみ（§0 確定事項⑤）
  const canEditRoadmap = isManager;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">管理</h1>
      {currentRole === "executive" && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。
        </div>
      )}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 w-fit flex-wrap">
        {visibleTabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              safeTab === id
                ? "bg-white shadow font-medium text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        {safeTab === "users" && <UsersTab canEdit={canEditAdmin} />}
        {safeTab === "teams" && <TeamsTab canEdit={canEditAdmin} />}
        {safeTab === "audit" && <AuditLogTab />}
        {safeTab === "task_templates" && (
          <TaskTemplatesTab canEdit={canEditAdmin} />
        )}
        {safeTab === "roadmap" && (
          <RoadmapTemplateTab canEdit={canEditRoadmap} />
        )}
      </div>
    </div>
  );
}
