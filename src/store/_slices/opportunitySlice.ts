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
  Policy,
  ProductCategory,
  OpportunityStage,
} from "../_internal/types";
import { uid } from "../_internal/constants";
import { format } from "date-fns";
import {
  generateTasksOnOpportunityCreated,
  generateTasksOnProductAdded,
  generateTasksOnStageReached,
} from "../../utils/taskGenerator";
import { buildValueChange } from "../../utils/policyHistory";
import { buildNewPolicyFromProduct } from "../../utils/reflectionPolicyFactory";

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
    | "setProposalReflection"
    | "reflectOpportunityToPolicies"
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

  // ── Doc4 反映（§2.3 / PC-6）──
  // 商品行の反映指定を設定（最小実装）。
  setProposalReflection: (opportunityId, proposalProductId, reflection) => {
    set((s) => {
      const updated = s.opportunities.map((o) => {
        if (o.id !== opportunityId) return o;
        const proposalProducts = (o.proposalProducts ?? []).map((p) =>
          p.id === proposalProductId ? { ...p, reflection } : p,
        );
        return {
          ...o,
          proposalProducts,
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

  // ── Doc4 反映トランザクション（§T4-02 / §T4-03 / §3論点1）──
  // 単一 set・全or無・冪等（resultPolicyId）・事前検証→一括 commit・競合検知。
  // 各 proposalProduct.reflection（mode: new|existing_change|none）に従い
  //  - new: Policy を新規「申込中(pending)」で追加（reflectionSource.mode="new"）
  //  - existing_change: 既存 Policy を変更し valueHistory に追記、status は申込中(見込)へ
  //  - none: スキップ
  // 反映済み(resultPolicyId が実在)は再実行しても二重生成しない（冪等）。
  reflectOpportunityToPolicies: (opportunityId, userId) => {
    const opp = get().opportunities.find((o) => o.id === opportunityId);
    if (!opp) throw new Error("REFLECT_OPP_NOT_FOUND");
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const currentPolicies = get().policies;

    // ── 1) 事前検証（純粋・state 変更前）──
    // 対象行: mode が未設定なら "new" にフォールバック（§T4-05 既定）。
    type PlanItem =
      | { kind: "skip" }
      | { kind: "idempotent"; policy: Policy }
      | { kind: "new"; pp: ProposalProduct }
      | {
          kind: "existing_change";
          pp: ProposalProduct;
          before: Policy;
        };

    const plan: { pp: ProposalProduct; item: PlanItem }[] = [];
    for (const pp of opp.proposalProducts ?? []) {
      const mode = pp.reflection?.mode ?? "new";
      if (mode === "none") {
        plan.push({ pp, item: { kind: "skip" } });
        continue;
      }
      // 冪等: 既に反映済み(resultPolicyId 実在)ならスキップ扱い（二重生成防止）
      const resultId = pp.reflection?.resultPolicyId;
      if (resultId) {
        const existing = currentPolicies.find((p) => p.id === resultId);
        if (existing) {
          plan.push({ pp, item: { kind: "idempotent", policy: existing } });
          continue;
        }
        // resultPolicyId があるが実在しない＝削除された → 競合（全or無で中断）
        throw new Error("REFLECT_CONFLICT_RESULT_MISSING");
      }
      if (mode === "existing_change") {
        const targetId = pp.reflection?.targetPolicyId;
        if (!targetId) throw new Error("REFLECT_TARGET_REQUIRED");
        const before = currentPolicies.find((p) => p.id === targetId);
        if (!before) throw new Error("REFLECT_TARGET_NOT_FOUND");
        // householdId 一致検証（§T4-05 候補制約）
        if (before.householdId !== opp.householdId) {
          throw new Error("REFLECT_TARGET_HOUSEHOLD_MISMATCH");
        }
        plan.push({ pp, item: { kind: "existing_change", pp, before } });
      } else {
        plan.push({ pp, item: { kind: "new", pp } });
      }
    }

    // ── 2) 変更セットを純粋に構築（この時点で state は未変更）──
    const newPolicies: Policy[] = [];
    // proposalProductId -> resultPolicyId（reflection 更新用）
    const resultMap = new Map<string, string>();
    // policyId -> 変更後 Policy（existing_change 用）
    const changedMap = new Map<string, Policy>();
    const reflected: Policy[] = [];

    for (const { pp, item } of plan) {
      if (item.kind === "skip") continue;
      if (item.kind === "idempotent") {
        reflected.push(item.policy);
        continue;
      }
      if (item.kind === "new") {
        const policy = buildNewPolicyFromProduct(opp, pp, userId, now, uid);
        policy.reflectionSource = {
          opportunityId: opp.id,
          proposalProductId: pp.id,
          mode: "new",
          reflectedAt: now,
          reflectedByUserId: userId,
        };
        newPolicies.push(policy);
        resultMap.set(pp.id, policy.id);
        reflected.push(policy);
      } else {
        // existing_change: before を複製し、商品行の値で上書き
        const before = item.before;
        const after: Policy = {
          ...before,
          insurer: pp.insurer,
          productName: pp.productName,
          productCategory: pp.productCategory as ProductCategory,
          monthlyPremium: pp.monthlyPremium,
          status: "pending", // 見込（申込中）。確定集計からは非算入（§0-②）
          reflectionSource: {
            opportunityId: opp.id,
            proposalProductId: pp.id,
            mode: "existing_change",
            reflectedAt: now,
            reflectedByUserId: userId,
          },
          updatedAt: now,
        };
        // 主契約 coverage の faceAmount を反映（存在時）
        if (pp.faceAmount !== undefined) {
          const covs = [...(before.coverages ?? [])];
          const mainIdx = covs.findIndex((c) => c.isMain);
          if (mainIdx >= 0) {
            covs[mainIdx] = { ...covs[mainIdx], faceAmount: pp.faceAmount };
          }
          after.coverages = covs;
        }
        const change = buildValueChange(before, after, {
          changedByUserId: userId,
          source: "doc4_reflection",
          opportunityId: opp.id,
          changedAt: now,
        });
        if (change) {
          after.valueHistory = [...(before.valueHistory ?? []), change];
        }
        changedMap.set(before.id, after);
        resultMap.set(pp.id, after.id);
        reflected.push(after);
      }
    }

    // ── 3) 変更が無ければ no-op（state 不変）──
    if (newPolicies.length === 0 && changedMap.size === 0) {
      return reflected;
    }

    // ── 4) 単一 set で一括 commit（全or無）──
    set((s) => {
      const updatedPolicies = [
        ...s.policies.map((p) => changedMap.get(p.id) ?? p),
        ...newPolicies,
      ];
      const updatedOpps = s.opportunities.map((o) => {
        if (o.id !== opportunityId) return o;
        const proposalProducts = (o.proposalProducts ?? []).map((p) => {
          const resultPolicyId = resultMap.get(p.id);
          if (!resultPolicyId || !p.reflection) return p;
          return {
            ...p,
            reflection: {
              ...p.reflection,
              resultPolicyId,
              reflectedAt: now,
            },
          };
        });
        // 反映が1件でもあれば受注(issued/won)へ遷移（既存 issue と整合）
        const historyEntry = {
          stage: "issued" as OpportunityStage,
          changedAt: now,
          changedByUserId: userId,
          note: "商談明細を契約へ反映",
        };
        return {
          ...o,
          proposalProducts,
          stage: "issued" as OpportunityStage,
          status: "won" as const,
          actualCloseDate: o.actualCloseDate ?? today,
          stageHistory: [...o.stageHistory, historyEntry],
          updatedAt: now,
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updatedPolicies),
        );
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updatedOpps),
        );
      }
      return { policies: updatedPolicies, opportunities: updatedOpps };
    });

    return reflected;
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
