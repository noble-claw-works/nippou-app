// =====================================================
// 世帯まとめ入力 B-2a — 純粋関数ユーティリティ
// (HouseholdBatchEntryPage で使用 / 単体テスト対象)
// =====================================================
import type { Opportunity, ProposalProduct, ConfidenceUnified } from '../types';
import type { SalesChannel } from '../types';

// ── ID 生成（簡易版: テスト環境でも動く） ──
let _localCounter = 0;
export function localUid(): string {
  return `local_${++_localCounter}_${Date.now()}`;
}

// ─────────────────────────────────────────────────────────────
// 1. 月払合計の集計
// ─────────────────────────────────────────────────────────────
/** proposalProducts[] から月払合計を計算する純粋関数 */
export function calcTotalMonthlyPremium(products: ProposalProduct[]): number {
  return products.reduce((sum, p) => sum + (p.monthlyPremium ?? 0), 0);
}

// ─────────────────────────────────────────────────────────────
// 2. 案件ドラフト型（ローカル編集用）
// ─────────────────────────────────────────────────────────────
export type DraftOpportunity = Opportunity & {
  _isNew: boolean;       // true = 新規追加（addOpportunity対象）
  _isDirty: boolean;     // true = 編集済み（保存対象）
  _isOpen: boolean;      // カードの開閉状態
};

/** 既存 Opportunity からドラフトを生成 */
export function toDraft(opp: Opportunity, isOpen = false): DraftOpportunity {
  return { ...opp, _isNew: false, _isDirty: false, _isOpen: isOpen };
}

/** 空の新規ドラフトを生成（世帯ヘッダーの既定値を継承） */
export function createEmptyDraft(params: {
  householdId: string;
  ownerId: string;
  contractorPersonId?: string;
  channelId?: string;
  defaultDate?: string;
}): DraftOpportunity {
  const id = localUid();
  return {
    id,
    householdId: params.householdId,
    ownerId: params.ownerId,
    title: '新規案件',
    stage: 'approach',
    status: 'open',
    targetPersonIds: [],
    productCategories: [],
    proposalProducts: [],
    totalMonthlyPremium: undefined,
    needsAnalysisDone: false,
    illustrationProvided: false,
    stageHistory: [],
    tags: [],
    memo: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // B-2a 拡張フィールド
    contractorPersonId: params.contractorPersonId,
    channelId: params.channelId,
    confidence: undefined,
    // ドラフト専用
    _isNew: true,
    _isDirty: true,
    _isOpen: true,
  };
}

/** 既存ドラフトを複製（金額ゼロ化・確度リセット・新規IDで作成） */
export function duplicateDraft(
  source: DraftOpportunity,
  params: { contractorPersonId?: string; channelId?: string }
): DraftOpportunity {
  const id = localUid();
  const clonedProducts: ProposalProduct[] = source.proposalProducts.map(p => ({
    ...p,
    id: localUid(),
    monthlyPremium: 0,
    firstYearCommission: undefined,
  }));
  return {
    ...source,
    id,
    title: `${source.title} (複製)`,
    proposalProducts: clonedProducts,
    totalMonthlyPremium: undefined,
    confidence: undefined,
    // 継承: contractorPersonId・channelId（ヘッダー優先・引数で上書き可）
    contractorPersonId: params.contractorPersonId ?? source.contractorPersonId,
    channelId: params.channelId ?? source.channelId,
    stageHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _isNew: true,
    _isDirty: true,
    _isOpen: true,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. バリデーション
// ─────────────────────────────────────────────────────────────
export interface DraftValidationResult {
  isValid: boolean;
  errors: {
    noChannel: boolean;        // channelId が葉でない
    noConfidence: boolean;     // confidence が未設定
  };
}

/** チャネルが葉(子)かどうか判定 */
export function isLeafChannel(channelId: string | undefined, channels: SalesChannel[]): boolean {
  if (!channelId) return false;
  const ch = channels.find(c => c.id === channelId);
  if (!ch) return false;
  return ch.parentId !== null; // 葉ノードは parentId が値あり
}

/** 1案件ドラフトのバリデーション */
export function validateDraft(
  draft: DraftOpportunity,
  channels: SalesChannel[]
): DraftValidationResult {
  const noChannel = !isLeafChannel(draft.channelId, channels);
  const noConfidence = !draft.confidence;
  return {
    isValid: !noChannel && !noConfidence,
    errors: { noChannel, noConfidence },
  };
}

/** 全ドラフトのバリデーション（保存バー用: 無効件数を返す） */
export function countInvalidDrafts(
  drafts: DraftOpportunity[],
  channels: SalesChannel[]
): number {
  return drafts.filter(d => !validateDraft(d, channels).isValid).length;
}

// ─────────────────────────────────────────────────────────────
// 4. 表示フィルタ
// ─────────────────────────────────────────────────────────────
export type ShowFilter = 'active' | 'all';

/** 表示フィルタに応じてドラフト配列をフィルタリング */
export function filterDrafts(
  drafts: DraftOpportunity[],
  filter: ShowFilter
): DraftOpportunity[] {
  if (filter === 'all') return drafts;
  // 'active' = open + 新規（_isNew = true も表示）
  return drafts.filter(d => d.status === 'open' || d._isNew);
}

// ─────────────────────────────────────────────────────────────
// 5. 商品操作ヘルパー
// ─────────────────────────────────────────────────────────────
/** 空の ProposalProduct を生成 */
export function createEmptyProduct(insuredPersonId = ''): ProposalProduct {
  return {
    id: localUid(),
    productCategory: 'life',
    productName: '',
    insurer: '',
    insuredPersonId,
    monthlyPremium: 0,
    firstYearCommission: undefined,
    memo: '',
  };
}

/** 商品行を複製 */
export function duplicateProduct(product: ProposalProduct): ProposalProduct {
  return {
    ...product,
    id: localUid(),
    monthlyPremium: 0,
    firstYearCommission: undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. チャネル解決ヘルパー
// ─────────────────────────────────────────────────────────────
/** 親チャネル一覧を取得 */
export function getParentChannels(channels: SalesChannel[]): SalesChannel[] {
  return channels.filter(c => c.parentId === null && c.isActive).sort((a, b) => a.order - b.order);
}

/** 指定親チャネルの子チャネル一覧を取得 */
export function getChildChannels(parentId: string, channels: SalesChannel[]): SalesChannel[] {
  return channels.filter(c => c.parentId === parentId && c.isActive).sort((a, b) => a.order - b.order);
}

/** channelId から親チャネルIDを導出 */
export function getParentChannelId(channelId: string | undefined, channels: SalesChannel[]): string {
  if (!channelId) return '';
  const ch = channels.find(c => c.id === channelId);
  if (!ch) return '';
  return ch.parentId ?? '';
}

// ─────────────────────────────────────────────────────────────
// 7. 確度ラベル
// ─────────────────────────────────────────────────────────────
export const CONFIDENCE_LABELS: Record<ConfidenceUnified, string> = {
  fixed: '確定',
  S: 'S（申込済）',
  A: 'A（高見込）',
  B: 'B（中見込）',
  C: 'C（要フォロー）',
  D: 'D（初期接触）',
};

export const CONFIDENCE_OPTIONS: ConfidenceUnified[] = ['fixed', 'S', 'A', 'B', 'C', 'D'];
