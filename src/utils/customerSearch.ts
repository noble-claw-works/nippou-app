// =====================================================
// customerSearch.ts - 顧客検索ユーティリティ
// 1000件規模対応: スコアリング + インクリメンタル検索
// =====================================================
import type { Customer } from '../types';

/**
 * 検索用文字列正規化
 * NFKC 正規化 + 小文字化 + 空白除去
 */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

export interface CustomerSearchScore {
  customer: Customer;
  score: number;    // 高いほど上位
  matched: string[]; // どのフィールドがマッチしたか
}

/**
 * 顧客検索 + スコアリング
 *
 * query 空 → お気に入り > 最近接触 (30日) > status active の順
 * query あり → 各フィールド一致でスコア加算
 *   name 完全一致 +100 / 前方一致 +50 / 部分一致 +30
 *   area +20 / tags +15 / memo +5
 */
export function searchCustomers(
  customers: Customer[],
  query: string,
  options?: { activeOnly?: boolean; max?: number }
): CustomerSearchScore[] {
  const { activeOnly = false, max = 50 } = options ?? {};

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  // activeOnly フィルタ
  const pool = activeOnly ? customers.filter(c => c.status === 'active') : customers;

  const normalizedQuery = normalizeForSearch(query.trim());

  if (!normalizedQuery) {
    // query 空: お気に入り > 最近接触 > active > その他
    const scored = pool.map(customer => {
      let score = 0;
      const matched: string[] = [];

      if (customer.isFavorite) {
        score += 1000;
        matched.push('favorite');
      }

      if (customer.lastContactDate && customer.lastContactDate >= thirtyDaysAgoStr) {
        // 最近の接触ほど高スコア
        const daysAgo = Math.floor(
          (now.getTime() - new Date(customer.lastContactDate).getTime()) / (24 * 60 * 60 * 1000)
        );
        score += 500 - daysAgo * 10; // 0日前: +500, 30日前: +200
        matched.push('recent');
      }

      if (customer.status === 'active') {
        score += 100;
        matched.push('active');
      }

      return { customer, score, matched };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
  }

  // query あり: スコアリング
  const results: CustomerSearchScore[] = [];

  for (const customer of pool) {
    let score = 0;
    const matched: string[] = [];

    const normalizedName = normalizeForSearch(customer.name);

    // name スコア
    if (normalizedName === normalizedQuery) {
      score += 100;
      matched.push('name:exact');
    } else if (normalizedName.startsWith(normalizedQuery)) {
      score += 50;
      matched.push('name:prefix');
    } else if (normalizedName.includes(normalizedQuery)) {
      score += 30;
      matched.push('name:partial');
    }

    // area スコア
    const normalizedArea = normalizeForSearch(customer.area);
    if (normalizedArea.includes(normalizedQuery)) {
      score += 20;
      matched.push('area');
    }

    // tags スコア (いずれか一致)
    const tagsStr = normalizeForSearch(customer.tags.join(' '));
    if (tagsStr.includes(normalizedQuery)) {
      score += 15;
      matched.push('tags');
    }

    // memo スコア (重み低)
    const normalizedMemo = normalizeForSearch(customer.memo);
    if (normalizedMemo.includes(normalizedQuery)) {
      score += 5;
      matched.push('memo');
    }

    if (score > 0) {
      // お気に入りボーナス
      if (customer.isFavorite) score += 200;
      // 最近接触ボーナス
      if (customer.lastContactDate && customer.lastContactDate >= thirtyDaysAgoStr) {
        score += 50;
      }
      // active ボーナス
      if (customer.status === 'active') score += 10;

      results.push({ customer, score, matched });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/**
 * 顧客の表示ラベル生成
 * 「顧客名 (エリア)」形式
 */
export function getCustomerLabel(customer: Customer): string {
  if (customer.area) {
    return `${customer.name} (${customer.area})`;
  }
  return customer.name;
}

/**
 * ID から顧客を検索し表示ラベルを返す
 */
export function getCustomerLabelById(customers: Customer[], id: string | undefined): string {
  if (!id) return '';
  const c = customers.find(c => c.id === id);
  return c ? getCustomerLabel(c) : '';
}
