// =====================================================
// household.ts — 世帯 / 人物 型
// =====================================================

import type {
  HouseholdType,
  HouseholdStatus,
  PersonRelation,
  PersonGender,
} from "./core";
import type { Task } from "./task";

export interface Household {
  id: string;
  name: string; // 「田中家」「ABC商事」
  type: HouseholdType;
  area: string; // 「都道府県 市区町村」スペース連結で保存（後方互換）
  primaryUserId: string; // 担当者
  headPersonId?: string; // 世帯主 (Person.id, 個人世帯のみ意味あり)
  address?: string;
  familyMemo: string; // 家族構成メモ
  tags: string[];
  memo: string;
  status: HouseholdStatus;
  lastContactDate?: string;
  nextAppointment?: string;
  isFavorite?: boolean;
  annualIncome?: number; // ★NEW 年収（万円）契約者=世帯に従属 (§3-6)
  tasks?: Task[]; // ★NEW 世帯スコープの汎用タスク (ADR-TASK-MASTER)
  channelId?: string; // 工程C: 登録チャネル（SalesChannel.id, 葉のみ）。任意
}

// 互換エイリアス — 既存コードを壊さない (deprecated)
export type Customer = Household;

export interface Person {
  id: string;
  householdId: string;
  name: string;
  kana?: string;
  relation: PersonRelation;
  birthDate?: string; // YYYY-MM-DD
  gender?: PersonGender;
  occupation?: string;
  annualIncome?: number; // ★NEW 年収（万円）構成員ごとの収入（工程D）
  smoker?: boolean;
  healthNotes?: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}
