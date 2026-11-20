// newOpportunityDraft.ts — 新規案件作成（3ペイン）の入力下書きと純関数
// 11/08 指示書 design.md §5。画面状態に依存しない計算だけを置き、単体テストで固定する。

import type { ContractMilestones, OpportunityStage, ProductCategory, ProposalProduct, ConfidenceUnified } from '../../types';
import type { AppState } from '../../store/_internal/types';

export const INITIAL_STAGES: OpportunityStage[] = [
  'first_consult', 'lifeplan', 'proposed',
];

export interface OpportunityDraft {
  title: string;
  ownerId: string;
  stage: OpportunityStage;
  targetPersonIds: string[];
  categories: ProductCategory[];
  proposalProducts: ProposalProduct[];
  confidence: ConfidenceUnified | '';
  /** チャネル（葉の SalesChannel.id）。世帯選択時に世帯の channelId が既定で入る */
  channelId: string;
  /** ユーザーが手で変更したか。true の間は世帯切替で上書きしない */
  channelTouched: boolean;
  memo: string;
  /** D3: 前段の日付の手入力（現ステージの進入日は作成時に自動記録） */
  milestones: ContractMilestones;
}

export type AddOpportunityInput = Parameters<AppState['addOpportunity']>[0];

export function makeInitialDraft(ownerId: string): OpportunityDraft {
  return {
    title: '',
    ownerId,
    stage: 'first_consult',
    targetPersonIds: [],
    categories: [],
    proposalProducts: [],
    confidence: '',
    channelId: '',
    channelTouched: false,
    memo: '',
    milestones: {},
  };
}

/** 世帯の channelId を既定値として下書きに入れる（手動変更済みなら据え置き・同値なら同一参照） */
export function applyHouseholdChannelDefault(
  d: OpportunityDraft,
  householdChannelId: string | undefined,
): OpportunityDraft {
  if (d.channelTouched) return d;
  const next = householdChannelId ?? '';
  return d.channelId === next ? d : { ...d, channelId: next };
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
    d.channelTouched ||
    Object.keys(d.milestones).length > 0 ||
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
    ...(d.channelId ? { channelId: d.channelId } : {}),
    needsAnalysisDone: false,
    illustrationProvided: false,
    tags: [],
    memo: d.memo.trim(),
    ...(Object.keys(d.milestones).length ? { milestones: d.milestones } : {}),
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

/** D8: 世帯に属さない対象者・商品の被保険者/契約者を外す（世帯切替の取りこぼし防止）。変化が無ければ同一参照 */
export function pruneDraftToHousehold(d: OpportunityDraft, memberIds: string[]): OpportunityDraft {
  const ok = new Set(memberIds);
  const targets = d.targetPersonIds.filter(id => ok.has(id));
  const products = d.proposalProducts.map(p => {
    const badInsured = p.insuredPersonId && !ok.has(p.insuredPersonId);
    const badContractor = p.contractorPersonId && !ok.has(p.contractorPersonId);
    if (!badInsured && !badContractor) return p;
    return {
      ...p,
      insuredPersonId: badInsured ? '' : p.insuredPersonId,
      contractorPersonId: badContractor ? undefined : p.contractorPersonId,
    };
  });
  const productsChanged = products.some((p, i) => p !== d.proposalProducts[i]);
  if (targets.length === d.targetPersonIds.length && !productsChanged) return d;
  return { ...d, targetPersonIds: targets, proposalProducts: products };
}
