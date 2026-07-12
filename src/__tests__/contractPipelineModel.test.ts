// =====================================================
// contractPipelineModel.test.ts — Phase B-1: データモデル層単体テスト
// 設計書 §3・§9 準拠 (2026-07-08)
// =====================================================
import { describe, it, expect } from 'vitest';
import type {
  ContractMilestones,
  ContractTasks,
  DeficiencyItem,
  ConfidenceUnified,
} from '../types';
import {
  SALES_CHANNELS,
  PARENT_CHANNELS,
  LEAF_CHANNELS,
} from '../data/salesChannels';
import {
  getChannelPath,
  getChannelChildren,
  getChannelDisplayName,
  isLeafChannel,
} from '../utils/channelUtils';
import { OPPORTUNITIES, POLICIES, PERSONS } from '../data/seed';

// =====================================================
// §0: seed 契約者データ整合（主上指摘2026-07-12「契約者未設定はありえない」）
// =====================================================
describe('seed 契約者データ整合', () => {
  const personIds = new Set(PERSONS.map((p) => p.id));
  const personById = new Map(PERSONS.map((p) => [p.id, p]));

  it('全 Opportunity に契約者(contractorPersonId)が設定されていること', () => {
    const missing = OPPORTUNITIES.filter((o) => !o.contractorPersonId);
    expect(missing.map((o) => o.id)).toEqual([]);
  });

  it('全 Policy に契約者(contractorPersonId)が設定されていること', () => {
    const missing = POLICIES.filter((p) => !p.contractorPersonId);
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it('契約者は実在し、案件と同一世帯の Person であること', () => {
    const bad = OPPORTUNITIES.filter(
      (o) =>
        o.contractorPersonId &&
        (!personIds.has(o.contractorPersonId) ||
          personById.get(o.contractorPersonId)?.householdId !== o.householdId),
    );
    expect(bad.map((o) => `${o.id}:${o.contractorPersonId}`)).toEqual([]);
  });

  it('契約(Policy)の契約者も実在し同一世帯であること', () => {
    const bad = POLICIES.filter(
      (p) =>
        p.contractorPersonId &&
        (!personIds.has(p.contractorPersonId) ||
          personById.get(p.contractorPersonId)?.householdId !== p.householdId),
    );
    expect(bad.map((p) => `${p.id}:${p.contractorPersonId}`)).toEqual([]);
  });
});

// =====================================================
// §1: チャネルマスタ参照整合テスト
// =====================================================
describe('SalesChannel マスタ整合', () => {
  it('全チャネルのIDが一意であること', () => {
    const ids = SALES_CHANNELS.map((ch) => ch.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('親チャネルの parentId は null であること', () => {
    for (const ch of PARENT_CHANNELS) {
      expect(ch.parentId).toBeNull();
    }
  });

  it('子チャネルの parentId は存在する親IDを指すこと（参照整合）', () => {
    const parentIds = new Set(PARENT_CHANNELS.map((ch) => ch.id));
    for (const ch of LEAF_CHANNELS) {
      expect(ch.parentId).not.toBeNull();
      expect(parentIds.has(ch.parentId!)).toBe(true);
    }
  });

  it('親チャネルと子チャネルが正しく分かれていること（2階層のみ）', () => {
    // 子の parentId が、さらに子（孫）を持つ「子」を指していないこと
    const leafIds = new Set(LEAF_CHANNELS.map((ch) => ch.id));
    for (const ch of LEAF_CHANNELS) {
      // 子の parentId が葉のIDを指していない（葉に子を持てない = 2階層固定）
      expect(leafIds.has(ch.parentId!)).toBe(false);
    }
  });

  it('order が正の整数であること', () => {
    for (const ch of SALES_CHANNELS) {
      expect(ch.order).toBeGreaterThan(0);
      expect(Number.isInteger(ch.order)).toBe(true);
    }
  });
});

// =====================================================
// §2: チャネルユーティリティ関数テスト
// =====================================================
describe('getChannelPath', () => {
  it('子チャネルIDのとき [親, 子] を返すこと', () => {
    const path = getChannelPath('ch_agency_shinjuku', SALES_CHANNELS);
    expect(path).toHaveLength(2);
    expect(path[0].id).toBe('ch_agency');
    expect(path[1].id).toBe('ch_agency_shinjuku');
  });

  it('親チャネルIDのとき [親] を返すこと', () => {
    const path = getChannelPath('ch_agency', SALES_CHANNELS);
    expect(path).toHaveLength(1);
    expect(path[0].id).toBe('ch_agency');
  });

  it('存在しないIDのとき [] を返すこと', () => {
    const path = getChannelPath('ch_nonexistent', SALES_CHANNELS);
    expect(path).toHaveLength(0);
  });

  it('null/undefinedのとき [] を返すこと', () => {
    expect(getChannelPath(null, SALES_CHANNELS)).toHaveLength(0);
    expect(getChannelPath(undefined, SALES_CHANNELS)).toHaveLength(0);
  });
});

describe('getChannelChildren', () => {
  it('代理店(ch_agency)の子チャネルを正しく返すこと', () => {
    const children = getChannelChildren('ch_agency', SALES_CHANNELS);
    expect(children.length).toBeGreaterThanOrEqual(2);
    for (const ch of children) {
      expect(ch.parentId).toBe('ch_agency');
    }
  });

  it('activeOnly=true のとき isActive=false のチャネルを除外すること', () => {
    // ch_direct_visit は isActive=false
    const allChildren = getChannelChildren('ch_direct', SALES_CHANNELS, false);
    const activeOnly = getChannelChildren('ch_direct', SALES_CHANNELS, true);
    expect(allChildren.length).toBeGreaterThan(activeOnly.length);
    for (const ch of activeOnly) {
      expect(ch.isActive).toBe(true);
    }
  });

  it('order で昇順ソートされていること', () => {
    const children = getChannelChildren('ch_referral', SALES_CHANNELS);
    for (let i = 1; i < children.length; i++) {
      expect(children[i].order).toBeGreaterThanOrEqual(children[i - 1].order);
    }
  });
});

describe('getChannelDisplayName', () => {
  it('子チャネルのとき "親名 / 子名" を返すこと', () => {
    const name = getChannelDisplayName('ch_agency_shinjuku', SALES_CHANNELS);
    expect(name).toBe('代理店 / ABC代理店 新宿支店');
  });

  it('親チャネルのとき "親名" を返すこと', () => {
    const name = getChannelDisplayName('ch_referral', SALES_CHANNELS);
    expect(name).toBe('紹介');
  });

  it('存在しないIDのとき fallback を返すこと', () => {
    const name = getChannelDisplayName('ch_nonexistent', SALES_CHANNELS);
    expect(name).toBe('―');

    const customFallback = getChannelDisplayName('ch_nonexistent', SALES_CHANNELS, '未設定');
    expect(customFallback).toBe('未設定');
  });
});

describe('isLeafChannel', () => {
  it('子チャネルIDのとき true を返すこと', () => {
    expect(isLeafChannel('ch_agency_shinjuku', SALES_CHANNELS)).toBe(true);
    expect(isLeafChannel('ch_referral_existing', SALES_CHANNELS)).toBe(true);
  });

  it('親チャネルIDのとき false を返すこと', () => {
    // §9確定: Opportunity.channelId は葉(子)必須。親のみ選択は不可
    expect(isLeafChannel('ch_agency', SALES_CHANNELS)).toBe(false);
    expect(isLeafChannel('ch_referral', SALES_CHANNELS)).toBe(false);
  });

  it('null/undefined のとき false を返すこと', () => {
    expect(isLeafChannel(null, SALES_CHANNELS)).toBe(false);
    expect(isLeafChannel(undefined, SALES_CHANNELS)).toBe(false);
  });
});

// =====================================================
// §3: Opportunity seed 整合テスト
// =====================================================
describe('Opportunity seed — B-1 デモ値整合', () => {
  it('channelId を持つ Opportunity は葉チャネルを指すこと（§9確定）', () => {
    const oppsWithChannel = OPPORTUNITIES.filter((opp) => opp.channelId);
    expect(oppsWithChannel.length).toBeGreaterThan(0); // デモ値がある前提

    for (const opp of oppsWithChannel) {
      const isLeaf = isLeafChannel(opp.channelId, SALES_CHANNELS);
      expect(isLeaf).toBe(true);
    }
  });

  it('confidence を持つ Opportunity は ConfidenceUnified の値であること', () => {
    const validValues: ConfidenceUnified[] = ['fixed', 'S', 'A', 'B', 'C', 'D'];
    const oppsWithConf = OPPORTUNITIES.filter((opp) => opp.confidence !== undefined);
    expect(oppsWithConf.length).toBeGreaterThan(0);

    for (const opp of oppsWithConf) {
      expect(validValues).toContain(opp.confidence);
    }
  });

  it('milestones を持つ Opportunity の日付は YYYY-MM-DD 形式であること', () => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const oppsWithMilestones = OPPORTUNITIES.filter((opp) => opp.milestones);

    for (const opp of oppsWithMilestones) {
      const m = opp.milestones!;
      for (const [key, val] of Object.entries(m)) {
        if (val !== undefined) {
          expect(dateRe.test(val), `milestones.${key} の値 "${val}" が YYYY-MM-DD でない`).toBe(true);
        }
      }
    }
  });

  it('deficiencies を持つ Opportunity の各 DeficiencyItem は id/item/resolved を持つこと', () => {
    const oppsWithDef = OPPORTUNITIES.filter(
      (opp) => opp.deficiencies && opp.deficiencies.length > 0
    );
    expect(oppsWithDef.length).toBeGreaterThan(0);

    for (const opp of oppsWithDef) {
      for (const def of opp.deficiencies!) {
        expect(def.id).toBeTruthy();
        expect(def.item).toBeTruthy();
        expect(typeof def.resolved).toBe('boolean');
      }
    }
  });

  it('insuredTasks を持つ Opportunity の各 InsuredTaskState は personId を持つこと', () => {
    const oppsWithTasks = OPPORTUNITIES.filter(
      (opp) => opp.insuredTasks && opp.insuredTasks.length > 0
    );
    expect(oppsWithTasks.length).toBeGreaterThan(0);

    for (const opp of oppsWithTasks) {
      for (const task of opp.insuredTasks!) {
        expect(task.personId).toBeTruthy();
        expect(typeof task.intentSheetDone).toBe('boolean');
        expect(typeof task.signatureDone).toBe('boolean');
      }
    }
  });

  it('opp1 が正しい B-1 デモ値を持つこと', () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === 'opp1');
    expect(opp1).toBeDefined();
    expect(opp1!.channelId).toBe('ch_referral_existing');
    expect(opp1!.confidence).toBe('A');
    expect(opp1!.milestones?.firstConsultDate).toBeTruthy();
    expect(opp1!.milestones?.proposalDate).toBeTruthy();
    expect(opp1!.insuredTasks).toHaveLength(1);
  });

  it('opp3 が損保の始期日(inceptionDate)を持つこと（§9確定）', () => {
    const opp3 = OPPORTUNITIES.find((o) => o.id === 'opp3');
    expect(opp3).toBeDefined();
    expect(opp3!.milestones?.inceptionDate).toBeTruthy();
    expect(opp3!.contractTasks).toBeDefined();
    expect(typeof opp3!.contractTasks!.policyCollected).toBe('boolean');
  });
});

// =====================================================
// §4: 型制約テスト（TypeScript 実行時の整合）
// =====================================================
describe('ContractMilestones 型整合', () => {
  it('全フィールドが任意（undefined可）であること', () => {
    // 空オブジェクトが ContractMilestones として有効
    const empty: ContractMilestones = {};
    expect(empty).toBeDefined();

    const full: ContractMilestones = {
      firstConsultDate: '2026-01-01',
      lifePlanDate: '2026-01-15',
      proposalDate: '2026-02-01',
      applicationDate: '2026-03-01',
      establishedDate: '2026-03-15',
      inceptionDate: '2026-04-01',
      lostDate: undefined,
    };
    expect(full.establishedDate).toBe('2026-03-15');
    expect(full.inceptionDate).toBe('2026-04-01'); // ★主上確定フィールド
  });
});

describe('ContractTasks 型整合', () => {
  it('policyCollected/policyReviewed は boolean 必須フィールドであること', () => {
    const tasks: ContractTasks = {
      policyCollected: false,
      policyReviewed: false,
    };
    expect(tasks.policyCollected).toBe(false);
    expect(tasks.policyReviewed).toBe(false);
  });
});

describe('DeficiencyItem 型整合', () => {
  it('転記方式: item は自由記述であること（固定選択肢でないこと）', () => {
    // §9確定: 選択式ではなく転記方式
    const defItem: DeficiencyItem = {
      id: 'test-def-1',
      item: '任意の不備項目名を転記できる',
      detail: '任意の詳細を転記できる',
      resolved: false,
    };
    expect(defItem.item).toBe('任意の不備項目名を転記できる');
    expect(defItem.resolved).toBe(false);
  });
});

describe('ConfidenceUnified 型整合', () => {
  it('統一ラダー: fixed/S/A/B/C/D の6値であること（§9確定）', () => {
    // 生損統一ラダー
    const validValues: ConfidenceUnified[] = ['fixed', 'S', 'A', 'B', 'C', 'D'];
    expect(validValues).toContain('fixed');
    expect(validValues).toContain('C'); // 損保ラダー値も生保案件で型上許容
    expect(validValues).toContain('D');
    expect(validValues).toHaveLength(6);
  });
});

// =====================================================
// §5: proposalProducts firstYearCommission テスト
// =====================================================
describe('ProposalProduct.firstYearCommission', () => {
  it('opp1 の proposalProducts に firstYearCommission があること', () => {
    const opp1 = OPPORTUNITIES.find((o) => o.id === 'opp1');
    expect(opp1).toBeDefined();
    const pp1 = opp1!.proposalProducts.find((p) => p.id === 'pp1');
    expect(pp1?.firstYearCommission).toBe(57600);

    const pp2 = opp1!.proposalProducts.find((p) => p.id === 'pp2');
    expect(pp2?.firstYearCommission).toBe(19200);
  });

  it('firstYearCommission は任意フィールドで既存 seed に未設定でもエラーにならないこと', () => {
    // firstYearCommission を持たない案件（opp4）
    const opp4 = OPPORTUNITIES.find((o) => o.id === 'opp4');
    expect(opp4).toBeDefined();
    // proposalProducts が空または firstYearCommission が undefined でも問題ない
    for (const pp of opp4!.proposalProducts) {
      expect(pp.firstYearCommission === undefined || typeof pp.firstYearCommission === 'number').toBe(true);
    }
  });
});
