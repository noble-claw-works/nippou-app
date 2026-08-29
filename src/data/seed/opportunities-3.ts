// =====================================================
// シードデータ — 商談案件 6〜8 (opp6/opp7/opp8)
// =====================================================
import type { ProposalRound, TaskPriority } from "../../types";
import { d, f } from "./helpers";
import { mkOpp } from "./opportunities-helpers";

export const OPP_DATA_6_8 = [
  mkOpp("opp6", "c10", "u3", "伊藤家 医療保険 検討", "needs_analysis", "open", {
    targetPersonIds: ["p_c10_head"],
    contractorPersonId: "p_c10_head",
    tasks: [
      {
        id: "task_opp6_01",
        title: "現在の医療保障の加入状況をヒアリング",
        done: true,
        doneDate: d(4),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(6) + "T09:00:00",
      },
      {
        id: "task_opp6_02",
        title: "入院・手術給付の希望条件を整理",
        done: false,
        priority: "medium" as TaskPriority,
        dueDate: f(4),
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(6) + "T09:00:00",
      },
      {
        id: "task_opp6_03",
        title: "がん保険とのセット提案資料を作成",
        done: false,
        priority: "low" as TaskPriority,
        dueDate: f(8),
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(6) + "T09:00:00",
      },
    ],
    productCategories: ["medical", "cancer"],
    proposalProducts: [
      {
        id: "pp_opp6_medical",
        productCategory: "medical",
        productName: "エクセルエイド 医療保険",
        insurer: "朝日生命",
        insuredPersonId: "p_c10_head",
        monthlyPremium: 4200,
        memo: "がん特約付。以前加入保険の内容を確認中。",
      },
      {
        id: "pp_opp6_cancer",
        productCategory: "cancer",
        productName: "ファン がん保険",
        insurer: "アフラック生命",
        insuredPersonId: "p_c10_head",
        monthlyPremium: 2800,
        memo: "がん診断一時金形式。母親のがん経験より希望高い。",
      },
    ],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: "ニーズ分析シート記入",
    nextActionDate: f(10),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(25) + "T09:00:00",
        changedByUserId: "u3",
      },
      {
        stage: "fact_finding",
        changedAt: d(15) + "T10:00:00",
        changedByUserId: "u3",
      },
      {
        stage: "needs_analysis",
        changedAt: d(7) + "T10:00:00",
        changedByUserId: "u3",
        note: "がんへの関心高い",
      },
    ],
    memo: "がん特約への関心が高い。母親がガン経験者",
    tags: ["医療保険", "がん保険"],
    expectedCloseDate: f(45),
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp6_1",
        roundNo: 1,
        proposalDate: d(7),
        productIds: ["pp_opp6_medical", "pp_opp6_cancer"],
        memo: "医療保険・がん保険の暫定見積もりを提示。ニーズ分析中。",
        createdAt: d(7) + "T10:00:00",
      },
    ] as ProposalRound[],
  }),

  // c1: GILSON — 受注案件 (issued / won)
  mkOpp("opp7", "c1", "u1", "GILSON家 自動車保険 受注", "issued", "won", {
    targetPersonIds: ["p_c1_head"],
    contractorPersonId: "p_c1_head",
    tasks: [
      {
        id: "task_opp7_01",
        title: "申込手続きの完了確認",
        done: true,
        doneDate: d(10),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(12) + "T09:00:00",
      },
      {
        id: "task_opp7_02",
        title: "証券のお届けと内容説明",
        done: true,
        doneDate: d(3),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(12) + "T09:00:00",
      },
      {
        id: "task_opp7_03",
        title: "次回更新時期のフォロー予定を登録",
        done: false,
        priority: "low" as TaskPriority,
        dueDate: f(20),
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(12) + "T09:00:00",
      },
    ],
    productCategories: ["auto"],
    proposalProducts: [
      {
        id: "pp5",
        productCategory: "auto",
        productName: "タフ・くるまの保険",
        insurer: "東京海上日動",
        insuredPersonId: "p_c1_head",
        monthlyPremium: 8900,
        memo: "弁護士費用特約+車両保険",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(60) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "proposal",
        changedAt: d(45) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "application",
        changedAt: d(30) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "underwriting",
        changedAt: d(25) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "issued",
        changedAt: d(14) + "T10:00:00",
        changedByUserId: "u1",
        note: "証券発行完了",
      },
    ],
    memo: "継続更新を確保",
    tags: ["自動車保険", "受注済み"],
    actualCloseDate: d(14),
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp7_1",
        roundNo: 1,
        proposalDate: d(45),
        productIds: ["pp5"],
        memo: "自動車保険更新の第1回設計書を提示。車両保険・弁護士費用特約を説明。",
        createdAt: d(45) + "T10:00:00",
      },
      {
        id: "pr_opp7_2",
        roundNo: 2,
        proposalDate: d(30),
        productIds: ["pp5"],
        memo: "申込内容確認。申込書提出。",
        createdAt: d(30) + "T10:00:00",
      },
    ] as ProposalRound[],
  }),

  // c2: 齋藤 — 失注案件
  mkOpp("opp8", "c2", "u1", "齋藤家 生命保険 (失注)", "lost", "lost", {
    targetPersonIds: ["p_c2_head"],
    contractorPersonId: "p_c2_head",
    productCategories: ["life"],
    proposalProducts: [
      {
        id: "pp_opp8_life",
        productCategory: "life",
        productName: "定期保険ドリーム",
        insurer: "明治安田生命",
        insuredPersonId: "p_c2_head",
        monthlyPremium: 5200,
        faceAmount: 20000000,
        firstYearCommission: 62400,
        memo: "失注。他社より安い見積もりが出たため。",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(90) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "proposal",
        changedAt: d(60) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "negotiation",
        changedAt: d(45) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "lost",
        changedAt: d(30) + "T10:00:00",
        changedByUserId: "u1",
        note: "他社に決まった",
      },
    ],
    lostReason: "competitor",
    lostReasonDetail: "他社代理店からより安い見積もりが出た",
    memo: "",
    tags: [],
    actualCloseDate: d(30),
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp8_1",
        roundNo: 1,
        proposalDate: d(60),
        productIds: ["pp_opp8_life"],
        memo: "定期保険ドリームの第1回設計書を提示。保障額と保険料の説明。",
        createdAt: d(60) + "T10:00:00",
      },
      {
        id: "pr_opp8_2",
        roundNo: 2,
        proposalDate: d(45),
        productIds: ["pp_opp8_life"],
        memo: "保険料山消しの修正設計書を提示。最終的に他社が安く失注。",
        createdAt: d(45) + "T10:00:00",
      },
    ] as ProposalRound[],
  }),

  // c3: 暁和化学ゴム — 法人 火災保険 (underwriting)
];
