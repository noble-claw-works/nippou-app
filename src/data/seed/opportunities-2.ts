// =====================================================
// シードデータ — 商談案件 4〜5 (opp4/opp5)
// =====================================================
import type {
  ContractMilestones,
  ProposalRound,
  Task,
  TaskPriority,
} from "../../types";
import { d, f } from "./helpers";
import { mkOpp } from "./opportunities-helpers";

export const OPP_DATA_4_5 = [
  mkOpp("opp4", "c6", "u2", "鈴木家 生命保険 見直し", "approach", "open", {
    targetPersonIds: ["p_c6_head"],
    contractorPersonId: "p_c6_head",
    productCategories: ["life"],
    proposalProducts: [
      {
        id: "pp_opp4_life",
        productCategory: "life",
        productName: "定期保険スーパー割引",
        insurer: "日本生命",
        insuredPersonId: "p_c6_head",
        monthlyPremium: 3500,
        faceAmount: 20000000,
        firstYearCommission: 42000,
        memo: "暗定見積もり。子供3人分の保障設計予定。",
      },
    ],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: "家族構成ヒアリング",
    nextActionDate: f(7),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(5) + "T09:00:00",
        changedByUserId: "u2",
        note: "既存顧客からの紹介で接触",
      },
    ],
    memo: "子供3人の保障見直し",
    tags: ["生命保険", "見直し"],
    expectedCloseDate: f(60),
    // ★ B-1 デモ値
    channelId: "ch_referral_family",
    confidence: "C" as const,
    milestones: {
      firstConsultDate: d(5),
    } as ContractMilestones,
    // opp4 は approach 段階のため ProposalRound なし（暫定見積もりのみ）
  }),

  // c8: 高橋 誠 — 自動車保険 (fact_finding ステージ)
  mkOpp("opp5", "c8", "u1", "高橋家 自動車保険 新規", "fact_finding", "open", {
    targetPersonIds: ["p_c8_head"],
    contractorPersonId: "p_c8_head",
    productCategories: ["auto"],
    proposalProducts: [
      {
        id: "pp_opp5_auto",
        productCategory: "auto",
        productName: "タフ・くるまの保険(付帯)",
        insurer: "東京海上日動",
        insuredPersonId: "p_c8_head",
        monthlyPremium: 6800,
        memo: "暫定見積もり。現行保険の内容確認待ち。",
      },
    ],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: "現在の保険内容確認",
    nextActionDate: f(5),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(15) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "fact_finding",
        changedAt: d(7) + "T10:00:00",
        changedByUserId: "u1",
        note: "紹介案件、前向きな雰囲気",
      },
    ],
    memo: "紹介案件。家族全員分の保険を見直したい意向",
    tags: ["見込み", "自動車"],
    expectedCloseDate: f(30),
    // F3: タスク登載（未完了2件・完了1件）
    tasks: [
      {
        id: "task_opp5_01",
        title: "現在の自動車保険証券を確認",
        done: true,
        doneDate: d(5),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(7) + "T09:00:00",
      },
      {
        id: "task_opp5_02",
        title: "現行保険会社との更新タイミング確認",
        done: false,
        dueDate: f(5),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(7) + "T09:00:00",
        sourceMasterId: "tpl_opp_fact_finding_1",
      },
      {
        id: "task_opp5_03",
        title: "家族全員分の保険ニーズヒアリング",
        done: false,
        dueDate: f(10),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(7) + "T09:00:00",
      },
    ] as Task[],
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp5_1",
        roundNo: 1,
        proposalDate: d(7),
        productIds: ["pp_opp5_auto"],
        memo: "実況認識時に暫定見積もりを提示。現行保険の証券確認待ち。",
        createdAt: d(7) + "T10:00:00",
      },
    ] as ProposalRound[],
  }),

  // c10: 伊藤 幸子 — 医療保険 (needs_analysis ステージ)
];
