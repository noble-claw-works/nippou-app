// =====================================================
// task.ts — 汎用タスク型 (ADR-TASK-MASTER)
// =====================================================

import type { ProductCategory } from "./opportunity";
import type { OpportunityStage } from "./opportunity";

/** タスク付与スコープ（主上決裁 2026-08-17 14:07） */
export type TaskScope = "household" | "opportunity" | "product";

/** タスク優先度 */
export type TaskPriority = "high" | "medium" | "low";

/** 自動登録トリガー種別 */
export type TaskTriggerType =
  | "household_created" // 世帯作成時
  | "opportunity_created" // 案件作成時
  | "product_added" // 商品追加時
  | "stage_reached"; // ステージ到達時

/**
 * 汎用タスク（永続）。世帯／案件／商品のいずれかに紐づき0..n個。
 * 自動生成（マスタ由来）と手動追加が同一型で共存する。
 */
export interface Task {
  id: string;
  title: string; // タスク名（自由入力可）
  done: boolean; // 完了フラグ
  doneDate?: string; // 完了日 (YYYY-MM-DD)
  dueDate?: string; // 期限 (YYYY-MM-DD)
  ownerId?: string; // 担当 User.id
  memo?: string; // メモ
  priority: TaskPriority; // 優先度（既定 'medium'）
  rolledOver: boolean; // 繰越フラグ
  scope: TaskScope; // 'household' | 'opportunity' | 'product'
  householdId?: string; // scope='household' のとき対象 Household.id
  productId?: string; // scope='product' のとき対象 ProposalProduct.id
  sourceMasterId?: string; // 生成元 TaskTemplate.id。手動追加は undefined
  createdAt: string;
}

/**
 * タスク初期値マスタ。管理者編集可。
 */
export interface TaskTemplate {
  id: string;
  title: string; // 生成されるタスクのタイトル
  scope: TaskScope; // 生成タスクの scope
  trigger: TaskTriggerType; // 発火トリガー
  productCategories: ProductCategory[] | null; // 商品カテゴリ条件 (productスコープのみ適用)
  triggerStage?: OpportunityStage; // trigger='stage_reached' のとき定義ステージ
  defaultDueOffsetDays?: number; // 期限オフセット（N日後）
  defaultPriority: TaskPriority; // 生成タスクの既定優先度
  defaultMemo?: string; // 生成タスクの既定メモ
  order: number; // 表示順
  isActive: boolean; // falseの定義は生成に使わない
  createdAt: string;
  updatedAt: string;
}
