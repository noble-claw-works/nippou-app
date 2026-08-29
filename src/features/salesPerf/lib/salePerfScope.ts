// =====================================================
// salesPerf/lib/salePerfScope.ts — scope 解決
// =====================================================
import type { SalesPerfUser, SalesPerfMasters, SalesPerfFilter } from '../types';

/**
 * ロールと現在ユーザー・フィルタをもとに「見えるowner集合」を返す。
 *
 * - admin / manager: 全員 or グループ絞り or 個人指定
 * - general: 自分のみ (フィルタの ownerId は無視)
 */
export function getScopeUserIds(
  role: 'general' | 'manager' | 'admin' | 'executive',
  currentUserId: string,
  filter: SalesPerfFilter,
  masters: SalesPerfMasters,
): string[] {
  // general は自分のみ
  if (role === 'general') {
    return [currentUserId];
  }

  // groupId フィルタ
  if (filter.groupId) {
    const grp = masters.groups.find(g => g.id === filter.groupId);
    if (!grp) return [];
    // ownerId でさらに絞る
    if (filter.ownerId) {
      return grp.memberIds.includes(filter.ownerId) ? [filter.ownerId] : [];
    }
    return [...grp.memberIds];
  }

  // ownerId フィルタ
  if (filter.ownerId) {
    return [filter.ownerId];
  }

  // 全員
  return masters.users.map(u => u.id);
}

/**
 * owner を salesPerf masters から lookup
 */
export function findOwner(ownerId: string, masters: SalesPerfMasters): SalesPerfUser | undefined {
  return masters.users.find(u => u.id === ownerId);
}

/**
 * owner の表示名 (見つからなければ id を返す)
 */
export function ownerName(ownerId: string, masters: SalesPerfMasters): string {
  return masters.users.find(u => u.id === ownerId)?.name ?? ownerId;
}

/**
 * グループ表示名
 */
export function groupName(groupId: string, masters: SalesPerfMasters): string {
  return masters.groups.find(g => g.id === groupId)?.name ?? groupId;
}
