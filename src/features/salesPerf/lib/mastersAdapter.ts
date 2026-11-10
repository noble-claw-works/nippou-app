// =====================================================
// mastersAdapter.ts — 本体 USERS/TEAMS → SalesPerfMasters 派生
// owner_id を u1..u6 に統一し salePerfScope のバグを解消する。
// insurers/productTypes/channels は seed 定数を流用。
// =====================================================
import type { User, Team } from "../../../types";
import type { SalesPerfMasters, SalesPerfUser, SalesPerfGroup } from "../types";
import { SALES_PERF_MASTERS } from "../data/masters";

/**
 * 本体 User を SalesPerfUser へ変換する。
 * executive は manager 相当として扱う（salesPerf ロール互換）。
 */
function toSalesPerfRole(role: User["role"]): SalesPerfUser["role"] {
  if (role === "admin") return "admin";
  if (role === "manager" || role === "executive") return "manager";
  return "general";
}

/**
 * 本体 User の所属チームのうち最初のものを groupId とする。
 */
function primaryGroupId(user: User): string {
  return user.teamIds[0] ?? "g_none";
}

/**
 * 本体 User[] + Team[] から SalesPerfMasters を生成する。
 * insurers / productTypes / channels は既存 seed 定数を流用。
 */
export function buildMastersFromStore(
  users: User[],
  teams: Team[],
): SalesPerfMasters {
  // アクティブユーザーのみ（status が active）
  const activeUsers = users.filter((u) => u.status === "active");

  const spUsers: SalesPerfUser[] = activeUsers.map((u) => ({
    id: u.id, // u1..u6（統一名前空間）
    name: u.name,
    groupId: primaryGroupId(u),
    role: toSalesPerfRole(u.role),
  }));

  const spGroups: SalesPerfGroup[] = teams.map((t) => ({
    id: t.id, // t1/t2
    name: t.name,
    memberIds: t.memberIds,
    managerIds: t.managerIds,
  }));

  return {
    users: spUsers,
    groups: spGroups,
    // insurers/productTypes/channels は既存 seed マスタを流用
    insurers: SALES_PERF_MASTERS.insurers,
    productTypes: SALES_PERF_MASTERS.productTypes,
    channels: SALES_PERF_MASTERS.channels,
  };
}
