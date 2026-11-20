// proposalProductMeta.ts — 提案商品の表示ラベル・保険会社候補・id 採番・空データ
// 必須 3 項目の検証もここに置く（.tsx から関数を export すると react-refresh の lint に掛かるため）。
// ProposalProductEditModal（案件詳細）と新規案件作成③ペインで共用する（11/08 指示書 S1）。

import type { PaymentMode, ProductCategory, ProposalProduct } from '../../types';

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  monthly: '月払',
  annual: '年払',
  lump: '一時払',
};

/** 払込方法（未設定は月払） */
export function paymentModeOf(p: { paymentMode?: PaymentMode }): PaymentMode {
  return p.paymentMode ?? 'monthly';
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  life:      '生命保険',
  medical:   '医療保険',
  cancer:    'がん保険',
  income:    '就業不能保険',
  nursing:   '介護保険',
  savings:   '学資・貯蓄',
  auto:      '自動車保険',
  fire:      '火災保険',
  liability: '賠償責任保険',
  other:     'その他',
};

export const COMMON_INSURERS = [
  '東京海上日動', '損保ジャパン', '三井住友海上',
  '明治安田生命', 'ソニー生命', '住友生命', '日本生命',
  '第一生命', '東京海上日動あんしん生命', 'アフラック',
  'その他',
];

/** 提案商品の id を採番する（旧 ProposalProductEditModal の uid() と同じ形式） */
export function newProposalProductId(): string {
  return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 追加フォームの初期値（id 以外） */
export function emptyProposalProduct(): Omit<ProposalProduct, 'id'> {
  return {
    productCategory: 'life',
    productName: '',
    insurer: '',
    insuredPersonId: '',
    monthlyPremium: 0,
    faceAmount: undefined,
    memo: '',
  };
}

export type ProposalProductDraft = Omit<ProposalProduct, 'id'>;
export type ProposalProductErrors = Partial<
  Record<
    | 'productName' | 'insurer' | 'contractorPersonId' | 'monthlyPremium'
    | 'annualPremium' | 'lumpSumPremium' | 'firstYearCommission',
    string
  >
>;

/** 画面上の項目順（D7: 最初のエラー欄へ移動するための順序） */
export const PRODUCT_FIELD_ORDER = [
  'productName', 'insurer', 'contractorPersonId', 'monthlyPremium',
  'annualPremium', 'lumpSumPremium', 'firstYearCommission',
] as const;

/** D7: エラーの最初の欄へスクロール+フォーカス（data-pp-field 属性で探す） */
export function focusFirstProductError(errors: ProposalProductErrors, root: ParentNode = document): string | undefined {
  const key = PRODUCT_FIELD_ORDER.find((k) => errors[k]);
  if (!key) return undefined;
  const el = root.querySelector<HTMLElement>(`[data-pp-field="${key}"]`);
  if (el) {
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    el.focus?.();
  }
  return key;
}

/** 必須 3 項目の検証。エラーが無ければ空オブジェクトを返す */
export function validateProposalProduct(form: ProposalProductDraft): ProposalProductErrors {
  const e: ProposalProductErrors = {};
  if (!form.productName.trim()) e.productName = "商品名は必須です";
  if (!form.insurer.trim()) e.insurer = "保険会社は必須です";
  // D4: 契約者は必須（案件の契約者の継承はしない。欠落データは読み込み時に世帯主で補完済み）
  if (!form.contractorPersonId) e.contractorPersonId = "契約者は必須です";
  // E2: 払込方法ごとに必須の金額欄が変わる（月払のみ月払額必須）
  const mode = paymentModeOf(form);
  const bad = (n: number | undefined) => n === undefined || !(n > 0);
  if (mode === 'monthly' && bad(form.monthlyPremium))
    e.monthlyPremium = "0より大きい金額を入力してください";
  if (mode === 'annual' && bad(form.annualPremium))
    e.annualPremium = "0より大きい金額を入力してください";
  if (mode === 'lump' && bad(form.lumpSumPremium))
    e.lumpSumPremium = "0より大きい金額を入力してください";
  const c = form.firstYearCommission;
  if (c !== undefined && (!Number.isInteger(c) || c < 0))
    e.firstYearCommission = "0以上の整数（円）で入力してください";
  return e;
}

/** 提案商品の契約者: 商品に無ければ案件の契約者を継承 */
export function effectiveContractorId(
  p: { contractorPersonId?: string },
  opp: { contractorPersonId?: string },
): string | undefined {
  return p.contractorPersonId || opp.contractorPersonId || undefined;
}

/** 提案商品のチャネル: 商品に無ければ案件のチャネルを継承 */
export function effectiveChannelId(
  p: { channelId?: string },
  opp: { channelId?: string },
): string | undefined {
  return p.channelId || opp.channelId || undefined;
}

/** E2: 一覧表示用の保険料ラベル（払込方法ごと） */
export function premiumLabel(p: {
  paymentMode?: PaymentMode;
  monthlyPremium: number;
  annualPremium?: number;
  lumpSumPremium?: number;
}): string {
  const mode = paymentModeOf(p);
  const amount =
    mode === 'annual' ? p.annualPremium ?? 0 : mode === 'lump' ? p.lumpSumPremium ?? 0 : p.monthlyPremium ?? 0;
  return `${PAYMENT_MODE_LABELS[mode]} ¥${amount.toLocaleString()}`;
}

/** D5: 案件の初年度手数料合計（未入力の商品は 0 扱い） */
export function totalFirstYearCommission(products: { firstYearCommission?: number }[]): number {
  return products.reduce((s, p) => s + (p.firstYearCommission ?? 0), 0);
}
