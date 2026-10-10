// =====================================================
// Opportunity slice — addOpportunity, updateOpportunity,
// deleteOpportunity, changeOpportunityStage,
// getOpportunitiesByHousehold, getOpportunityById,
// addOppTask, updateOppTask, removeOppTask,
// toggleOppTaskDone,
// addProposalRound, updateProposalRound, deleteProposalRound
// =====================================================
import type { StateCreator } from "zustand";
import type {
  AppState,
  Opportunity,
  Task,
  ProposalRound,
  ProposalProduct,
} from "../_internal/types";
import { uid } from "../_internal/constants";
import { format } from "date-fns";
import {
  generateTasksOnOpportunityCreated,
  generateTasksOnProductAdded,
  generateTasksOnStageReached,
} from "../../utils/taskGenerator";

export const createOpportunitySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addOpportunity"
    | "updateOpportunity"
    | "deleteOpportunity"
    | "changeOpportunityStage"
    | "getOpportunitiesByHousehold"
    | "getOpportunityById"
    | "addOppTask"
    | "updateOppTask"
    | "removeOppTask"
    | "toggleOppTaskDone"
    | "addProposalRound"
    | "updateProposalRound"
    | "deleteProposalRound"
  >
> = (set, get) => ({
  addOpportunity: (partial) => {
    const now = new Date().toISOString();
    const today = format(new Date(), "yyyy-MM-dd");
    const totalMonthlyPremium = (partial.proposalProducts ?? []).reduce(
      (sum, p) => sum + p.monthlyPremium,
      0,
    );
    const baseOpp: Opportunity = {
      ...partial,
      tasks: partial.tasks ?? [],
      id: uid(),
      totalMonthlyPremium:
        totalMonthlyPremium > 0 ? totalMonthlyPremium : undefined,
      stageHistory: [
        {
          stage: partial.stage,
          changedAt: now,
          changedByUserId: partial.ownerId,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    // 案件作成トリガーー 自動タスク生成
    const masters = get().taskTemplates;
    const generatedTasks = generateTasksOnOpportunityCreated(
      baseOpp,
      masters,
      today,
    );
    // 商品追加トリガー
    let productTasks: Task[] = [];
    for (const product of baseOpp.proposalProducts ?? []) {
      productTasks = [
        ...productTasks,
        ...generateTasksOnProductAdded(
          { ...baseOpp, tasks: [...generatedTasks, ...productTasks] },
          product,
          masters,
          today,
        ),
      ];
    }
    const opp: Opportunity = {
      ...baseOpp,
      tasks: [...(partial.tasks ?? []), ...generatedTasks, ...productTasks],
    };
    set((s) => {
      const updated = [...s.opportunities, opp];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
    return opp;
  },

  updateOpportunity: (id, patch) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const masters = get().taskTemplates;
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== id) return o;
        const merged = { ...o, ...patch, updatedAt: new Date().toISOString() };
        // 自動計算: totalMonthlyPremium
        if (patch.proposalProducts !== undefined) {
          const total = (merged.proposalProducts ?? []).reduce(
            (sum, p) => sum + p.monthlyPremium,
            0,
          );
          merged.totalMonthlyPremium = total > 0 ? total : undefined;
          // 商品追加トリガー: 新規商品を検出しタスク生成
          const oldIds = new Set((o.proposalProducts ?? []).map((p) => p.id));
          const newProducts = (merged.proposalProducts ?? []).filter(
            (p) => !oldIds.has(p.id),
          );
          let addedTasks: Task[] = [];
          for (const product of newProducts) {
            const newForProduct = generateTasksOnProductAdded(
              { ...merged, tasks: [...(merged.tasks ?? []), ...addedTasks] },
              product as ProposalProduct,
              masters,
              today,
            );
            addedTasks = [...addedTasks, ...newForProduct];
          }
          // 商品削除時の連動削除: scope='product' かつ productId が削除された商品に属するタスク
          const remainingIds = new Set(
            (merged.proposalProducts ?? []).map((p) => p.id),
          );
          const removedProductIds = (o.proposalProducts ?? [])
            .filter((p) => !remainingIds.has(p.id))
            .map((p) => p.id);
          const existingTasks = (merged.tasks ?? []).filter(
            (t) =>
              !(
                t.scope === "product" &&
                t.productId &&
                removedProductIds.includes(t.productId)
              ),
          );
          merged.tasks = [...existingTasks, ...addedTasks];
        }
        return merged;
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  deleteOpportunity: (id) => {
    set((s) => {
      const updated = s.opportunities.filter((o) => o.id !== id);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  changeOpportunityStage: (id, newStage, note?, userId?) => {
    const now = new Date().toISOString();
    const today = format(new Date(), "yyyy-MM-dd");
    const masters = get().taskTemplates;
    const currentUserId = userId ?? get().currentUserId;
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== id) return o;
        const historyEntry = {
          stage: newStage,
          changedAt: now,
          changedByUserId: currentUserId,
          note,
        };
        let status = o.status;
        let actualCloseDate = o.actualCloseDate;
        if (newStage === "issued") {
          status = "won";
          actualCloseDate = actualCloseDate ?? now.slice(0, 10);
        } else if (newStage === "lost") {
          status = "lost";
          actualCloseDate = actualCloseDate ?? now.slice(0, 10);
        }
        // ステージ到達トリガー — 自動タスク生成
        const stageTasks = generateTasksOnStageReached(
          { ...o, tasks: o.tasks ?? [] },
          newStage,
          masters,
          today,
        );
        return {
          ...o,
          stage: newStage,
          status,
          actualCloseDate,
          stageHistory: [...o.stageHistory, historyEntry],
          tasks: [...(o.tasks ?? []), ...stageTasks],
          updatedAt: now,
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  getOpportunitiesByHousehold: (householdId, options?) => {
    const opps = get().opportunities.filter(
      (o) => o.householdId === householdId,
    );
    if (options?.openOnly) return opps.filter((o) => o.status === "open");
    return opps;
  },

  getOpportunityById: (id) => {
    return get().opportunities.find((o) => o.id === id);
  },

  // ADR-TASK-MASTER: 案件/商品スコープ Task CRUD
  addOppTask: (oppId, task) => {
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id: uid(), createdAt: now };
    set((s) => {
      const updated = s.opportunities.map((o) =>
        o.id !== oppId
          ? o
          : { ...o, tasks: [...(o.tasks ?? []), newTask], updatedAt: now },
      );
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  updateOppTask: (oppId, taskId, patch) => {
    const now = new Date().toISOString();
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== oppId) return o;
        const tasks = (o.tasks ?? []).map((t) =>
          t.id === taskId ? { ...t, ...patch } : t,
        );
        return { ...o, tasks, updatedAt: now };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  removeOppTask: (oppId, taskId) => {
    const now = new Date().toISOString();
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== oppId) return o;
        // 自動生成タスク（sourceMasterId != undefined）は削除不可
        const task = (o.tasks ?? []).find((t) => t.id === taskId);
        if (task?.sourceMasterId !== undefined) return o;
        const tasks = (o.tasks ?? []).filter((t) => t.id !== taskId);
        return { ...o, tasks, updatedAt: now };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  toggleOppTaskDone: (oppId, taskId, done, today) => {
    const now = new Date().toISOString();
    const todayStr = today ?? format(new Date(), "yyyy-MM-dd");
    const currentUserId = get().currentUserId;
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== oppId) return o;
        const tasks = (o.tasks ?? []).map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            done,
            doneDate: done ? (t.doneDate ?? todayStr) : undefined,
            doneBy: done ? currentUserId : undefined,
          };
        });
        return { ...o, tasks, updatedAt: now };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  // ADR-B4 v2 req8: 提案ラウンド
  addProposalRound: (id, round) => {
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== id) return o;
        const existing = o.proposals ?? [];
        const roundNo = existing.length + 1;
        const newRound: ProposalRound = {
          ...round,
          id: uid(),
          roundNo,
          createdAt: new Date().toISOString(),
        };
        return {
          ...o,
          proposals: [...existing, newRound],
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  updateProposalRound: (id, roundId, patch) => {
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== id) return o;
        const rounds = (o.proposals ?? []).map((r) =>
          r.id === roundId ? { ...r, ...patch } : r,
        );
        return { ...o, proposals: rounds, updatedAt: new Date().toISOString() };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },

  deleteProposalRound: (id, roundId) => {
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== id) return o;
        const rounds = (o.proposals ?? []).filter((r) => r.id !== roundId);
        // roundNo を再採番
        const renumbered = rounds.map((r, i) => ({ ...r, roundNo: i + 1 }));
        return {
          ...o,
          proposals: renumbered,
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updated),
        );
      }
      return { opportunities: updated };
    });
  },
});
