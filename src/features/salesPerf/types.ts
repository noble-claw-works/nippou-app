// =====================================================
// salesPerf/types.ts — 営業実績ダッシュボード v1 型定義
// =====================================================

// ----------------------------------------
// 商品ライン
// ----------------------------------------
export type SalesLine = 'life' | 'nonlife';
export type LineFilter = 'life' | 'nonlife' | 'both';

// ----------------------------------------
// 確度型 (生保/損保 別ラダー)
// ----------------------------------------
/** 生保確度: 確定/S/A/B/初見 */
export type ConfidenceLife = 'fixed' | 'S' | 'A' | 'B' | 'first';

/** 損保確度: 確定/S/A/B/C/D */
export type ConfidenceNonlife = 'fixed' | 'S' | 'A' | 'B' | 'C' | 'D';

/** 共通確度コード (どちらか) */
export type ConfidenceCode = ConfidenceLife | ConfidenceNonlife;

/** 集約軸3値: 確定 / 確定+S / 確定+S+A */
export type ConfidenceAgg = 'fixed' | 'fixed_s' | 'fixed_s_a';

// ----------------------------------------
// 生データ (seed / API 元データ・汚れ込み)
// ----------------------------------------
export interface SalesContractRaw {
  id: string;
  line: SalesLine;
  fiscal_year: number;
  owner_id: string;
  group_id?: string;
  channel: string;
  partner: string;
  insurer: string;
  product_type: string;
  /** ★文字列混在 ("500万円","22000ドル") → 正規化必須 */
  monthly_premium: string | number;
  /** ★同上 */
  first_year_commission: string | number;
  confidence: string;             // 表記ゆれあり → 正規化
  application_date?: string;
  established_date?: string;      // YYYY-MM-DD 確定判定・月次集計の基準
  had_meeting?: boolean;
  had_lifeplan?: boolean;
  policy_collected?: boolean;
  had_proposal?: boolean;
  household_id?: string;
}

// ----------------------------------------
// 正規化済みデータ (集計はこれを使う)
// ----------------------------------------
export interface SalesContract {
  id: string;
  line: SalesLine;
  fiscalYear: number;
  ownerId: string;
  groupId: string;
  channel: string;
  partner: string;
  insurer: string;
  productType: string;
  /** 変換不能=null (要確認) */
  monthlyPremium: number | null;
  /** 同上 */
  firstYearCommission: number | null;
  confidenceCode: ConfidenceCode | 'unknown';
  /** fixed/S/A のいずれか以下に集約 */
  confidenceAgg: ConfidenceAgg | null;
  /** 年度不整合=null (要確認) */
  establishedDate: string | null;
  /** established_date から算出 (会計月 4=1, 3=12) */
  month: number | null;
  hadMeeting: boolean;
  hadLifeplan: boolean;
  policyCollected: boolean;
  hadProposal: boolean;
  householdId: string;
  /** データ検疫フラグ。要確認判定に使用 */
  _issues: string[];
}

// ----------------------------------------
// 予算・目標行
// ----------------------------------------
export interface SalesTargetRow {
  line: SalesLine;
  fiscalYear: number;
  scopeType: 'all' | 'group' | 'individual';
  /** all→'ALL', group→group_id, individual→owner_id */
  scopeId: string;
  /** 会計月 1-12 (4月=1, 3月=12) */
  month: number;
  amount: number;
}

// ----------------------------------------
// グローバルフィルタ状態 (画面間保持)
// ----------------------------------------
export interface SalesPerfFilter {
  line: LineFilter;
  fiscalYear: number;
  periodMode: 'full' | 'h1' | 'h2' | 'single';
  singleMonth?: number;          // periodMode='single' 時の会計月 (1-12)
  ownerId?: string;              // 担当者 (担当ロールは非表示・自分固定)
  groupId?: string;
  confidenceScenario: ConfidenceAgg;
  insurer?: string;
  productType?: string;
  channel?: string;
}

// ----------------------------------------
// マスタ型
// ----------------------------------------
export interface SalesPerfUser {
  id: string;
  name: string;
  groupId: string;
  role: 'general' | 'manager' | 'admin';
}

export interface SalesPerfGroup {
  id: string;
  name: string;
  memberIds: string[];
  managerIds: string[];
}

export interface SalesPerfInsurer {
  id: string;
  name: string;
  line: SalesLine | 'both';
}

export interface SalesPerfProductType {
  id: string;
  name: string;
  line: SalesLine;
}

export interface SalesPerfChannel {
  id: string;
  name: string;
}

export interface SalesPerfMasters {
  users: SalesPerfUser[];
  groups: SalesPerfGroup[];
  insurers: SalesPerfInsurer[];
  productTypes: SalesPerfProductType[];
  channels: SalesPerfChannel[];
}

// ----------------------------------------
// 集計結果型
// ----------------------------------------
export interface KpiSummary {
  annualBudget: number;
  confirmedCommission: number;
  /** 分母0=null */
  progressRate: number | null;
  budgetGap: number;
  /** 分母0=null */
  yoyRate: number | null;
}

export interface MonthlyPoint {
  month: number;          // 会計月 1-12
  calMonth: string;       // 'YYYY-MM' 表示用
  actual: number;
  budget: number;
  cumActual: number;
  cumBudget: number;
}

export interface ConfidenceStackPoint {
  month: number;
  calMonth: string;
  fixed: number;
  S: number;
  A: number;
  B: number;
  C: number;
  D: number;
  first: number;
}

export interface OwnerRankRow {
  ownerId: string;
  ownerName: string;
  commission: number;
  budget: number;
  /** 分母0=null */
  progressRate: number | null;
}

export interface FunnelMetrics {
  meetings: number;
  lifeplans: number;
  proposals: number;
  policyCollections: number;
  contracts: number;        // 契約世帯数
  contractCount: number;    // 契約件数
  /** 分母0=null */
  lpRate: number | null;
  /** 分母0=null */
  proposalRate: number | null;
  /** 分母0=null */
  contractRate: number | null;
  /** 分母0=null */
  avgHouseholdValue: number | null;
}

export interface DataQuality {
  total: number;
  needsReview: number;
}
