// =====================================================
// salesTarget.ts — 営業目標 / ノルマ / トラッキング型
// =====================================================

import type { BlockType } from "./core";

/** 目標の対象スコープ: 個人 or チーム */
export type TargetScope = "individual" | "team";

/** 目標期間種別。既定は月次。四半期・年間もサポート */
export type TargetPeriodType = "monthly" | "quarterly" | "annual";

/**
 * 営業目標(ノルマ)。個人単位・チーム単位の双方を1型で表す。
 * scope='individual' のとき ownerId=User.id、scope='team' のとき ownerId=Team.id。
 * period 書式は periodType により固定:
 *   monthly   → 'YYYY-MM'   (例 '2026-07')
 *   quarterly → 'YYYY-Qn'   (例 '2026-Q3', n=1..4)
 *   annual    → 'YYYY'      (例 '2026')
 * 同一 owner が monthly/quarterly/annual を並存可能。突合キーは (scope, ownerId, periodType, period)。
 */
export interface SalesTarget {
  id: string;
  scope: TargetScope;
  ownerId: string; // scope=individual → User.id / scope=team → Team.id
  periodType: TargetPeriodType; // 既定 'monthly'
  period: string; // 'YYYY-MM' | 'YYYY-Qn' | 'YYYY'
  /** 成約件数の目標 (Policy inforce 化ベース) */
  targetPolicyCount: number;
  /** 成約保険料額の目標。月換算保険料の合計 (monthlyPremium ベース) */
  targetPremium: number;
  memo: string;
  createdByUserId: string; // 設定者 (manager/admin)
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface TrackingSession {
  id: string;
  userId: string;
  blockType: BlockType;
  customerId?: string;
  memo: string;
  startedAt: string;
  pausedAt?: string;
  endedAt?: string;
  status: "running" | "paused" | "ended" | "discarded";
}
