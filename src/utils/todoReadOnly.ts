/**
 * todoReadOnly.ts
 *
 * TODO の読み取り専用判定ロジックを一元管理するユーティリティ。
 *
 * 判定ルール（OR で組み合わせ）:
 *   1. 提出済み / 確認済み日報由来 → report.status が 'submitted' or 'confirmed'
 *   2. 期限切れ → todo.dueDate が今日より前 (dueDate < today)
 *
 * BUG-B 修正: Today 画面で期限切れ TODO が変更可能だった問題を解決する。
 * 提出済み由来の保護 (commit ae0ce12) と組み合わせて使用する。
 */

import type { Todo } from '../types';

export type ReportStatus = 'planning' | 'in_progress' | 'submitted' | 'confirmed';

/**
 * 指定された TODO が読み取り専用かどうかを判定する。
 *
 * @param todo - 対象の TODO
 * @param reportStatus - TODO が属する日報のステータス
 * @param today - 今日の日付 (YYYY-MM-DD)。省略時は実行時の日付を使用
 * @returns true の場合は読み取り専用
 */
export function isTodoReadOnly(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string,
): boolean {
  // ルール1: 提出済み / 確認済み日報由来
  if (reportStatus === 'submitted' || reportStatus === 'confirmed') {
    return true;
  }

  // ルール2: 期限切れ (dueDate < today)
  if (todo.dueDate) {
    const todayStr = today ?? new Date().toISOString().split('T')[0];
    if (todo.dueDate < todayStr) {
      return true;
    }
  }

  return false;
}

/**
 * 読み取り専用理由を人間が読めるメッセージで返す。
 */
export function getTodoReadOnlyReason(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string,
): string | null {
  if (reportStatus === 'submitted' || reportStatus === 'confirmed') {
    return '提出済み日報の TODO は変更できません';
  }
  if (todo.dueDate) {
    const todayStr = today ?? new Date().toISOString().split('T')[0];
    if (todo.dueDate < todayStr) {
      return '期限切れの TODO は変更できません';
    }
  }
  return null;
}
