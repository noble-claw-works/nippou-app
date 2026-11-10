import { describe, it, expect } from 'vitest';
import { getManagersOf, getSubordinatesOf } from '../utils/orgChart';
import type { User, Team } from '../types';

// --- フィクスチャ ---
const users: User[] = [
  { id: 'u1', name: '田中', email: 'tanaka@example.com', role: 'general', teamIds: ['t1'], status: 'active', avatarInitials: '田' },
  { id: 'u2', name: '鈴木', email: 'suzuki@example.com', role: 'general', teamIds: ['t1', 't2'], status: 'active', avatarInitials: '鈴' },
  { id: 'u3', name: '山田', email: 'yamada@example.com', role: 'manager', teamIds: ['t1'], status: 'active', avatarInitials: '山' },
  { id: 'u4', name: '佐藤', email: 'sato@example.com', role: 'manager', teamIds: ['t2'], status: 'active', avatarInitials: '佐' },
  { id: 'u5', name: '高橋', email: 'takahashi@example.com', role: 'executive', teamIds: [], status: 'active', avatarInitials: '高' },
];

const teams: Team[] = [
  { id: 't1', name: '営業1課', managerIds: ['u3'], memberIds: ['u1', 'u2', 'u3'] },
  { id: 't2', name: '営業2課', managerIds: ['u4'], memberIds: ['u2', 'u4'] },
];

// --- getManagersOf ---
describe('getManagersOf', () => {
  it('メンバーの上長を返す', () => {
    const mgrs = getManagersOf('u1', users, teams);
    expect(mgrs.map(u => u.id)).toEqual(['u3']);
  });

  it('複数チーム所属時は全チームの上長を重複除去して返す', () => {
    // u2 は t1 (上長 u3) + t2 (上長 u4) に所属
    const mgrs = getManagersOf('u2', users, teams);
    const ids = mgrs.map(u => u.id).sort();
    expect(ids).toEqual(['u3', 'u4']);
  });

  it('自分が上長の場合は自身を除外する', () => {
    // u3 は t1 の上長かつ t1 メンバー
    const mgrs = getManagersOf('u3', users, teams);
    expect(mgrs.map(u => u.id)).not.toContain('u3');
  });

  it('チーム未所属ユーザーは空配列', () => {
    const mgrs = getManagersOf('u5', users, teams);
    expect(mgrs).toHaveLength(0);
  });

  it('存在しない userId は空配列', () => {
    const mgrs = getManagersOf('nonexistent', users, teams);
    expect(mgrs).toHaveLength(0);
  });
});

// --- getSubordinatesOf ---
describe('getSubordinatesOf', () => {
  it('上長の部下一覧を返す', () => {
    const subs = getSubordinatesOf('u3', users, teams);
    // t1 の members (u1, u2, u3) から u3 自身を除く
    const ids = subs.map(u => u.id).sort();
    expect(ids).toEqual(['u1', 'u2']);
  });

  it('複数チームの上長は全チームの部下を重複除去して返す', () => {
    // u4 は t2 の上長 → members: u2, u4 → 自身除外 → u2 のみ
    const subs = getSubordinatesOf('u4', users, teams);
    expect(subs.map(u => u.id)).toEqual(['u2']);
  });

  it('上長でないユーザーは空配列', () => {
    const subs = getSubordinatesOf('u1', users, teams);
    expect(subs).toHaveLength(0);
  });

  it('チーム未所属 executive は空配列', () => {
    const subs = getSubordinatesOf('u5', users, teams);
    expect(subs).toHaveLength(0);
  });

  it('存在しない userId は空配列', () => {
    const subs = getSubordinatesOf('nonexistent', users, teams);
    expect(subs).toHaveLength(0);
  });
});
