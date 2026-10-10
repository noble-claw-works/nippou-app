// =====================================================
// RenewalDetailPage — 更新案件詳細
// アンケート入力（renewal2〜4）+ 留意事項 + タスク + 対応履歴タイムライン
// 全幅レイアウト (DESIGN_GUIDE.md 全幅原則準拠)
// =====================================================
import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RefreshCw,
  FileText,
  Map,
  Star,
  Clock,
  CheckSquare,
  Users,
  CalendarClock,
  FolderCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import type { RenewalCase, RenewalSurvey } from "../types";
import {
  RENEWAL_STATUS_OPTIONS,
  RENEWAL_PRODUCT_TYPE_LABEL,
} from "../utils/renewalLabels";
import { ConsultTab } from "./RenewalDetailPage/ConsultTab";
import { RoadmapTab } from "./RenewalDetailPage/RoadmapTab";
import { RiderTab } from "./RenewalDetailPage/RiderTab";
import { PairMtgTab } from "./RenewalDetailPage/PairMtgTab";
import { PolicyCollectTab } from "./RenewalDetailPage/PolicyCollectTab";
import { NotesSection } from "./RenewalDetailPage/NotesSection";
import { TasksSection } from "./RenewalDetailPage/TasksSection";
import { RenewalTimeline } from "./RenewalDetailPage/RenewalTimeline";

type Tab =
  "consult" | "roadmap" | "rider" | "pairmtg" | "policycollect" | "tasks";

