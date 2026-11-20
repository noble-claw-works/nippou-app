// =====================================================
// renewalMigration.ts — ロードマップ回答の版管理への移行（§2.5 / PC-5）
// 既存 RenewalRoadmapSurvey → version1 スナップショットへ冪等写像。
// 純関数（store 非依存）。seed テンプレ(v1)の①〜④定義もここに集約。
// =====================================================
import type {
  RenewalCase,
  RenewalRoadmapItemDef,
  RenewalRoadmapTemplateVersion,
  RenewalRoadmapVersion,
  RenewalRoadmapAnswer,
  RenewalConcern,
} from "../types";

// ─────────────────────────────────────────────────────
// seed テンプレ v1 — ANALYSIS_DOC5 の現行①〜④関心事項に合わせ初期化
// item id は版をまたいで安定（concernKey と 1:1）
// ─────────────────────────────────────────────────────
export const SEED_ROADMAP_ITEM_DEFS: RenewalRoadmapItemDef[] = [
  { id: "rm_home_repair", order: 1, label: "住宅修繕", concernKey: "home_repair", active: true },
  { id: "rm_fire_renewal", order: 2, label: "火災更新", concernKey: "fire_renewal", active: true },
  { id: "rm_pension", order: 3, label: "老後年金", concernKey: "pension", active: true },
  { id: "rm_medical", order: 4, label: "医療・介護", concernKey: "medical", active: true },
];

/** seed テンプレ v1 を生成（store 初期化・移行の両方で使用） */
export function buildSeedRoadmapTemplateV1(
  editedByUserId = "system",
  editedAt = "1970-01-01T00:00:00.000Z",
): RenewalRoadmapTemplateVersion {
  return {
    version: 1,
    items: SEED_ROADMAP_ITEM_DEFS.map((i) => ({ ...i })),
    editedByUserId,
    editedAt,
  };
}

/** concernKey → seed item id の逆引き */
function itemIdForConcern(concern: RenewalConcern): string | undefined {
  return SEED_ROADMAP_ITEM_DEFS.find((i) => i.concernKey === concern)?.id;
}

/**
 * 既存 survey.roadmap を version1 の RenewalRoadmapVersion に写像（冪等）。
 * - 既に roadmapVersions が存在すればそのまま返す（再適用安全）。
 * - roadmap survey が無ければ roadmapVersions は付与しない。
 */
export function migrateRoadmapToVersioned(
  rc: RenewalCase,
  opts?: { userId?: string; now?: string },
): RenewalCase {
  // 冪等: 既に版が存在するなら何もしない
  if (rc.roadmapVersions && rc.roadmapVersions.length > 0) return rc;

  const roadmap = rc.survey?.roadmap;
  if (!roadmap) return rc;

  const answeredAt = opts?.now ?? rc.updatedAt ?? new Date().toISOString();
  const answeredByUserId = opts?.userId ?? rc.ownerUserId ?? "system";

  const answers: RenewalRoadmapAnswer[] = [];

  // topConcern（単一の最重要関心）をチェック回答として写像
  if (roadmap.topConcern) {
    const itemId = itemIdForConcern(roadmap.topConcern);
    if (itemId) answers.push({ itemDefId: itemId, value: true });
  }
  // otherConcerns（複数選択）があれば写像
  if (Array.isArray(roadmap.otherConcerns)) {
    for (const key of roadmap.otherConcerns) {
      const itemId = itemIdForConcern(key as RenewalConcern);
      if (itemId && !answers.some((a) => a.itemDefId === itemId)) {
        answers.push({ itemDefId: itemId, value: true });
      }
    }
  }

  // gender 写像（survey: couple|male|female → version: male|female|other）
  let gender: RenewalRoadmapVersion["gender"];
  if (roadmap.gender === "male") gender = "male";
  else if (roadmap.gender === "female") gender = "female";
  else if (roadmap.gender === "couple") gender = "other";

  const version1: RenewalRoadmapVersion = {
    templateVersion: 1,
    answers,
    inputDate: roadmap.inputDate,
    gender,
    ageBand: roadmap.ageBand,
    answeredByUserId,
    answeredAt,
  };

  return { ...rc, roadmapVersions: [version1] };
}
