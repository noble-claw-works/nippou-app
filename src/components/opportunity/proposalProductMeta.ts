// proposalProductMeta.ts — 提案商品の表示ラベル・保険会社候補・id 採番・空データ
// 必須 3 項目の検証もここに置く（.tsx から関数を export すると react-refresh の lint に掛かるため）。
// ProposalProductEditModal（案件詳細）と新規案件作成③ペインで共用する（11/08 指示書 S1）。

import type { ProductCategory, ProposalProduct } from '../../types';

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
export type ProposalProductErrors = Partial<Record<'productName' | 'insurer' | 'monthlyPremium', string>>;

/** 必須 3 項目の検証。エラーが無ければ空オブジェクトを返す */
export function validateProposalProduct(form: ProposalProductDraft): ProposalProductErrors {
  const e: ProposalProductErrors = {};
  if (!form.productName.trim()) e.productName = '商品名は必須です';
  if (!form.insurer.trim()) e.insurer = '保険会社は必須です';
  if (form.monthlyPremium <= 0) e.monthlyPremium = '月払額を入力してください';
  return e;
}
