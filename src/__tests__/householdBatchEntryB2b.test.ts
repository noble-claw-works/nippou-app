// =====================================================
// 世帯まとめ入力 B-2b — 単体テスト (Vitest)
// ADR-TASK-MASTER 第2パス: syncInsuredTasks/toggleAll* 削除に伴いテスト書き換え済み
// 現在テスト対象: getMilestoneOrderWarnings / 不備操作 / duplicateDraft / toDraft / createEmptyDraft
// testing-standards 準拠: 「<条件>のとき<期待結果>」形式
// =====================================================
import { describe, test, expect } from 'vitest';
import {
  getMilestoneOrderWarnings,
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
  Opportunity,
  ContractMilestones,
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
  tasks: [],
};

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
// 2. 不備の CRUD (createEmptyDeficiency / removeDeficiency / updateDeficiency)
// ADR-TASK-MASTER: 旧 syncInsuredTasks/toggleAll* は tasks[] に統合済みにつき削除
// ─────────────────────────────────────────────────────────────
describe('createEmptyDeficiency', () => {
  test('idが非空文字列であること', () => {
    const def = createEmptyDeficiency();
    expect(typeof def.id).toBe('string');
    expect(def.id.length).toBeGreaterThan(0);
  });

  test('初期値 item は空文字・resolved は false であること', () => {
    const def = createEmptyDeficiency();
    expect(def.item).toBe('');
    expect(def.resolved).toBe(false);
  });

  test('2回生成されたIDが異なること（一意性）', () => {
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
// 3. 複製時にB-2bフィールドを引き継がないこと
// ADR-TASK-MASTER: 旧固定タスクフィールド廃止済み（tasks[] に統合）
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
    deficiencies: [{ id: 'def1', item: '告知書未記入', resolved: false }],
  });

  test('複製時にmilestonesが引き継がれないこと(undefined)', () => {
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.milestones).toBeUndefined();
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

  test('複製時に tasks は空配列でリセットされること', () => {
    // ADR-TASK-MASTER: tasks は複製時に引き継がない（新案件として再生成される）
    const dup = duplicateDraft(sourceWithB2b, {});
    expect(dup.tasks ?? []).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. createEmptyDraft の B-2bフィールド初期化
// ─────────────────────────────────────────────────────────────
describe('createEmptyDraft — B-2bフィールドの初期化', () => {
  test('新規ドラフトはmilestonesがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.milestones).toBeUndefined();
  });

  test('新規ドラフトはdeficienciesがundefinedで生成されること', () => {
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.deficiencies).toBeUndefined();
  });

  test('新規ドラフトは tasks が空配列で生成されること', () => {
    // ADR-TASK-MASTER: tasks は空配列（案件作成後に taskGenerator で生成される）
    const draft = createEmptyDraft({ householdId: 'hh1', ownerId: 'u1' });
    expect(draft.tasks ?? []).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 5. 既存案件のtoDraftはB-2bフィールドを保持すること
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
    deficiencies,
  };

  test('既存案件のmilestonesがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.milestones).toEqual(milestones);
  });

  test('既存案件のdeficienciesがドラフトに引き継がれること', () => {
    const draft = toDraft(existing);
    expect(draft.deficiencies?.[0]?.item).toBe('告知書未記入');
  });

  test('既存案件の tasks がドラフトに引き継がれること', () => {
    // ADR-TASK-MASTER: tasks は toDraft で保持される
    const existingWithTasks: Opportunity = {
      ...baseOpportunity,
      tasks: [
        { id: 'task1', title: '初回面談メモ', scope: 'opportunity', done: true,
          doneDate: '2026-06-01', sourceMasterId: 'm1', createdAt: '2026-06-01T00:00:00Z',
          rolledOver: false, priority: 'medium' },
      ],
    };
    const draft = toDraft(existingWithTasks);
    expect(draft.tasks).toHaveLength(1);
    expect(draft.tasks?.[0]?.done).toBe(true);
  });
});
