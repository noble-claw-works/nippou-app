// =====================================================
// renewalSlice — 更新案件 (RenewalCase) CRUD
// localStorage: nippou.renewalCases.v1
// =====================================================
import type { StateCreator } from "zustand";
import type {
  AppState,
  RenewalCase,
  RenewalSurvey,
  Task,
} from "../_internal/types";
import { uid } from "../_internal/constants";
import type {
  RenewalStatus,
  RenewalLogKind,
  RenewalActivityLog,
  RenewalNote,
} from "../../types/renewal";

const STORAGE_KEY = "nippou.renewalCases.v1";

function persist(cases: RenewalCase[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    }
  } catch {
    /* ignore */
  }
}

function makeLog(
  kind: RenewalLogKind,
  body: string,
  userId: string,
): RenewalActivityLog {
  return {
    id: uid(),
    kind,
    body,
    byUserId: userId,
    at: new Date().toISOString(),
  };
}

export const createRenewalSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "getRenewalCases"
    | "getRenewalCaseById"
    | "saveRenewalSurvey"
    | "addRenewalNote"
    | "addRenewalLog"
    | "changeRenewalStatus"
    | "addRenewalTask"
    | "updateRenewalTask"
    | "toggleRenewalTaskDone"
    | "removeRenewalTask"
    | "importRenewalCases"
  >
> = (set, get) => ({
  getRenewalCases: (opts) => {
    const state = get();
    let cases = [...state.renewalCases];

    // ロール別フィルタ
    if (opts?.role && opts?.userId) {
      const { role, userId } = opts;
      if (role === "general") {
        cases = cases.filter((rc) => rc.ownerUserId === userId);
      } else if (role === "manager") {
        const myTeamUserIds = state.users
          .filter((u) =>
            u.teamIds.some((tid) =>
              state.users.find((m) => m.id === userId)?.teamIds.includes(tid),
            ),
          )
          .map((u) => u.id);
        cases = cases.filter(
          (rc) =>
            myTeamUserIds.includes(rc.ownerUserId) || rc.ownerUserId === userId,
        );
      }
      // executive/admin: 全件
    }

    // maturityDate 昇順
    return cases.sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
  },

  getRenewalCaseById: (id) => {
    return get().renewalCases.find((rc) => rc.id === id);
  },

  saveRenewalSurvey: (id, patch) => {
    const state = get();
    const userId = state.currentUserId;
    const now = new Date().toISOString();

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;

      // deep-merge survey
      const mergedSurvey: RenewalSurvey = {
        ...rc.survey,
        ...patch,
        consult:
          patch.consult !== undefined
            ? { ...rc.survey.consult, ...patch.consult }
            : rc.survey.consult,
        roadmap:
          patch.roadmap !== undefined
            ? { ...rc.survey.roadmap, ...patch.roadmap }
            : rc.survey.roadmap,
        rider:
          patch.rider !== undefined
            ? { ...rc.survey.rider, ...patch.rider }
            : rc.survey.rider,
        updatedAt: now,
      };

      // consult.renewalMethod と method を同期
      const newMethod = mergedSurvey.consult?.renewalMethod ?? rc.method;

      return {
        ...rc,
        method: newMethod,
        survey: mergedSurvey,
        activityLog: [
          ...rc.activityLog,
          makeLog("survey_saved", "アンケートを保存しました", userId),
        ],
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  addRenewalNote: (id, body, userId) => {
    const state = get();
    const effectiveUserId = userId ?? state.currentUserId;
    const now = new Date().toISOString();

    const note: RenewalNote = {
      id: uid(),
      body,
      byUserId: effectiveUserId,
      at: now,
    };

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        notes: [...rc.notes, note],
        activityLog: [
          ...rc.activityLog,
          makeLog(
            "note",
            `留意事項を追記しました: ${body.slice(0, 30)}${body.length > 30 ? "…" : ""}`,
            effectiveUserId,
          ),
        ],
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  addRenewalLog: (id, entry, userId) => {
    const state = get();
    const effectiveUserId = userId ?? state.currentUserId;
    const now = new Date().toISOString();

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        activityLog: [
          ...rc.activityLog,
          makeLog(entry.kind, entry.body, effectiveUserId),
        ],
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  changeRenewalStatus: (id, status, userId) => {
    const state = get();
    const effectiveUserId = userId ?? state.currentUserId;
    const now = new Date().toISOString();

    const STATUS_LABELS: Record<RenewalStatus, string> = {
      not_started: "未対応",
      in_progress: "対応中",
      completed: "完了",
    };

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      const fromLabel = STATUS_LABELS[rc.status];
      const toLabel = STATUS_LABELS[status];
      return {
        ...rc,
        status,
        activityLog: [
          ...rc.activityLog,
          makeLog(
            "status_change",
            `ステータスを変更しました: ${fromLabel}→${toLabel}`,
            effectiveUserId,
          ),
        ],
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  addRenewalTask: (id, task) => {
    const state = get();
    const userId = state.currentUserId;
    const now = new Date().toISOString();

    const newTask: Task = {
      ...task,
      id: uid(),
      scope: "renewal" as const,
      createdAt: now,
    };

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        tasks: [...rc.tasks, newTask],
        activityLog: [
          ...rc.activityLog,
          makeLog("task", `タスクを追加しました: ${newTask.title}`, userId),
        ],
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  updateRenewalTask: (id, taskId, patch) => {
    const state = get();
    const now = new Date().toISOString();

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        tasks: rc.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  toggleRenewalTaskDone: (id, taskId, done, today) => {
    const state = get();
    const userId = state.currentUserId;
    const now = new Date().toISOString();
    const todayStr = today ?? now.slice(0, 10);

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        tasks: rc.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            done,
            doneDate: done ? todayStr : undefined,
            doneBy: done ? userId : undefined,
          };
        }),
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  removeRenewalTask: (id, taskId) => {
    const state = get();
    const now = new Date().toISOString();

    const updated = state.renewalCases.map((rc) => {
      if (rc.id !== id) return rc;
      return {
        ...rc,
        tasks: rc.tasks.filter((t) => t.id !== taskId),
        updatedAt: now,
      };
    });

    set({ renewalCases: updated });
    persist(updated);
  },

  importRenewalCases: (newCases) => {
    const state = get();
    // 重複防止: 既存に同じ id があればスキップ
    const existingIds = new Set(state.renewalCases.map((rc) => rc.id));
    const toAdd = newCases.filter((rc) => !existingIds.has(rc.id));
    if (toAdd.length === 0) return;
    const updated = [...state.renewalCases, ...toAdd];
    set({ renewalCases: updated });
    persist(updated);
  },
});
