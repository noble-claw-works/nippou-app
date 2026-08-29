// =====================================================
// contractNormalize.test.ts — 正規化ロジック単体テスト
// =====================================================
import { describe, it, expect } from 'vitest';
import { parseAmount, normalizeConfidence, resolveMonth, normalizeContract, normalizeAll } from '../lib/contractNormalize';
import type { SalesContractRaw } from '../types';

// ----------------------------------------
// parseAmount
// ----------------------------------------
describe('parseAmount', () => {
  it('純数値はそのまま返す', () => {
    expect(parseAmount(12345)).toBe(12345);
  });

  it('0は0として返す', () => {
    expect(parseAmount(0)).toBe(0);
  });

  it('"500万円" → 5000000', () => {
    expect(parseAmount('500万円')).toBe(5_000_000);
  });

  it('"1.5百万円" → 1500000', () => {
    expect(parseAmount('1.5百万円')).toBe(1_500_000);
  });

  it('"22000ドル" → null (変換不能)', () => {
    expect(parseAmount('22000ドル')).toBeNull();
  });

  it('"3,200,000" カンマ区切り → 3200000', () => {
    expect(parseAmount('3,200,000')).toBe(3_200_000);
  });

  it('"￥450000" 全角円記号 → 450000', () => {
    expect(parseAmount('￥450000')).toBe(450000);
  });

  it('空文字 → null', () => {
    expect(parseAmount('')).toBeNull();
  });

  it('null → null', () => {
    expect(parseAmount(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(parseAmount(undefined)).toBeNull();
  });

  it('数値文字列 "123456" → 123456', () => {
    expect(parseAmount('123456')).toBe(123456);
  });

  it('"100万" (円なし) → 1000000', () => {
    expect(parseAmount('100万')).toBe(1_000_000);
  });
});

// ----------------------------------------
// normalizeConfidence
// ----------------------------------------
describe('normalizeConfidence', () => {
  describe('生保', () => {
    it('"確定" → fixed', () => {
      expect(normalizeConfidence('確定', 'life')).toBe('fixed');
    });
    it('"S" → S', () => {
      expect(normalizeConfidence('S', 'life')).toBe('S');
    });
    it('"s" (小文字) → S', () => {
      expect(normalizeConfidence('s', 'life')).toBe('S');
    });
    it('"初見" → first', () => {
      expect(normalizeConfidence('初見', 'life')).toBe('first');
    });
    it('"確定済" (ゆれ) → unknown', () => {
      expect(normalizeConfidence('確定済', 'life')).toBe('unknown');
    });
    it('null → unknown', () => {
      expect(normalizeConfidence(null, 'life')).toBe('unknown');
    });
  });

  describe('損保', () => {
    it('"確定" → fixed', () => {
      expect(normalizeConfidence('確定', 'nonlife')).toBe('fixed');
    });
    it('"C" → C', () => {
      expect(normalizeConfidence('C', 'nonlife')).toBe('C');
    });
    it('"D" → D', () => {
      expect(normalizeConfidence('D', 'nonlife')).toBe('D');
    });
    it('"初見" は損保マップにない → unknown', () => {
      expect(normalizeConfidence('初見', 'nonlife')).toBe('unknown');
    });
  });
});

// ----------------------------------------
// resolveMonth
// ----------------------------------------
describe('resolveMonth', () => {
  it('FY2025内の4月日付 (会計月1) を返す', () => {
    const issues: string[] = [];
    expect(resolveMonth('2025-04-15', 2025, issues)).toBe(1);
    expect(issues).toHaveLength(0);
  });

  it('FY2025内の3月日付 (会計月12) を返す', () => {
    const issues: string[] = [];
    expect(resolveMonth('2026-03-31', 2025, issues)).toBe(12);
    expect(issues).toHaveLength(0);
  });

  it('会計年度境界: 3月末はFY2025の月12', () => {
    const issues: string[] = [];
    const result = resolveMonth('2026-03-31', 2025, issues);
    expect(result).toBe(12);
    expect(issues).toHaveLength(0);
  });

  it('会計年度境界: 4月頭は翌FY (FY2026=月1)', () => {
    const issues: string[] = [];
    const result = resolveMonth('2026-04-01', 2025, issues);
    expect(result).toBeNull();
    expect(issues).toContain('fy_mismatch');
  });

  it('FY2025外の日付 → null + fy_mismatch', () => {
    const issues: string[] = [];
    expect(resolveMonth('2023-05-15', 2025, issues)).toBeNull();
    expect(issues).toContain('fy_mismatch');
  });

  it('undefined → null (issue なし)', () => {
    const issues: string[] = [];
    expect(resolveMonth(undefined, 2025, issues)).toBeNull();
    expect(issues).toHaveLength(0);
  });
});

// ----------------------------------------
// normalizeContract (単件)
// ----------------------------------------
const baseRaw: SalesContractRaw = {
  id: 'test_001',
  line: 'life',
  fiscal_year: 2025,
  owner_id: 'sp_u1',
  group_id: 'sp_g1',
  channel: '紹介',
  partner: '直接',
  insurer: '第一生命',
  product_type: '終身保険',
  monthly_premium: 30000,
  first_year_commission: 216000,
  confidence: '確定',
  established_date: '2025-07-10',
  had_meeting: true,
  had_lifeplan: true,
  policy_collected: true,
  had_proposal: true,
  household_id: 'hh_001',
};

describe('normalizeContract', () => {
  it('正常データは issue なし', () => {
    const result = normalizeContract(baseRaw);
    expect(result._issues).toHaveLength(0);
    expect(result.monthlyPremium).toBe(30000);
    expect(result.firstYearCommission).toBe(216000);
    expect(result.confidenceCode).toBe('fixed');
    expect(result.confidenceAgg).toBe('fixed');
    expect(result.month).toBe(4); // 7月=会計月4
  });

  it('"500万円" → monthlyPremium=5000000 + premium_unparseable なし(変換成功)', () => {
    const raw = { ...baseRaw, monthly_premium: '500万円' };
    const result = normalizeContract(raw);
    expect(result.monthlyPremium).toBe(5_000_000);
    expect(result._issues).not.toContain('premium_unparseable');
  });

  it('"22000ドル" → monthlyPremium=null + premium_unparseable', () => {
    const raw = { ...baseRaw, monthly_premium: '22000ドル' };
    const result = normalizeContract(raw);
    expect(result.monthlyPremium).toBeNull();
    expect(result._issues).toContain('premium_unparseable');
  });

  it('fy_mismatch: FY2025外のestablished_date → establishedDate=null + issue', () => {
    const raw = { ...baseRaw, established_date: '2023-05-15' };
    const result = normalizeContract(raw);
    expect(result.establishedDate).toBeNull();
    expect(result.month).toBeNull();
    expect(result._issues).toContain('fy_mismatch');
  });

  it('insurer="" → "未分類" + missing_insurer', () => {
    const raw = { ...baseRaw, insurer: '' };
    const result = normalizeContract(raw);
    expect(result.insurer).toBe('未分類');
    expect(result._issues).toContain('missing_insurer');
  });

  it('channel="" → "未分類" + missing_channel', () => {
    const raw = { ...baseRaw, channel: '' };
    const result = normalizeContract(raw);
    expect(result.channel).toBe('未分類');
    expect(result._issues).toContain('missing_channel');
  });

  it('product_type="" → "未分類" + missing_product_type', () => {
    const raw = { ...baseRaw, product_type: '' };
    const result = normalizeContract(raw);
    expect(result.productType).toBe('未分類');
    expect(result._issues).toContain('missing_product_type');
  });

  it('first_year_commission="" → null (issue なし: 空文字は許容)', () => {
    const raw = { ...baseRaw, first_year_commission: '' };
    const result = normalizeContract(raw);
    expect(result.firstYearCommission).toBeNull();
  });

  it('確度"確定済" → unknown + confidence_unknown', () => {
    const raw = { ...baseRaw, confidence: '確定済' };
    const result = normalizeContract(raw);
    expect(result.confidenceCode).toBe('unknown');
    expect(result._issues).toContain('confidence_unknown');
  });

  it('確度"s"(小文字) → S (正規化成功, issue なし)', () => {
    const raw = { ...baseRaw, line: 'nonlife' as const, confidence: 's' };
    const result = normalizeContract(raw);
    expect(result.confidenceCode).toBe('S');
    expect(result._issues).not.toContain('confidence_unknown');
  });

  it('had_meeting/lifeplan デフォルト false', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { had_meeting: _hm, had_lifeplan: _hl, policy_collected: _pc, had_proposal: _hp, ...rest } = baseRaw;
    const result = normalizeContract({ ...rest });
    expect(result.hadMeeting).toBe(false);
    expect(result.hadLifeplan).toBe(false);
    expect(result.policyCollected).toBe(false);
    expect(result.hadProposal).toBe(false);
  });
});

// ----------------------------------------
// normalizeAll (全件)
// ----------------------------------------
describe('normalizeAll', () => {
  it('空配列 → 空配列', () => {
    expect(normalizeAll([])).toHaveLength(0);
  });

  it('正常データ1件は issue なし', () => {
    const results = normalizeAll([baseRaw]);
    expect(results[0]._issues).toHaveLength(0);
  });

  it('要確認 (issues>0) の件数を正しくカウントできる', () => {
    const raws: SalesContractRaw[] = [
      baseRaw,
      { ...baseRaw, id: 'test_002', monthly_premium: '22000ドル' },
      { ...baseRaw, id: 'test_003', insurer: '' },
    ];
    const results = normalizeAll(raws);
    const needsReview = results.filter(r => r._issues.length > 0).length;
    expect(needsReview).toBe(2);
  });
});
