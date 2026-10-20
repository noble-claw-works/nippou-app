/**
 * taskGenerator.ts — 汎用タスク自動生成エンジン
 *
 * ADR-TASK-MASTER §3 準拠 (2026-08-25)
 * 純関数群。副作用なし。「追加すべき Task のみ」を返す。
 * 呼び出し側（store）が既存 tasks へマージする。
 */

import { format, addDays } from "date-fns";
import { nanoid } from "nanoid";
import type {
  Task,
  TaskTemplate,
  TaskTriggerType,
  Household,
  Opportunity,
  ProposalProduct,
  OpportunityStage,
} from "../types";

// ── ヘルパー ─────────────────────────────────────────────────────────────────

function todayStr(override?: string): string {
  return override ?? format(new Date(), "yyyy-MM-dd");
}

function calcDueDate(today: string, offsetDays?: number): string | undefined {
  if (offsetDays == null) return undefined;
  return format(addDays(new Date(today), offsetDays), "yyyy-MM-dd");
}

function makeTask(
  master: TaskTemplate,
  overrides: Partial<Task>,
  today: string,
): Task {
  return {
    id: nanoid(),
    title: master.title,
    done: false,
    dueDate: calcDueDate(today, master.defaultDueOffsetDays),
    memo: master.defaultMemo,
    priority: master.defaultPriority,
    rolledOver: false,
    scope: master.scope,
    sourceMasterId: master.id,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * アクティブかつ指定トリガーにマッチするマスタを抽出する共通ヘルパー
 */
function activeMasters(
  masters: TaskTemplate[],
  trigger: TaskTriggerType,
): TaskTemplate[] {
  return masters.filter((m) => m.isActive && m.trigger === trigger);
}

// ── 冪等化チェック ───────────────────────────────────────────────────────────

/**
 * sourceMasterId の冪等チェック: 対象配列に同一マスタ由来タスクがあるか
 */
function alreadyGenerated(tasks: Task[], masterId: string): boolean {
  return tasks.some((t) => t.sourceMasterId === masterId);
}

/**
 * (sourceMasterId, productId) ペアの冪等チェック（product スコープ用）
 */
function alreadyGeneratedForProduct(
  tasks: Task[],
  masterId: string,
  productId: string,
): boolean {
  return tasks.some(
    (t) => t.sourceMasterId === masterId && t.productId === productId,
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// T1: household_created — 世帯作成時
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 世帯作成時に生成すべき Task[] を返す。
 * 冪等化: household.tasks に既に同一 sourceMasterId があればスキップ。
 */
export function generateTasksOnHouseholdCreated(
  household: Household,
  masters: TaskTemplate[],
  today?: string,
): Task[] {
  const _today = todayStr(today);
  const relevant = activeMasters(masters, "household_created");
  const existing = household.tasks ?? [];
  const result: Task[] = [];

  for (const master of relevant.sort((a, b) => a.order - b.order)) {
    if (alreadyGenerated(existing, master.id)) continue;
    result.push(
      makeTask(
        master,
        {
          scope: "household",
          householdId: household.id,
          ownerId: household.primaryUserId,
        },
        _today,
      ),
    );
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// T2: opportunity_created — 案件作成時
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 案件作成時に生成すべき Task[] を返す。
 * 冪等化: opp.tasks に既に同一 sourceMasterId があればスキップ。
 */
export function generateTasksOnOpportunityCreated(
  opp: Opportunity,
  masters: TaskTemplate[],
  today?: string,
): Task[] {
  const _today = todayStr(today);
  const relevant = activeMasters(masters, "opportunity_created").filter(
    (m) => m.productCategories === null || m.productCategories.length === 0,
  );
  const existing = opp.tasks ?? [];
  const result: Task[] = [];

  for (const master of relevant.sort((a, b) => a.order - b.order)) {
    if (alreadyGenerated(existing, master.id)) continue;
    result.push(
      makeTask(
        master,
        {
          scope: "opportunity",
          ownerId: opp.ownerId,
        },
        _today,
      ),
    );
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// T3: product_added — 商品追加時
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 商品追加時に生成すべき Task[] を返す。
 * マスタの productCategories に商品カテゴリが含まれるものが対象。
 * 冪等化: (sourceMasterId, productId) ペアで判定。
 */
export function generateTasksOnProductAdded(
  opp: Opportunity,
  product: ProposalProduct,
  masters: TaskTemplate[],
  today?: string,
): Task[] {
  const _today = todayStr(today);
  const relevant = activeMasters(masters, "product_added").filter((m) => {
    if (m.productCategories === null || m.productCategories.length === 0) {
      return true; // 全カテゴリ対象
    }
    return m.productCategories.includes(product.productCategory);
  });
  const existing = opp.tasks ?? [];
  const result: Task[] = [];

  for (const master of relevant.sort((a, b) => a.order - b.order)) {
    if (alreadyGeneratedForProduct(existing, master.id, product.id)) continue;
    result.push(
      makeTask(
        master,
        {
          scope: "product",
          productId: product.id,
          ownerId: opp.ownerId,
        },
        _today,
      ),
    );
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// T4: stage_reached — ステージ到達時
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ステージ到達時に生成すべき Task[] を返す。
 * マスタの triggerStage が新ステージに一致するものが対象。
 * 冪等化: opp.tasks に既に同一 sourceMasterId があればスキップ。
 */
export function generateTasksOnStageReached(
  opp: Opportunity,
  newStage: OpportunityStage,
  masters: TaskTemplate[],
  today?: string,
): Task[] {
  const _today = todayStr(today);
  const relevant = activeMasters(masters, "stage_reached").filter(
    (m) => m.triggerStage === newStage,
  );
  const existing = opp.tasks ?? [];
  const result: Task[] = [];

  for (const master of relevant.sort((a, b) => a.order - b.order)) {
    if (alreadyGenerated(existing, master.id)) continue;
    result.push(
      makeTask(
        master,
        {
          scope: "opportunity",
          ownerId: opp.ownerId,
        },
        _today,
      ),
    );
  }

  return result;
}
