// =====================================================
// roles.ts — ロール判定ヘルパ（PC-5）
// 管理者 = manager。既存に同等判定が無いため新設。
// =====================================================
import type { Role } from "../types";

/** 管理者権限か（manager を管理者とみなす） */
export function isAdmin(role: Role | string | undefined | null): boolean {
  return role === "manager";
}
