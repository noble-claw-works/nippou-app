// createHouseholdWithHead.ts — 新規世帯と世帯主を 1 回で登録する
// 11/08 指示書 design.md §5（A3）。新規案件作成①ペインのインライン新規世帯フォームから使う。
// エリアは未入力で作り、顧客一覧・カルテでは「未設定」等の既存表示に任せる。

import type { AppState } from '../store/_internal/types';
import type { CustomerType } from '../types/core';

export interface CreateHouseholdDeps {
  addCustomer: AppState['addCustomer'];
  addPerson: AppState['addPerson'];
  updateCustomer: AppState['updateCustomer'];
}

export interface CreateHouseholdInput {
  name: string;
  type: CustomerType;
  primaryUserId: string;
}

/** 世帯→世帯主の順に登録し、世帯主 id を世帯に書き戻す。名前が空なら何もせず null */
export function createHouseholdWithHead(
  deps: CreateHouseholdDeps,
  input: CreateHouseholdInput,
): string | null {
  const name = input.name.trim();
  if (!name) return null;
  try {
    const household = deps.addCustomer({
      name,
      type: input.type,
      area: '',
      primaryUserId: input.primaryUserId,
      familyMemo: '',
      tags: [],
      memo: '',
      status: 'active',
    });
    const head = deps.addPerson(household.id, { name, relation: 'head', memo: '' });
    deps.updateCustomer(household.id, { headPersonId: head.id });
    return household.id;
  } catch {
    return null;
  }
}
