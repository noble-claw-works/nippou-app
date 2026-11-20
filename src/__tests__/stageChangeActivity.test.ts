import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store';
import { buildStageChangeBlock, recordStageChangeActivity } from '../utils/stageChangeActivity';

describe('A2: ステージ変更の活動履歴記録', () => {
  beforeEach(() => {
    useAppStore.setState({ reports: [], currentUserId: 'u1' });
  });

  it('メモ付きでブロックを組み立てる', () => {
    const b = buildStageChangeBlock('r1', { id: 'o1', title: 't', stage: 'approach' }, 'proposal', ' 理由A ', new Date(2026, 10, 20, 9, 5));
    expect(b.opportunityId).toBe('o1');
    expect(b.memo).toBe('変更メモ: 理由A');
    expect(b.startTime).toBe('09:05');
    expect(b.title).toContain('→');
  });

  it('メモ無しでも 1 件記録し、memo は空', () => {
    const b = buildStageChangeBlock('r1', { id: 'o1', title: 't', stage: 'approach' }, 'proposal', undefined);
    expect(b.memo).toBe('');
  });

  it('当日日報が無ければ作成して 1 件追加、あれば再利用', () => {
    const opp = { id: 'o1', title: 't', stage: 'approach' as const };
    const now = new Date(2026, 10, 20, 10, 0);
    recordStageChangeActivity(useAppStore.getState(), opp, 'proposal', 'メモ', now);
    let reports = useAppStore.getState().reports;
    expect(reports).toHaveLength(1);
    expect(reports[0].blocks).toHaveLength(1);
    expect(reports[0].blocks[0].opportunityId).toBe('o1');
    recordStageChangeActivity(useAppStore.getState(), opp, 'issued', undefined, now);
    reports = useAppStore.getState().reports;
    expect(reports).toHaveLength(1);
    expect(reports[0].blocks).toHaveLength(2);
  });
});
