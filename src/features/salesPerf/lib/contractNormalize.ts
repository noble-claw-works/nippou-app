// =====================================================
// salesPerf/lib/contractNormalize.ts — 生データ正規化
// =====================================================
import type { SalesContractRaw, SalesContract, SalesLine, ConfidenceCode } from '../types';
import {
  CONFIDENCE_NORMALIZE_LIFE,
  CONFIDENCE_NORMALIZE_NONLIFE,
  CONFIDENCE_TO_AGG,
  dateToFiscalMonth,
} from '../constants';

// ----------------------------------------
// 金額パーサー
// ----------------------------------------
/**
 * 金額文字列 / 数値を number | null に変換。
 * - 純数値: そのまま返す (0 も有効)
 * - カンマ区切り: 除去してパース
 * - 全角数字・全角円記号: 正規化してパース
 * - "500万円": 万換算 → 5000000
 * - "1.5百万円": 百万換算 → 1500000
 * - "22000ドル" 等: 変換不能 → null
 * - 空文字 / undefined / null: null
 */
export function parseAmount(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined) return null;

  // 数値型はそのまま (0も有効)
  if (typeof raw === 'number') {
    return isFinite(raw) ? raw : null;
  }

  const s = String(raw).trim();
  if (s === '') return null;

  // 全角数字 → 半角
  const normalized = s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[￥¥]/g, '')   // 円記号除去 (全角・半角)
    .replace(/,/g, '')        // カンマ除去
    .replace(/\s/g, '');      // 空白除去

  // 「X万円」形式
  const manMatch = normalized.match(/^(-?\d+(?:\.\d+)?)万円?$/);
  if (manMatch) {
    const v = parseFloat(manMatch[1]);
    return isFinite(v) ? Math.round(v * 10000) : null;
  }

  // 「X百万円」形式
  const hyakuManMatch = normalized.match(/^(-?\d+(?:\.\d+)?)百万円?$/);
  if (hyakuManMatch) {
    const v = parseFloat(hyakuManMatch[1]);
    return isFinite(v) ? Math.round(v * 1000000) : null;
  }

  // 純数字
  const pureMatch = normalized.match(/^-?\d+(?:\.\d+)?$/);
  if (pureMatch) {
    const v = parseFloat(normalized);
    return isFinite(v) ? Math.round(v) : null;
  }

  // 変換不能
  return null;
}

// ----------------------------------------
// 確度正規化
// ----------------------------------------
/**
 * 表記ゆれのある確度文字列を正規化された ConfidenceCode に変換。
 * 対応なし → 'unknown'
 */
export function normalizeConfidence(
  raw: string | undefined | null,
  line: SalesLine,
): ConfidenceCode | 'unknown' {
  if (!raw) return 'unknown';
  const s = raw.trim();
  const map = line === 'life' ? CONFIDENCE_NORMALIZE_LIFE : CONFIDENCE_NORMALIZE_NONLIFE;
  return (map[s] as ConfidenceCode) ?? 'unknown';
}

// ----------------------------------------
// 会計月解決
// ----------------------------------------
/**
 * established_date (YYYY-MM-DD) から会計月 (1-12) を算出。
 * 指定 fiscalYear 外の日付は null + _issues に 'fy_mismatch' を追加。
 */
export function resolveMonth(
  establishedDate: string | undefined | null,
  fiscalYear: number,
  issues: string[],
): number | null {
  if (!establishedDate) return null;
  const month = dateToFiscalMonth(establishedDate, fiscalYear);
  if (month === null) {
    issues.push('fy_mismatch');
    return null;
  }
  return month;
}

// ----------------------------------------
// 必須フィールド欠損補完
// ----------------------------------------
function fillMissing(val: string | undefined | null, fieldName: string, issues: string[]): string {
  if (!val || val.trim() === '') {
    issues.push(`missing_${fieldName}`);
    return '未分類';
  }
  return val.trim();
}

// ----------------------------------------
// 単件正規化
// ----------------------------------------
export function normalizeContract(raw: SalesContractRaw): SalesContract {
  const issues: string[] = [];

  // 金額正規化
  const monthlyPremium = parseAmount(raw.monthly_premium);
  if (monthlyPremium === null && raw.monthly_premium !== undefined && raw.monthly_premium !== null && raw.monthly_premium !== '' && raw.monthly_premium !== 0) {
    issues.push('premium_unparseable');
  }

  const firstYearCommission = parseAmount(raw.first_year_commission);
  if (firstYearCommission === null && raw.first_year_commission !== undefined && raw.first_year_commission !== null && raw.first_year_commission !== '') {
    const rawStr = String(raw.first_year_commission).trim();
    if (rawStr !== '' && rawStr !== '0') {
      issues.push('commission_unparseable');
    }
  }

  // 確度正規化
  const confidenceCode = normalizeConfidence(raw.confidence, raw.line);
  if (confidenceCode === 'unknown' && raw.confidence) {
    issues.push('confidence_unknown');
  }
  const confidenceAgg = confidenceCode !== 'unknown' ? CONFIDENCE_TO_AGG[confidenceCode] : null;

  // 月解決
  const month = resolveMonth(raw.established_date, raw.fiscal_year, issues);

  // established_date 正規化
  const establishedDate = issues.includes('fy_mismatch') ? null : (raw.established_date ?? null);

  // 必須フィールド欠損補完
  const insurer = fillMissing(raw.insurer, 'insurer', issues);
  const channel = fillMissing(raw.channel, 'channel', issues);
  const productType = fillMissing(raw.product_type, 'product_type', issues);

  return {
    id: raw.id,
    line: raw.line,
    fiscalYear: raw.fiscal_year,
    ownerId: raw.owner_id,
    groupId: raw.group_id ?? '未分類',
    channel,
    partner: raw.partner || '未分類',
    insurer,
    productType,
    monthlyPremium,
    firstYearCommission,
    confidenceCode,
    confidenceAgg,
    establishedDate,
    month,
    hadMeeting: raw.had_meeting ?? false,
    hadLifeplan: raw.had_lifeplan ?? false,
    policyCollected: raw.policy_collected ?? false,
    hadProposal: raw.had_proposal ?? false,
    householdId: raw.household_id || `anon_${raw.id}`,
    _issues: issues,
  };
}

// ----------------------------------------
// 全件正規化
// ----------------------------------------
/**
 * 生データ配列を一括正規化。
 * _issues.length > 0 の件は要確認扱い。
 * 金額系 null は集計除外、件数系は可能な範囲で計上。
 */
export function normalizeAll(raws: SalesContractRaw[]): SalesContract[] {
  return raws.map(normalizeContract);
}
