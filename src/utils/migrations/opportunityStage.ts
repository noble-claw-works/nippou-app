// =====================================================
// migrations/opportunityStage.ts — 旧9段 → 7段の読み込み時変換（B1・冪等）
// SEED_VERSION は上げない（テスターデータ保持）。localStorage 読込直後と seed に適用する。
// 変換対象: 案件 stage / stageHistory[].stage / 提案商品 stage / タスクテンプレ triggerStage
// 7段の値は触らない＝2 回適用しても結果が同じ。変更が無ければ同一参照を返す。
// =====================================================
import type { Opportunity, OpportunityStage, TaskTemplate } from "../../types";
import { isLegacyStage, normalizeStage } from "../opportunityStage";

const conv = (s: OpportunityStage | undefined) => (s === undefined ? s : normalizeStage(s));

export function migrateOpportunityStage(o: Opportunity): Opportunity {
  const stageLegacy = isLegacyStage(o.stage);
  const histLegacy = (o.stageHistory ?? []).some((h) => isLegacyStage(h.stage));
  const prodLegacy = (o.proposalProducts ?? []).some((p) => p.stage !== undefined && isLegacyStage(p.stage));
  if (!stageLegacy && !histLegacy && !prodLegacy) return o;
  return {
    ...o,
    stage: normalizeStage(o.stage),
    stageHistory: (o.stageHistory ?? []).map((h) =>
      isLegacyStage(h.stage) ? { ...h, stage: normalizeStage(h.stage) } : h,
    ),
    proposalProducts: (o.proposalProducts ?? []).map((p) =>
      p.stage !== undefined && isLegacyStage(p.stage) ? { ...p, stage: conv(p.stage) } : p,
    ),
  };
}

export function migrateOpportunitiesStage(opps: Opportunity[]): Opportunity[] {
  const out = opps.map(migrateOpportunityStage);
  return out.some((o, i) => o !== opps[i]) ? out : opps;
}

/** タスクテンプレの発火段（triggerStage）。重複テンプレの整理はしない（Q3） */
export function migrateTaskTemplatesStage(tpls: TaskTemplate[]): TaskTemplate[] {
  const out = tpls.map((t) =>
    t.triggerStage !== undefined && isLegacyStage(t.triggerStage)
      ? { ...t, triggerStage: normalizeStage(t.triggerStage) }
      : t,
  );
  return out.some((t, i) => t !== tpls[i]) ? out : tpls;
}
