// =====================================================
// renewalLabels.ts — 更新案件ラベルマップ + select options
// =====================================================
import type {
  RenewalStatus,
  RenewalMethod,
  RenewalProductType,
  RenewalConcern,
  SuperInsuranceLossStatus,
  PolicyCollectStatus,
} from "../types/renewal";

// ─────────────────────────────────────────────────────
// ラベルマップ
// ─────────────────────────────────────────────────────

export const RENEWAL_STATUS_LABEL: Record<RenewalStatus, string> = {
  not_started: "未対応",
  in_progress: "対応中",
  completed: "完了",
};

export const RENEWAL_METHOD_LABEL: Record<RenewalMethod, string> = {
  rakuraku_seat: "らくらく着座",
  phone: "電話募集",
  visit: "来店",
  mail: "郵送",
  renewal_lost: "更新落ち",
  undecided: "未定",
};

export const RENEWAL_PRODUCT_TYPE_LABEL: Record<RenewalProductType, string> = {
  auto: "自動車",
  fire: "火災",
  shinshu: "新種",
  cho_hoken: "超保険",
  cho_biz: "超ビジ",
  cargo: "貨物",
  movable: "動産",
  liability: "賠償",
  other: "その他",
};

export const RENEWAL_CONCERN_LABEL: Record<RenewalConcern, string> = {
  home_repair: "住宅修繕",
  fire_renewal: "火災更新",
  pension: "老後年金",
  medical: "医療・介護",
  education: "教育資金",
  asset_building: "資産形成",
  inheritance: "相続・贈与",
  none: "特になし",
  other: "その他",
};

export const RENEWAL_FLYER_LABEL: Record<
  "delivered" | "forgot" | "refused",
  string
> = {
  delivered: "お渡しした",
  forgot: "失念",
  refused: "受取拒否",
};

export const RENEWAL_GENDER_LABEL: Record<
  "couple" | "male" | "female",
  string
> = {
  couple: "ご夫婦",
  male: "男性",
  female: "女性",
};

export const RENEWAL_AGE_BAND_LABEL: Record<
  "20s" | "30s" | "40s" | "50s" | "60s" | "70s_over",
  string
> = {
  "20s": "20代",
  "30s": "30代",
  "40s": "40代",
  "50s": "50代",
  "60s": "60代",
  "70s_over": "70代以上",
};

// ─────────────────────────────────────────────────────
// select options（ラベルマップの entries から生成）
// ─────────────────────────────────────────────────────

export const RENEWAL_STATUS_OPTIONS = (
  Object.entries(RENEWAL_STATUS_LABEL) as [RenewalStatus, string][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_METHOD_OPTIONS = (
  Object.entries(RENEWAL_METHOD_LABEL) as [RenewalMethod, string][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_PRODUCT_TYPE_OPTIONS = (
  Object.entries(RENEWAL_PRODUCT_TYPE_LABEL) as [RenewalProductType, string][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_CONCERN_OPTIONS = (
  Object.entries(RENEWAL_CONCERN_LABEL) as [RenewalConcern, string][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_FLYER_OPTIONS = (
  Object.entries(RENEWAL_FLYER_LABEL) as [
    "delivered" | "forgot" | "refused",
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_GENDER_OPTIONS = (
  Object.entries(RENEWAL_GENDER_LABEL) as [
    "couple" | "male" | "female",
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_AGE_BAND_OPTIONS = (
  Object.entries(RENEWAL_AGE_BAND_LABEL) as [
    "20s" | "30s" | "40s" | "50s" | "60s" | "70s_over",
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_SUPER_INS_LOSS_LABEL: Record<
  SuperInsuranceLossStatus,
  string
> = {
  not_started: "未対応",
  in_progress: "対応中",
  done: "対応済",
};

export const RENEWAL_SUPER_INS_LOSS_OPTIONS = (
  Object.entries(RENEWAL_SUPER_INS_LOSS_LABEL) as [
    SuperInsuranceLossStatus,
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export const RENEWAL_POLICY_COLLECT_LABEL: Record<PolicyCollectStatus, string> =
  {
    not_collected: "未回収",
    collecting: "回収中",
    collected: "回収済",
  };

export const RENEWAL_POLICY_COLLECT_OPTIONS = (
  Object.entries(RENEWAL_POLICY_COLLECT_LABEL) as [
    PolicyCollectStatus,
    string,
  ][]
).map(([value, label]) => ({ value, label }));
