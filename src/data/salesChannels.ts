// =====================================================
// 販売チャネルマスタ (SalesChannel) — Phase B-1
// 設計書 §3-1 / §4 準拠 (2026-07-08)
// 親子2階層: parentId=null が分類(親)、値あり が詳細(子)
// 案件 (Opportunity.channelId) は必ず葉(子)を指す
// =====================================================
import type { SalesChannel } from '../types';

// ───────────────────────────────────────────
// 親チャネル (分類)
// ───────────────────────────────────────────
const parentAgency: SalesChannel = {
  id: 'ch_agency',
  name: '代理店',
  parentId: null,
  isActive: true,
  order: 1,
  memo: '代理店経由の案件',
};

const parentReferral: SalesChannel = {
  id: 'ch_referral',
  name: '紹介',
  parentId: null,
  isActive: true,
  order: 2,
  memo: '紹介による新規顧客獲得',
};

const parentWeb: SalesChannel = {
  id: 'ch_web',
  name: 'Web反響',
  parentId: null,
  isActive: true,
  order: 3,
  memo: 'Webサイト・SNS経由',
};

const parentDirect: SalesChannel = {
  id: 'ch_direct',
  name: '直接営業',
  parentId: null,
  isActive: true,
  order: 4,
  memo: 'テレアポ・飛び込み等',
};

// ───────────────────────────────────────────
// 子チャネル (詳細) — 代理店配下
// ───────────────────────────────────────────
const agencyShinjuku: SalesChannel = {
  id: 'ch_agency_shinjuku',
  name: 'ABC代理店 新宿支店',
  parentId: 'ch_agency',
  isActive: true,
  order: 1,
};

const agencyYokohama: SalesChannel = {
  id: 'ch_agency_yokohama',
  name: 'ABC代理店 横浜支店',
  parentId: 'ch_agency',
  isActive: true,
  order: 2,
};

const agencyBagwell: SalesChannel = {
  id: 'ch_agency_bagwell',
  name: '袋井ライフ代理店',
  parentId: 'ch_agency',
  isActive: true,
  order: 3,
};

// ───────────────────────────────────────────
// 子チャネル — 紹介配下
// ───────────────────────────────────────────
const referralExisting: SalesChannel = {
  id: 'ch_referral_existing',
  name: '既契約者紹介',
  parentId: 'ch_referral',
  isActive: true,
  order: 1,
};

const referralEmployee: SalesChannel = {
  id: 'ch_referral_employee',
  name: '勤務先紹介',
  parentId: 'ch_referral',
  isActive: true,
  order: 2,
};

const referralFamily: SalesChannel = {
  id: 'ch_referral_family',
  name: '家族・親族紹介',
  parentId: 'ch_referral',
  isActive: true,
  order: 3,
};

// ───────────────────────────────────────────
// 子チャネル — Web反響配下
// ───────────────────────────────────────────
const webHomepage: SalesChannel = {
  id: 'ch_web_homepage',
  name: 'ホームページ問い合わせ',
  parentId: 'ch_web',
  isActive: true,
  order: 1,
};

const webSns: SalesChannel = {
  id: 'ch_web_sns',
  name: 'SNS反響',
  parentId: 'ch_web',
  isActive: true,
  order: 2,
};

// ───────────────────────────────────────────
// 子チャネル — 直接営業配下
// ───────────────────────────────────────────
const directTelephone: SalesChannel = {
  id: 'ch_direct_tel',
  name: 'テレアポ',
  parentId: 'ch_direct',
  isActive: true,
  order: 1,
};

const directVisit: SalesChannel = {
  id: 'ch_direct_visit',
  name: '飛び込み訪問',
  parentId: 'ch_direct',
  isActive: false, // 廃止（例示用）
  order: 2,
  memo: '廃止チャネル（履歴の案件参照は残す）',
};

// ───────────────────────────────────────────
// エクスポート
// ───────────────────────────────────────────

/** 全チャネルマスタ（親・子を含む全レコード） */
export const SALES_CHANNELS: SalesChannel[] = [
  // 親
  parentAgency,
  parentReferral,
  parentWeb,
  parentDirect,
  // 代理店配下
  agencyShinjuku,
  agencyYokohama,
  agencyBagwell,
  // 紹介配下
  referralExisting,
  referralEmployee,
  referralFamily,
  // Web反響配下
  webHomepage,
  webSns,
  // 直接営業配下
  directTelephone,
  directVisit,
];

/** 親チャネル一覧（parentId=null） */
export const PARENT_CHANNELS: SalesChannel[] = SALES_CHANNELS.filter(
  (ch) => ch.parentId === null
);

/** 子チャネル一覧（葉ノード: parentId が値あり） */
export const LEAF_CHANNELS: SalesChannel[] = SALES_CHANNELS.filter(
  (ch) => ch.parentId !== null
);
