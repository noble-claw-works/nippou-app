// MemberDetailPage.tsx — 社員詳細（User）3列レイアウト
// 左: 基本情報 / 中: 担当タスク横断 / 右: 活動履歴

import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { useAppStore } from "../store";
import { ROLE_LABELS } from "../utils";
import { getManagersOf } from "../utils/orgChart";
import type { Task } from "../types/task";
import type { RenewalActivityLog } from "../types/renewal";
import type { CustomerInteraction } from "../types/customerInteraction";

// ─── タスク由来ラベル ─────────────────────────────────────────────────────────

type TaskOrigin = {
  label: string;
  color: string;
};

function getTaskOrigin(scope: Task["scope"]): TaskOrigin {
  switch (scope) {
    case "household":
      return { label: "世帯", color: "bg-blue-100 text-blue-700" };
    case "opportunity":
      return { label: "商談", color: "bg-green-100 text-green-700" };
    case "product":
      return { label: "商品", color: "bg-purple-100 text-purple-700" };
    case "renewal":
      return { label: "更新", color: "bg-orange-100 text-orange-700" };
    default:
      return { label: "その他", color: "bg-gray-100 text-gray-600" };
  }
}

// ─── 活動履歴統合型 ──────────────────────────────────────────────────────────

type ActivityEntry = {
  id: string;
  at: string; // ISO datetime or YYYY-MM-DD
  label: string; // 種別表示
  body: string; // 内容
  color: string; // バッジ色
};

// ─── 日付フォーマット ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── ステータスバッジ ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "有効", color: "bg-green-100 text-green-700" },
  inactive: { label: "無効", color: "bg-red-100 text-red-700" },
  invited: { label: "招待中", color: "bg-yellow-100 text-yellow-700" },
};

// ─── MemberDetailPage ────────────────────────────────────────────────────────

