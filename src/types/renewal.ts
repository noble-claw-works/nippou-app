// =====================================================
// renewal.ts — 更新案件 (RenewalCase) 型
// 損害保険の契約更新対応ワークリスト。SPEC-RENEWAL-LIST.md 準拠。
// =====================================================
import type { ProductCategory } from "./opportunity";
import type { Task } from "./task";

// ProductCategory の import は型整合性チェック目的（将来のマッピング関数用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ProductCategoryRef = ProductCategory;

/** 更新対応の進捗ステータス */
export type RenewalStatus = "not_started" | "in_progress" | "completed";
// not_started=未対応 / in_progress=対応中 / completed=完了

/** 手続き手段（更新方法）。一覧「手続き手段」列 + renewal2「更新方法」 */
export type RenewalMethod =
  | "rakuraku_seat" // らくらく着座
  | "phone" // 電話募集
  | "visit" // 来店
  | "mail" // 郵送
  | "renewal_lost" // 更新落ち
  | "undecided"; // 未定

/** 一覧「種目」列。保険種目（元シート語彙）。ProductCategory と別語彙なので独自 union */
export type RenewalProductType =
  | "auto" // 自動車
  | "fire" // 火災
  | "shinshu" // 新種
  | "cho_hoken" // 超保険
  | "cho_biz" // 超ビジ
  | "cargo" // 貨物
  | "movable" // 動産
  | "liability" // 賠償
  | "other";

// ─────────────────────────────────────────────────────
// アンケート（renewal2〜4 の実項目を型化）
// ─────────────────────────────────────────────────────

/** renewal2 コンサル入力画面 */
export interface RenewalConsultSurvey {
  firstContactDate?: string; // ファーストコンタクト日 (YYYY-MM-DD)
  earlyRenewalUnavailable?: boolean; // お客様都合 早期更新不可
  procedureDate?: string; // 手続日
  flyerDistribution?: "delivered" | "forgot" | "refused"; // チラシ配布: お渡しした/失念/受取拒否
  renewedPremium?: number; // 更改保険料（年間・長期分割は1年分）
  renewalMethod?: RenewalMethod; // 更新方法
  // 算出値（満期日-FC日 / 満期日-更改日）は保存せず UI 側で導出（型に持たせない）
}

/** renewal3 ロードマップチラシ（ヒアリング） */
export interface RenewalRoadmapSurvey {
  inputDate?: string; // 入力日
  gender?: "couple" | "male" | "female"; // 性別: ご夫婦/男性/女性
  ageBand?: "20s" | "30s" | "40s" | "50s" | "60s" | "70s_over"; // 年代
  topConcern?: RenewalConcern; // 一番気になる項目
  otherConcernFree?: string; // その他気になる項目 直接入力
  otherConcerns?: string[]; // その他気になる項目①〜④（最大4）
}

/** ロードマップの「気になる項目」候補 */
export type RenewalConcern =
  | "home_repair" // 住宅修繕
  | "fire_renewal" // 火災更新
  | "pension" // 老後年金
  | "medical" // 医療・介護
  | "education" // 教育資金
  | "asset_building" // 資産形成
  | "inheritance" // 相続・贈与
  | "none" // 特になし
  | "other";

/** renewal4 特約追加・提案項目（チェック中心） */
export interface RenewalRiderSurvey {
  // 【自動車】
  autoRentaRider?: boolean; // レンタ特約
  autoVehicleCoverage?: boolean; // 車両
  autoDapAttachOrSwitch?: boolean; // DAP付帯または切替
  // 提案・アクション
  myPairApp?: boolean; // 【マイペアプリ】
  superInsurance?: boolean; // 【超保険化】
  officialLine?: boolean; // 公式LINE登録
  lifePlanProposed?: boolean; // ライフプラン提案＆実施
  lifeInsProposed?: boolean; // 生保提案
  mortgageRefiProposed?: boolean; // 住宅ローン借換提案
  npsSurvey?: boolean; // NPSアンケート
}

/** ペアMTG時入力 */
export type SuperInsuranceLossStatus = "not_started" | "in_progress" | "done";
// not_started=未対応 / in_progress=対応中 / done=対応済

export interface RenewalPairMtgSurvey {
  plannedMethod?: RenewalMethod; // 予定手続き手段
  superInsuranceLoss?: SuperInsuranceLossStatus; // 超保険化損
}

/** 証券回収ステータス */
export type PolicyCollectStatus =
  | "not_collected" // 未回収
  | "collecting" // 回収中
  | "collected"; // 回収済

export interface RenewalPolicyCollectSurvey {
  auto?: PolicyCollectStatus; // 自動車
  fire?: PolicyCollectStatus; // 火災
  other?: PolicyCollectStatus; // その他
  life?: PolicyCollectStatus; // 生保
}

/** RenewalCase.survey ラッパー */
export interface RenewalSurvey {
  consult?: RenewalConsultSurvey; // renewal2
  roadmap?: RenewalRoadmapSurvey; // renewal3
  rider?: RenewalRiderSurvey; // renewal4
  pairMtg?: RenewalPairMtgSurvey; // ペアMTG時入力
  policyCollect?: RenewalPolicyCollectSurvey; // 証券回収
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────
// 対応履歴（追記型・削除なし）
// ─────────────────────────────────────────────────────
export type RenewalLogKind =
  | "note" // 留意事項の追記
  | "status_change" // ステータス変更
  | "survey_saved" // アンケート保存
  | "contact" // 顧客接触記録
  | "task" // タスク操作
  | "other";

export interface RenewalActivityLog {
  id: string;
  kind: RenewalLogKind;
  body: string; // 記録内容（自由記述 or 自動生成文）
  byUserId: string; // 記入者 User.id
  at: string; // ISO datetime（時系列表示に使用）
}

/** 留意事項（自由記述・複数行、日付＋記入者つき） */
export interface RenewalNote {
  id: string;
  body: string;
  byUserId: string;
  at: string; // ISO datetime
}

// ─────────────────────────────────────────────────────
// RenewalCase 本体
// ─────────────────────────────────────────────────────
export interface RenewalCase {
  id: string;
  policyId: string; // 元となった損保契約 Policy.id
  householdId: string; // 世帯 Household.id
  contractorPersonId: string; // 契約者 Person.id
  // ── 一覧表示列（seed 時点で Policy/Household から焼き込み。表示の安定性優先）──
  contractorName: string; // 契約者（表示名）
  groupName?: string; // 団体名（法人・団体契約のみ。個人は空）
  ownerUserId: string; // 担当者 User.id
  insurer: string; // 保険会社
  maturityDate: string; // 満期日 (YYYY-MM-DD)。並べ替えキー
  productType: RenewalProductType; // 種目
  prevYearPremium?: number; // 前年保険料（円）
  method: RenewalMethod; // 手続き手段（一覧列 = survey.consult.renewalMethod と同期可）
  // ── ワークリスト状態 ──
  status: RenewalStatus; // 未対応/対応中/完了
  survey: RenewalSurvey; // アンケート回答（renewal2〜4）
  notes: RenewalNote[]; // 留意事項（追記型）
  activityLog: RenewalActivityLog[]; // 対応履歴（追記型・削除なし）
  tasks: Task[]; // 更新案件スコープのタスク（既存 Task 流用）
  createdAt: string;
  updatedAt: string;
}