const STATUS_COLOR: Record<RenewalCase["status"], string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export function RenewalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    renewalCases,
    users,
    saveRenewalSurvey,
    addRenewalNote,
    changeRenewalStatus,
    addRenewalTask,
    toggleRenewalTaskDone,
    removeRenewalTask,
    currentUserId,
  } = useAppStore(
    useShallow((s) => ({
      renewalCases: s.renewalCases,
      users: s.users,
      saveRenewalSurvey: s.saveRenewalSurvey,
      addRenewalNote: s.addRenewalNote,
      changeRenewalStatus: s.changeRenewalStatus,
      addRenewalTask: s.addRenewalTask,
      toggleRenewalTaskDone: s.toggleRenewalTaskDone,
      removeRenewalTask: s.removeRenewalTask,
      currentUserId: s.currentUserId,
    })),
  );

  const rc = id ? renewalCases.find((c) => c.id === id) : undefined;
  const [tab, setTab] = useState<Tab>("consult");

  // 算出値（満期日 - FC日 / 満期日 - 更改日）
  const daysToMaturity = rc
    ? differenceInCalendarDays(parseISO(rc.maturityDate), new Date())
    : null;

  const daysFcToMaturity = rc?.survey.consult?.firstContactDate
    ? differenceInCalendarDays(
        parseISO(rc.maturityDate),
        parseISO(rc.survey.consult.firstContactDate),
      )
    : null;

  const daysProcToMaturity = rc?.survey.consult?.procedureDate
    ? differenceInCalendarDays(
        parseISO(rc.maturityDate),
        parseISO(rc.survey.consult.procedureDate),
      )
    : null;

  const ownerUser = rc ? users.find((u) => u.id === rc.ownerUserId) : undefined;

  const handleSurveyChange = useCallback(
    (patch: Partial<RenewalSurvey>) => {
      if (!id) return;
      saveRenewalSurvey(id, patch);
    },
    [id, saveRenewalSurvey],
  );

  if (!rc) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>更新案件が見つかりません</p>
        <button
          onClick={() => navigate("/renewals")}
          className="mt-2 text-blue-500 hover:underline text-sm"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const TAB_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "pairmtg",
      label: "ペアMTG時入力",
      icon: <CalendarClock className="w-4 h-4" />,
    },
    {
      key: "consult",
      label: "コンサル入力",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "roadmap",
      label: "ロードマップ・ヒアリング",
      icon: <Map className="w-4 h-4" />,
    },
    {
      key: "rider",
      label: "特約追加・提案",
      icon: <Star className="w-4 h-4" />,
    },
    {
      key: "policycollect",
      label: "証券回収",
      icon: <FolderCheck className="w-4 h-4" />,
    },
    {
      key: "tasks",
      label: "タスク",
      icon: <CheckSquare className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-full min-h-full">
      {/* ── ページヘッダー ───────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/renewals")}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="一覧に戻る"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {rc.contractorName}
                {rc.groupName && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {rc.groupName}
                  </span>
                )}
              </h1>
              {/* ステータスバッジ（クリックで変更） */}
              <select
                value={rc.status}
                onChange={(e) => {
                  if (!id) return;
                  changeRenewalStatus(
                    id,
                    e.target.value as RenewalCase["status"],
                    currentUserId,
                  );
                }}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-300 ${STATUS_COLOR[rc.status]}`}
              >
                {RENEWAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* M2: 世帯情報リンク */}
              <Link
                to={`/households/${rc.householdId}`}
                className="ml-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Users className="w-3.5 h-3.5" />
                世帯情報を見る
              </Link>
            </div>
            {/* メタ情報行 */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
              <span>
                <span className="text-gray-400">担当:</span>{" "}
                {ownerUser?.name ?? "—"}
              </span>
              <span>
                <span className="text-gray-400">保険会社:</span> {rc.insurer}
              </span>
              <span>
                <span className="text-gray-400">種目:</span>{" "}
                {RENEWAL_PRODUCT_TYPE_LABEL[rc.productType]}
              </span>
              <span>
                <span className="text-gray-400">満期日:</span>{" "}
                <span
                  className={
                    daysToMaturity !== null && daysToMaturity <= 60
                      ? "text-orange-600 font-medium"
                      : ""
                  }
                >
                  {rc.maturityDate}
                  {daysToMaturity !== null && (
                    <span className="ml-1">
                      (
                      {daysToMaturity <= 0
                        ? "期限切れ"
                        : `${daysToMaturity}日後`}
                      )
                    </span>
                  )}
                </span>
              </span>
              {rc.prevYearPremium != null && (
                <span>
                  <span className="text-gray-400">前年保険料:</span> ¥
                  {rc.prevYearPremium.toLocaleString()}
                </span>
              )}
              {daysFcToMaturity !== null && (
                <span>
                  <span className="text-gray-400">満期日-FC日:</span>{" "}
                  {daysFcToMaturity}日
                </span>
              )}
              {daysProcToMaturity !== null && (
                <span>
                  <span className="text-gray-400">満期日-更改日:</span>{" "}
                  {daysProcToMaturity}日
                </span>
              )}
            </div>
          </div>
        </div>

        {/* タブバー */}
        <nav className="flex gap-1 mt-3 -mb-px">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === item.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── メインコンテンツ + 右サイドバー ─────── */}
      <div className="flex min-h-[calc(100vh-180px)]">
        {/* 左: アンケート + 留意事項 + タスク */}
        <div className="flex-1 min-w-0 p-6 space-y-6">
          {/* アンケートタブ */}
          {tab === "consult" && (
            <ConsultTab rc={rc} onSurveyChange={handleSurveyChange} />
          )}
          {tab === "roadmap" && (
            <RoadmapTab rc={rc} onSurveyChange={handleSurveyChange} />
          )}
          {tab === "rider" && (
            <RiderTab rc={rc} onSurveyChange={handleSurveyChange} />
          )}
          {tab === "pairmtg" && (
            <PairMtgTab rc={rc} onSurveyChange={handleSurveyChange} />
          )}
          {tab === "policycollect" && (
            <PolicyCollectTab rc={rc} onSurveyChange={handleSurveyChange} />
          )}

          {/* 留意事項（常時表示） */}
          {id &&
            (tab === "consult" ||
              tab === "roadmap" ||
              tab === "rider" ||
              tab === "pairmtg" ||
              tab === "policycollect") && (
              <NotesSection
                rc={rc}
                onAddNote={(body) => addRenewalNote(id, body, currentUserId)}
              />
            )}

          {/* タスクタブ */}
          {tab === "tasks" && id && (
            <TasksSection
              rc={rc}
              onAddTask={(task) => addRenewalTask(id, task)}
              onToggleDone={(taskId, done) =>
                toggleRenewalTaskDone(id, taskId, done)
              }
              onRemoveTask={(taskId) => removeRenewalTask(id, taskId)}
            />
          )}
        </div>

        {/* 右: 対応履歴タイムライン */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50/50 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            対応履歴
          </h3>
          <RenewalTimeline logs={rc.activityLog} users={users} />
        </aside>
      </div>
    </div>
  );
}

// Re-export used types so sub-components can import from parent
export type { Tab };