export function MemberDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const {
    users,
    teams,
    customers,
    opportunities,
    renewalCases,
    customerInteractions,
    reports,
  } = useAppStore();

  const user = users.find((u) => u.id === userId);

  // ─── ユーザーが存在しない場合 ────────────────────────────────────────────

  if (!user) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        <p className="text-2xl mb-2">🔍</p>
        <p className="text-sm">社員が見つかりません</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:underline mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
      </div>
    );
  }

  // ─── 所属チーム ──────────────────────────────────────────────────────────

  const userTeams = teams.filter((t) => user.teamIds.includes(t.id));

  // ─── 上長 ────────────────────────────────────────────────────────────────

  const managers = getManagersOf(user.id, users, teams);

  // ─── 担当タスク横断集計 ──────────────────────────────────────────────────
  // customers[].tasks(scope household/product) + opportunities[].tasks + renewalCases[].tasks

  type EnrichedTask = Task & { originLabel: string; originColor: string };

  const assignedTasks: EnrichedTask[] = [];

  // 世帯タスク (customers[].tasks)
  for (const c of customers) {
    for (const t of c.tasks ?? []) {
      if (t.ownerId === user.id) {
        const origin = getTaskOrigin(t.scope);
        assignedTasks.push({ ...t, originLabel: origin.label, originColor: origin.color });
      }
    }
  }

  // 商談タスク (opportunities[].tasks)
  for (const o of opportunities) {
    for (const t of o.tasks ?? []) {
      if (t.ownerId === user.id) {
        const origin = getTaskOrigin(t.scope);
        assignedTasks.push({ ...t, originLabel: origin.label, originColor: origin.color });
      }
    }
  }

  // 更新案件タスク (renewalCases[].tasks)
  for (const r of renewalCases) {
    for (const t of r.tasks ?? []) {
      if (t.ownerId === user.id) {
        const origin = getTaskOrigin(t.scope);
        assignedTasks.push({ ...t, originLabel: origin.label, originColor: origin.color });
      }
    }
  }

  // 未完了→完了 の順にソート
  assignedTasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    // 同じ完了状態内: 期限日の昇順
    const da = a.dueDate ?? "9999-99-99";
    const db = b.dueDate ?? "9999-99-99";
    return da.localeCompare(db);
  });

  // ─── 活動履歴統合 ────────────────────────────────────────────────────────
  // renewalCases[].activityLog (byUserId===user.id)
  // customerInteractions (byUserId===user.id)
  // reports (日報, userId===user.id)

  const activities: ActivityEntry[] = [];

  // 更新案件の活動ログ
  for (const r of renewalCases) {
    for (const log of r.activityLog ?? []) {
      const l = log as RenewalActivityLog;
      if (l.byUserId === user.id) {
        activities.push({
          id: `renewal-${l.id}`,
          at: l.at,
          label: "更新",
          body: l.body,
          color: "bg-orange-100 text-orange-700",
        });
      }
    }
  }

  // 世帯対応記録
  for (const ci of customerInteractions) {
    const c = ci as CustomerInteraction;
    if (c.byUserId === user.id) {
      activities.push({
        id: `interaction-${c.id}`,
        at: c.occurredAt,
        label: "対応",
        body: c.summary,
        color: "bg-blue-100 text-blue-700",
      });
    }
  }

  // 日報
  for (const rep of reports) {
    if (rep.userId === user.id) {
      activities.push({
        id: `report-${rep.id}`,
        at: rep.date,
        label: "日報",
        body: rep.mainTheme ? `日報: ${rep.mainTheme}` : `日報 (${rep.date})`,
        color: "bg-gray-100 text-gray-600",
      });
    }
  }

  // 新しい順にソート
  activities.sort((a, b) => b.at.localeCompare(a.at));

  // ─── ステータス表示 ──────────────────────────────────────────────────────

  const statusInfo = STATUS_LABEL[user.status] ?? {
    label: user.status,
    color: "bg-gray-100 text-gray-600",
  };

  // ─── 役職 ────────────────────────────────────────────────────────────────

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  // ─── レンダリング ─────────────────────────────────────────────────────────

  const doneTasks = assignedTasks.filter((t) => t.done);
  const pendingTasks = assignedTasks.filter((t) => !t.done);

  return (
    <div className="flex h-full min-h-0">
      {/* ─── 左カラム: 基本情報 ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* 戻るボタン */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> 戻る
          </button>

          {/* ヘッダーカード */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center gap-4">
              {/* アバター */}
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 flex-shrink-0">
                {user.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          {/* 基本情報セクション */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">基本情報</h2>
            <dl className="grid grid-cols-1 gap-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-gray-400">ロール</dt>
                <dd className="text-gray-800 font-medium">{roleLabel}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-gray-400">メール</dt>
                <dd className="text-gray-800">{user.email}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-gray-400">所属チーム</dt>
                <dd className="text-gray-800">
                  {userTeams.length > 0
                    ? userTeams.map((t) => t.name).join("、")
                    : <span className="text-gray-400">未所属</span>}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-gray-400">上長</dt>
                <dd className="text-gray-800">
                  {managers.length > 0
                    ? managers.map((m) => m.name).join("、")
                    : <span className="text-gray-400">上長未設定</span>}
                </dd>
              </div>
              {user.lastLogin && (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-gray-400">最終ログイン</dt>
                  <dd className="text-gray-800">{formatDate(user.lastLogin)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* チーム詳細セクション */}
          {userTeams.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">所属チーム詳細</h2>
              <div className="space-y-3">
                {userTeams.map((team) => {
                  const teamManagers = team.managerIds
                    .map((mid) => users.find((u) => u.id === mid))
                    .filter(Boolean);
                  return (
                    <div key={team.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="font-medium text-gray-800 text-sm">{team.name}</div>
                      {team.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        チームマネージャー:{" "}
                        {teamManagers.length > 0
                          ? teamManagers.map((m) => m!.name).join("、")
                          : "未設定"}
                      </p>
                      <p className="text-xs text-gray-400">
                        メンバー数: {team.memberIds.length}名
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* モバイル: タスク (lg未満) */}
          <div className="lg:hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                ☑️ 担当タスク ({pendingTasks.length}/{assignedTasks.length})
              </h2>
              {assignedTasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">担当タスクなし</p>
              ) : (
                <div className="space-y-2">
                  {assignedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <span
                        className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-sm border flex items-center justify-center ${
                          t.done
                            ? "border-green-400 bg-green-50 text-green-500"
                            : "border-gray-300"
                        }`}
                      >
                        {t.done && "✓"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block truncate ${
                            t.done ? "line-through text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`px-1.5 py-0 rounded-full text-[10px] ${t.originColor}`}>
                            {t.originLabel}
                          </span>
                          {t.dueDate && (
                            <span className="text-gray-400">{t.dueDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* モバイル: 活動履歴 (lg未満) */}
          <div className="lg:hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  📅 活動履歴 ({activities.length}件)
                </h2>
                {activities.length > 0 && (
                  <span className="text-xs text-gray-400">新しい順</span>
                )}
              </div>
              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">活動履歴なし</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <div key={a.id} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1.5 rounded-full text-[10px] ${a.color}`}>
                          {a.label}
                        </span>
                        <span className="text-gray-400">{formatDate(a.at)}</span>
                      </div>
                      <p className="text-gray-700 line-clamp-2">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 中間カラム: 担当タスク (lg以上) ─── */}
      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto min-h-0">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">
            ☑️ 担当タスク ({pendingTasks.length}/{assignedTasks.length})
          </h2>
        </div>
        <div className="flex-1 px-4 py-3">
          {assignedTasks.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">担当タスクなし</p>
          ) : (
            <div className="space-y-1.5">
              {/* 未完了タスク */}
              {pendingTasks.length > 0 && (
                <div>
                  {pendingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2 text-xs py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-sm border border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-gray-700">{t.title}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`px-1.5 rounded-full text-[10px] ${t.originColor}`}>
                            {t.originLabel}
                          </span>
                          {t.dueDate && (
                            <span className="text-gray-400">{t.dueDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* 完了タスク */}
              {doneTasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-[10px] font-medium text-gray-400 mb-1.5">完了済み</div>
                  {doneTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2 text-xs py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-sm border border-green-400 bg-green-50 text-green-500 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate line-through text-gray-300">
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`px-1.5 rounded-full text-[10px] ${t.originColor}`}>
                            {t.originLabel}
                          </span>
                          {t.dueDate && (
                            <span className="text-gray-400">{t.dueDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ─── 右カラム: 活動履歴 (lg以上) ─── */}
      <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto min-h-0">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              📅 活動履歴 ({activities.length}件)
            </h2>
            {activities.length > 0 && (
              <span className="text-xs text-gray-400">新しい順</span>
            )}
          </div>
        </div>
        <div className="flex-1 px-4 py-3">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">活動履歴なし</p>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="text-xs border-l-2 border-gray-200 pl-3 py-1.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-1.5 rounded-full text-[10px] font-medium ${a.color}`}>
                      {a.label}
                    </span>
                    <span className="text-gray-400">{formatDate(a.at)}</span>
                  </div>
                  <p className="text-gray-700 line-clamp-3">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// Eye アイコンは導線用の参照として再エクスポート (使わなければ削除可)
export { Eye };
