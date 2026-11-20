// =====================================================
// org chart utilities — 上長/部下判定ヘルパー
// =====================================================
import type { User, Team } from '../types';

/**
 * 指定ユーザーの「上長」一覧を返す。
 * ロジック: user.teamIds に含まれる全チームの managerIds を集約し、
 *           自身を除外して重複を取り除く。
 */
export function getManagersOf(userId: string, users: User[], teams: Team[]): User[] {
  const user = users.find(u => u.id === userId);
  if (!user) return [];

  const managerIds = new Set<string>();
  for (const teamId of user.teamIds) {
    const team = teams.find(t => t.id === teamId);
    if (!team) continue;
    for (const mid of team.managerIds) {
      if (mid !== userId) managerIds.add(mid);
    }
  }

  return users.filter(u => managerIds.has(u.id));
}

/**
 * 指定ユーザーの「部下」一覧を返す。
 * ロジック: userId が managerIds に含まれる全チームの memberIds を集約し、
 *           自身を除外して重複を取り除く。
 */
export function getSubordinatesOf(userId: string, users: User[], teams: Team[]): User[] {
  const subordinateIds = new Set<string>();

  for (const team of teams) {
    if (!team.managerIds.includes(userId)) continue;
    for (const mid of team.memberIds) {
      if (mid !== userId) subordinateIds.add(mid);
    }
  }

  return users.filter(u => subordinateIds.has(u.id));
}
