// =====================================================
// 世帯まとめ入力 B-2b — 単体テスト (Vitest)
// testing-standards 準拠: 「<条件>のとき<期待結果>」形式
// 対象: ステージ日付順序警告・被保険者タスク遅延生成/一括トグル・
//       不備の追加削除・複製時B-2bフィールドを継承しないこと
// =====================================================
import { describe, test, expect } from 'vitest';
import {
  getMilestoneOrderWarnings,
  syncInsuredTasks,
  toggleAllIntentSheet,
  toggleAllSignature,
  createEmptyDeficiency,
  removeDeficiency,
  updateDeficiency,
  duplicateDraft,
  toDraft,
  createEmptyDraft,
  MILESTONE_ORDER,
  MILESTONE_LABELS,
} from '../utils/householdBatchEntry';
import type {
  ProposalProduct,
  Opportunity,
  ContractMilestones,
  InsuredTaskState,
  DeficiencyItem,
} from '../types';

// ─── テストフィクスチャ ───────────────────────────────────────
const baseOpportunity: Opportunity = {
  id: 'opp_test',
  householdId: 'hh_test',
  ownerId: 'u1',
  title: 'テスト案件',
  stage: 'approach',
  status: 'open',
  targetPersonIds: ['p1'],
  productCategories: ['life'],
  proposalProducts: [],
  needsAnalysisDone: false,
  illustrationProvided: false,
  stageHistory: [],
  tags: [],
  memo: '',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const makeProduct = (id: string, insuredPersonId: string): ProposalProduct => ({
  id,
  productCategory: 'life',
  productName: '生保',
  insurer: '◯◯生命',
  insuredPersonId,
  monthlyPremium: 8000,
  memo: '',
});

// ─────────────────────────────────────────────────────────────
// 1. ステージ日付順序警告 (getMilestoneOrderWarnings)
// ─────────────────────────────────────────────────────────────
describe('getMilestoneOrderWarnings', () => {
  test('milestonesがundefinedのとき警告なし(空配列)を返すこと', () => {
    expect(getMilestoneOrderWarnings(undefined)).toHaveLength(0);
  });

  test('全て日付が設定されていて順序が正しいとき警告なし', () => {
    const milestones: ContractMilestones = {
      firstConsultDate: '2026-06-01',
      lifePlanDate: '2026-06-05',
      proposalDate: '2026-06-10',
      applicationDate: '2026-06-20',
      establishedDate: '2026-07-01',
    };
    expect(getMilestoneOrderWarnings(milestones)).toHaveLength(0);
  });

  test('初回相談日 > LP提案日のとき順序警告を返すこと', () => {
    const milestones: ContractMilestones = {
      firstConsultDate: '2026-06-10',
      lifePlanDate: '2026-06-05',  // 初回より前
    };
    const warnings = getMilestoneOrderWarnings(milestones);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.earlier === 'firstConsultDate' && w.later === 'lifePlanDate')).toBe(true);
  });

  test('提案日 > 申込日のとき順序警告を返すこと', () => {
    const milestones: ContractMilestones = {
      proposalDate: '2026-07-10',
      applicationDate: '2026-07-05',  // 提案より前
    };
    const warnings = getMilestoneOrderWarnings(milestones);
    expect(warnings.some(w => w.earlier === 'proposalDate' && w.later === 'applicationDate')).toBe(true);
  });

  test('一方のみ設定されているとき警告なし（比較対象がない）', () => {
    const milestones: ContractMilestones = {
      firstConsultDate: '2026-06-01',
      // lifePlanDate なし
    };
    expect(getMilestoneOrderWarnings(milestones)).toHaveLength(0);
  });

  test('lostDateとinceptionDateはMILESTONE_ORDERに含まれないので順序警告の対象外', () => {
    const milestones: ContractMilestones = {
      lostDate: '2026-05-01',
      inceptionDate: '2026-04-01',
      applicationDate: '2026-07-01',  // 申込が一番後
    };
    // lostDate/inceptionDate はMILESTONE_ORDERに入らないので警告出ない
    const warnings = getMilestoneOrderWarnings(milestones);
    expect(warnings.every(w => w.earlier !== 'lostDate' && w.earlier !== 'inceptionDate')).toBe(true);
  });

  test('MILESTONE_ORDERの定義が正しいこと', () => {
    expect(MILESTONE_ORDER).toEqual([
      'firstConsultDate',
      'lifePlanDate',
      'proposalDate',
      'applicationDate',
      'establishedDate',
    ]);
  });

  test('MILESTONE_LABELSに全7キーが定義されていること', () => {
    const keys: Array<keyof ContractMilestones> = [
      'firstConsultDate', 'lifePlanDate', 'proposalDate',
      'applicationDate', 'establishedDate', 'inceptionDate', 'lostDate',
    ];
    for (const key of keys) {
      expect(MILESTONE_LABELS[key]).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2. 被保険者タスクの遅延生成 (syncInsuredTasks)
// ─────────────────────────────────────────────────────────────
describe('syncInsuredTasks', () => {
  test('商品が0件のとき空配列を返すこと', () => {
    const result = syncInsuredTasks([], undefined);
    expect(result).toHaveLength(0);
  });

  test('商品が1件のとき被保険者が1件生成されること', () => {
    const products = [makeProduct('pp1', 'per1')];
    const result = syncInsuredTasks(products, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe('per1');
    expect(result[0].intentSheetDone).toBe(false);
    expect(result[0].signatureDone).toBe(false);
  });

  test('同じ被保険者が複数商品にいるとき重複排除されること', () => {
    const products = [
      makeProduct('pp1', 'per1'),
      makeProduct('pp2', 'per1'),  // 同じper1
      makeProduct('pp3', 'per2'),
    ];
    const result = syncInsuredTasks(products, undefined);
    expect(result).toHaveLength(2);
    const personIds = result.map(t => t.personId);
    expect(personIds).toContain('per1');
    expect(personIds).toContain('per2');
  });

  test('既存のタスクがある場合、既存を保持して不足分だけ追加すること', () => {
    const products = [
      makeProduct('pp1', 'per1'),
      makeProduct('pp2', 'per2'),
    ];
    const existing: InsuredTaskState[] = [
      { personId: 'per1', intentSheetDone: true, intentSheetDate: '2026-07-01', signatureDone: false },
    ];
    const result = syncInsuredTasks(products, existing);
    expect(result).toHaveLength(2);
    const per1Task = result.find(t => t.personId === 'per1');
    expect(per1Task?.intentSheetDone).toBe(true);  // 既存を保持
    const per2Task = result.find(t => t.personId === 'per2');
    expect(per2Task?.intentSheetDone).toBe(false);  // 新規追加
  });

  test('insuredPersonIdが空文字の商品は無視されること', () => {
    const products = [
      makeProduct('pp1', ''),   // 空文字
      makeProduct('pp2', 'per1'),
    ];
    const result = syncInsuredTasks(products, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe('per1');
  });
});

// ─────────────────────────────────────────────────────────────
// 3. 一括トグル (toggleAllIntentSheet / toggleAllSignature)
// ─────────────────────────────────────────────────────────────
describe('toggleAllIntentSheet', () => {
  const tasks: InsuredTaskState[] = [
    { personId: 'per1', intentSheetDone: false, signatureDone: false },
    { personId: 'per2', intentSheetDone: false, signatureDone: false },
  ];

  test('allDone=trueのとき全員の意向シートがチェックされること', () => {
    const result = toggleAllIntentSheet(tasks, true, '2026-07-11');
    expect(result.every(t => t.intentSheetDone)).toBe(true);
  });

  test('allDone=trueのとき日付が当日で設定されること', () => {
    const result = toggleAllIntentSheet(tasks, true, '2026-07-11');
    expect(result.every(t => t.intentSheetDate === '2026-07-11')).toBe(true);
  });

  test('allDone=trueのとき既に日付があれば既存を維持すること', () => {
    const tasksWithDate: InsuredTaskState[] = [
      { personId: 'per1', intentSheetDone: true, intentSheetDate: '2026-07-01', signatureDone: false },
    ];
    const result = toggleAllIntentSheet(tasksWithDate, true, '2026-07-11');
    expect(result[0].intentSheetDate).toBe('2026-07-01');  // 既存の日付を維持
  });

  test('allDone=falseのとき全員のチェックが外れること', () => {
    const checkedTasks: InsuredTaskState[] = [
      { personId: 'per1', intentSheetDone: true, intentSheetDate: '2026-07-01', signatureDone: false },
      { personId: 'per2', intentSheetDone: true, intentSheetDate: '2026-07-02', signatureDone: false },
    ];
    const result = toggleAllIntentSheet(checkedTasks, false, '2026-07-11');
    expect(result.every(t => !t.intentSheetDone)).toBe(true);
  });

  test('signatureDoneには影響しないこと', () => {
    const result = toggleAllIntentSheet(tasks, true, '2026-07-11');
    expect(result.every(t => !t.signatureDone)).toBe(true);
  });
});

describe('toggleAllSignature', () => {
  const tasks: InsuredTaskState[] = [
    { personId: 'per1', intentSheetDone: false, signatureDone: false },
    { personId: 'per2', intentSheetDone: false, signatureDone: false },
  ];

  test('allDone=trueのとき全員の署名がチェックされること', () => {
    const result = toggleAllSignature(tasks, true, '2026-07-11');
    expect(result.every(t => t.signatureDone)).toBe(true);
  });

  test('allDone=trueのとき日付が当日で設定されること', () => {
    const result = toggleAllSignature(tasks, true, '2026-07-11');
    expect(result.every(t => t.signatureDate === '2026-07-11')).toBe(true);
  });

  test('allDone=falseのとき全員のチェックが外れること', () => {
    const checkedTasks: InsuredTaskState[] = [
      { personId: 'per1', intentSheetDone: false, signatureDone: true, signatureDate: '2026-07-01' },
    ];
    const result = toggleAllSignature(checkedTasks, false, '2026-07-11');
    expect(result.every(t => !t.signatureDone)).toBe(true);
  });

  test('intentSheetDoneには影響しないこと', () => {
    const result = toggleAllSignature(tasks, true, '2026-07-11');
    expect(result.every(t => !t.intentSheetDone)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 不備の追加削除 (createEmptyDeficiency / removeDeficiency / updateDeficiency)
// ─────────────────────────────────────────────────────────────
describe('createEmptyDeficiency', () => {
  test('空の不備アイテムが生成されること', () => {
    const def = createEmptyDeficiency();
    expect(def.item).toBe('');
    expect(def.resolved).toBe(false);
    expect(def.id).toBeTruthy();
  });

  test('複数回呼ぶとそれぞれ異なるIDが生成されること', () => {
    const def1 = createEmptyDeficiency();
    const def2 = createEmptyDeficiency();
    expect(def1.id).not.toBe(def2.id);
  });
});

describe('removeDeficiency', () => {
  const deficiencies: DeficiencyItem[] = [
    { id: 'def1', item: '告知書未記入', resolved: false },
    { id: 'def2', item: '署名漏れ', resolved: false },
    { id: 'def3', item: '日付未記入', resolved: true, resolvedDate: '2026-07-01' },
  ];

  test('指定IDの不備が削除されること', () => {
    const result = removeDeficiency(deficiencies, 'def2');
    expect(result).toHaveLength(2);
    expect(result.some(d => d.id === 'def2')).toBe(false);
  });

  test('存在しないIDを指定しても他の不備は変わらないこと', () => {
    const result = removeDeficiency(deficiencies, 'def_unknown');
    expect(result).toHaveLength(3);
  });

  test('元の配列を変更しないこと（非破壊）', () => {
    removeDeficiency(deficiencies, 'def1');
    expect(deficiencies).toHaveLength(3);  // 元は変わらない
  });
});

describe('updateDeficiency', () => {
  const deficiencies: DeficiencyItem[] = [
    { id: 'def1', item: '告知書未記入', resolved: false },
    { id: 'def2', item: '署名漏れ', resolved: false },
  ];

  test('指定IDの不備が更新されること', () => {
    const result = updateDeficiency(deficiencies, 'def1', { item: '修正済み', resolved: true });
    const def1 = result.find(d => d.id === 'def1');
    expect(def1?.item).toBe('修正済み');
    expect(def1?.resolved).toBe(true);
  });

  test('他の不備は変わらないこと', () => {
    const result = updateDeficiency(deficiencies, 'def1', { resolved: true });
    const def2 = result.find(d => d.id === 'def2');
    expect(def2?.resolved).toBe(false);
  });

  test('resolvedDateを設定できること', () => {
    const result = updateDeficiency(deficiencies, 'def1', { resolvedDate: '2026-07-11' });
    const def1 = result.find(d => d.id === 'def1');
    expect(def1?.resolvedDate).toBe('2026-07-11');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. 複製時にB-2bフィールドを引き継がないこと
// ─────────────────────────────────────────────────────────────
describe('duplicateDraft — B-2bフィールドの非継承', () => {
  const milestones: ContractMilestones = {
    firstConsultDate: '2026-06-01',
    proposalDate: '2026-06-10',
  };

  const sourceWithB2b = toDraft({
    ...baseOpportunity,
    channelId: 'ch_agency_shinjuku',
    confidence: 'A',
    milestones,
    contractTasks: { policyCollected: true, policyCollectDate: '2026-07-01', policyReviewed: false },
    insuredTasks: [{ personId: 'per1', intentSheetDone: true, signatureDone: false }],
    deficiencies: [{ id: 'def1', item: '告知書未記入', resolved: false }],
  });

  test('複製時にmilestonesが引き継がれないこと(undefined)', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.milestones).toBeUndefined();
  });

  test('複製時にcontractTasksが引き継がれないこと(undefined)', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.contractTasks).toBeUndefined();
  });

  test('複製時にinsuredTasksが引き継がれないこと(undefined)', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.insuredTasks).toBeUndefined();
  });

  test('複製時にdeficienciesが引き継がれないこと(undefined)', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.deficiencies).toBeUndefined();
  });

  test('複製時にchannelIdは継承されること', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.channelId).toBe('ch_agency_shinjuku');
  });

  test('複製時に確度はリセットされること', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.confidence).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. createEmptyDraft の B-2bフィールド初期化
// ─────────────────────────────────────────────────────────────
describe('createEmptyDraft — B-2bフィールドの初期化', () => {
  test('新規ドラフトはmilestonesがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.milestones).toBeUndefined();
  });

  test('新規ドラフトはcontractTasksがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.contractTasks).toBeUndefined();
  });

  test('新規ドラフトはinsuredTasksがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.insuredTasks).toBeUndefined();
  });

  test('新規ドラフトはdeficienciesがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.deficiencies).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 7. 既存案件のtoDraftはB-2bフィールドを保持すること
// ─────────────────────────────────────────────────────────────
describe('toDraft — B-2bフィールドの保持', () => {
  const milestones: ContractMilestones = {
    firstConsultDate: '2026-06-01',
    proposalDate: '2026-06-10',
    applicationDate: '2026-07-01',
  };
  const deficiencies: DeficiencyItem[] = [
    { id: 'def1', item: '告知書未記入', resolved: false },
  ];
  const existing: Opportunity = {
    ...baseOpportunity,
    milestones,
    contractTasks: { policyCollected: true, policyReviewed: false },
    insuredTasks: [{ personId: 'per1', intentSheetDone: true, signatureDone: false }],
    deficiencies,
  };

  test('既存案件のmilestonesがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.milestones).toEqual(milestones);
  });

  test('既存案件のcontractTasksがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.contractTasks?.policyCollected).toBe(true);
  });

  test('既存案件のinsuredTasksがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.insuredTasks?.[0]?.intentSheetDone).toBe(true);
  });

  test('既存案件のdeficienciesがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.deficiencies?.[0]?.item).toBe('告知書未記入');
  });
});
