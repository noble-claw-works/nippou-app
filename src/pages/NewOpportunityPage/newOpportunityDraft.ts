// newOpportunityDraft.ts — 新規案件作成（3ペイン）の入力下書きと純関数
// 11/08 指示書 design.md §5。画面状態に依存しない計算だけを置き、単体テストで固定する。

import type { OpportunityStage, ProductCategory, ProposalProduct, ConfidenceUnified } from '../../types';
import type { AppState } from '../../store/_internal/types';

export const INITIAL_STAGES: OpportunityStage[] = [
  'approach', 'fact_finding', 'needs_analysis', 'proposal',
];

export interface OpportunityDraft {
  title: string;
  ownerId: string;
  stage: OpportunityStage;
  targetPersonIds: string[];
  categories: ProductCategory[];
  proposalProducts: ProposalProduct[];
  confidence: ConfidenceUnified | '';
  memo: string;
}

export type AddOpportunityInput = Parameters<AppState['addOpportunity']>[0];

export function makeInitialDraft(ownerId: string): OpportunityDraft {
  return {
    title: '',
    ownerId,
    stage: 'approach',
    targetPersonIds: [],
    categories: [],
    proposalProducts: [],
    confidence: '',
    memo: '',
  };
}

/** 担当者の初期値: ログイン中ユーザーが一覧にいればその人、いなければ先頭（旧フォームと同じ） */
export function resolveDefaultOwnerId(currentUserId: string, users: { id: string }[]): string {
  return users.some(u => u.id === currentUserId) ? currentUserId : (users[0]?.id ?? currentUserId);
}

/** 世帯切替の確認が要るか。担当者・初期ステージは既定値のままでも入るので数えない */
export function isDraftDirty(d: OpportunityDraft): boolean {
  return (
    d.title.trim() !== '' ||
    d.targetPersonIds.length > 0 ||
    d.categories.length > 0 ||
    d.proposalProducts.length > 0 ||
    d.confidence !== '' ||
    d.memo.trim() !== ''
  );
}

/** 作成前の検証。問題が無ければ null */
export function validateDraft(d: OpportunityDraft, householdId: string): string | null {
  if (!householdId) return '世帯を選択してください';
  if (!d.title.trim()) return '案件名は必須です';
  if (!d.ownerId) return '担当者は必須です';
  return null;
}

/** addOpportunity に渡す入力（3ペイン化前の旧フォームの作成処理と同じ組み立て） */
export function buildOpportunityInput(d: OpportunityDraft, householdId: string): AddOpportunityInput {
  const productCategories = Array.from(
    new Set<ProductCategory>([...d.categories, ...d.proposalProducts.map(p => p.productCategory)])
  );
  return {
    householdId,
    ownerId: d.ownerId,
    title: d.title.trim(),
    stage: d.stage,
    status: 'open',
    targetPersonIds: d.targetPersonIds,
    productCategories,
    proposalProducts: d.proposalProducts,
    ...(d.confidence ? { confidence: d.confidence } : {}),
    needsAnalysisDone: false,
    illustrationProvided: false,
    tags: [],
    memo: d.memo.trim(),
  };
}

export function sumMonthlyPremium(products: ProposalProduct[]): number {
  return products.reduce((sum, p) => sum + (p.monthlyPremium || 0), 0);
}

export function formatMonthlyTotal(n: number): string {
  return `合計月払 ¥${n.toLocaleString('ja-JP')} / 月`;
}

/** 配列に含まれていれば外し、無ければ足す */
export function toggleIn<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter(x => x !== item) : [...list, item];
}
