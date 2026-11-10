import { describe, it, expect } from 'vitest';
import {
  migrateRoadmapToVersioned,
  buildSeedRoadmapTemplateV1,
  SEED_ROADMAP_ITEM_DEFS,
} from '../utils/renewalMigration';
import type { RenewalCase } from '../types';

function mkCase(over: Partial<RenewalCase> = {}): RenewalCase {
  return {
    id: 'rc1',
    policyId: 'pol1',
    householdId: 'h1',
    contractorPersonId: 'p1',
    contractorName: '山田太郎',
    ownerUserId: 'u1',
    insurer: 'X損保',
    maturityDate: '2026-12-01',
    productType: 'auto',
    method: 'undecided',
    status: 'not_started',
    survey: {},
    notes: [],
    activityLog: [],
    tasks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...over,
  };
}

describe('buildSeedRoadmapTemplateV1', () => {
  it('version1・4項目(①〜④)で初期化', () => {
    const v1 = buildSeedRoadmapTemplateV1();
    expect(v1.version).toBe(1);
    expect(v1.items).toHaveLength(4);
    expect(v1.items.map((i) => i.concernKey)).toEqual([
      'home_repair',
      'fire_renewal',
      'pension',
      'medical',
    ]);
    expect(SEED_ROADMAP_ITEM_DEFS).toHaveLength(4);
  });
});

describe('migrateRoadmapToVersioned', () => {
  it('roadmap survey が無ければ roadmapVersions を付与しない', () => {
    const rc = mkCase();
    const out = migrateRoadmapToVersioned(rc);
    expect(out.roadmapVersions).toBeUndefined();
    expect(out).toBe(rc); // 不変参照で返る
  });

  it('topConcern を version1 の回答に写像', () => {
    const rc = mkCase({
      survey: { roadmap: { topConcern: 'pension', gender: 'male', ageBand: '50s', inputDate: '2026-10-01' } },
    });
    const out = migrateRoadmapToVersioned(rc, { userId: 'u9', now: '2026-10-19T00:00:00.000Z' });
    expect(out.roadmapVersions).toHaveLength(1);
    const v = out.roadmapVersions![0];
    expect(v.templateVersion).toBe(1);
    expect(v.answers).toEqual([{ itemDefId: 'rm_pension', value: true }]);
    expect(v.gender).toBe('male');
    expect(v.ageBand).toBe('50s');
    expect(v.inputDate).toBe('2026-10-01');
    expect(v.answeredByUserId).toBe('u9');
    expect(v.answeredAt).toBe('2026-10-19T00:00:00.000Z');
  });

  it('gender=couple は other に写像', () => {
    const rc = mkCase({ survey: { roadmap: { topConcern: 'medical', gender: 'couple' } } });
    const out = migrateRoadmapToVersioned(rc);
    expect(out.roadmapVersions![0].gender).toBe('other');
  });

  it('otherConcerns も写像し重複排除', () => {
    const rc = mkCase({
      survey: { roadmap: { topConcern: 'home_repair', otherConcerns: ['home_repair', 'fire_renewal'] } },
    });
    const out = migrateRoadmapToVersioned(rc);
    const ids = out.roadmapVersions![0].answers.map((a) => a.itemDefId);
    expect(ids).toEqual(['rm_home_repair', 'rm_fire_renewal']); // 重複なし
  });

  it('冪等: 既に roadmapVersions があれば変更しない', () => {
    const rc = mkCase({
      roadmapVersions: [
        { templateVersion: 2, answers: [], answeredByUserId: 'u1', answeredAt: '2026-05-01T00:00:00.000Z' },
      ],
      survey: { roadmap: { topConcern: 'pension' } },
    });
    const out = migrateRoadmapToVersioned(rc);
    expect(out).toBe(rc);
    expect(out.roadmapVersions).toHaveLength(1);
    expect(out.roadmapVersions![0].templateVersion).toBe(2);
    // 二重適用しても安定
    const twice = migrateRoadmapToVersioned(out);
    expect(twice.roadmapVersions).toHaveLength(1);
  });

  it('マッピング不能な concern は answers に含めない', () => {
    const rc = mkCase({ survey: { roadmap: { topConcern: 'inheritance' } } });
    const out = migrateRoadmapToVersioned(rc);
    expect(out.roadmapVersions![0].answers).toEqual([]);
  });
});
