/**
 * customerAttachment.ts
 * 顧客に「付帯情報」が存在するかを判定するユーティリティ。
 *
 * 付帯情報の定義:
 *   - reports[].blocks[].customerId に含まれる
 *   - reports[].todos[].customerId に含まれる
 *
 * この判定は P0 セキュリティ要件:
 *   「付帯情報あり → admin/executive のみ削除可」
 * に使用される。
 */

import type { DailyReport, Role } from '../types';

/** Zustand store から必要な部分だけを型で表現したサブセット */
export interface AttachmentCheckState {
  reports: DailyReport[];
}

/**
 * 指定した customerId に付帯情報（日報ブロック or TODO）が存在するかを返す。
 */
export function hasCustomerAttachment(
  state: AttachmentCheckState,
  customerId: string
): boolean {
  for (const report of state.reports) {
    // blocks への参照チェック
    for (const block of report.blocks) {
      if (block.customerId === customerId) return true;
    }
    // todos への参照チェック
    for (const todo of report.todos) {
      if (todo.customerId === customerId) return true;
    }
  }
  return false;
}

/**
 * 付帯情報判定に基づき、指定ロールがその顧客を削除可能かを返す。
 *
 * - 付帯情報なし → 任意ロール (ログイン中であれば) 削除可
 * - 付帯情報あり → admin / executive のみ削除可
 */
export function canDeleteCustomer(
  state: AttachmentCheckState,
  customerId: string,
  currentRole: Role | undefined
): boolean {
  if (currentRole === undefined) return false;
  if (hasCustomerAttachment(state, customerId)) {
    return currentRole === 'admin' || currentRole === 'executive';
  }
  return true;
}
