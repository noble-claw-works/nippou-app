// =====================================================
// シードデータ — 商談案件 1〜3 (opp1/opp2/opp3)
// =====================================================
import type {
  ContractMilestones,
  DeficiencyItem,
  ProposalRound,
  Task,
  TaskPriority,
} from "../../types";
import { d, f } from "./helpers";
import { mkOpp } from "./opportunities-helpers";

export const OPP_DATA_1_3 = [
  mkOpp("opp1", "c1", "u1", "GILSON家 生命保険 見直し", "proposal", "open", {
    targetPersonIds: ["p_c1_head"],
    productCategories: ["life", "medical"],
    proposalProducts: [
      {
        id: "pp1",
        productCategory: "life",
        productName: "収入保障保険",
        insurer: "明治安田生命",
        insuredPersonId: "p_c1_head",
        monthlyPremium: 4800,
        faceAmount: 5000000,
        firstYearCommission: 57600,
        firstConsultDate: d(30),
        memo: "60歳満了",
      },
      {
        id: "pp2",
        productCategory: "medical",
        productName: "医療保険エクセルエイド",
        insurer: "東京海上日動あんしん生命",
        insuredPersonId: "p_c1_head",
        monthlyPremium: 3200,
        firstYearCommission: 19200,
        firstConsultDate: d(30),
        memo: "1入院60日型",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: "設計書の説明と質問対応",
    nextActionDate: f(3),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(30) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "fact_finding",
        changedAt: d(21) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "needs_analysis",
        changedAt: d(14) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "proposal",
        changedAt: d(5) + "T10:00:00",
        changedByUserId: "u1",
        note: "設計書を提示しました",
      },
    ],
    memo: "配偶者分も追加提案を検討中",
    tags: ["生命保険", "見直し"],
    expectedCloseDate: f(21),
    // ★ B-1 デモ値
    contractorPersonId: "p_c1_head",
    channelId: "ch_referral_existing",
    confidence: "A" as const,
    milestones: {
      firstConsultDate: d(30),
      lifePlanDate: d(18),
      proposalDate: d(5),
    } as ContractMilestones,
    // ★ 提案履歴 (ProposalRound)
    proposals: [
      {
        id: "pr_opp1_1",
        roundNo: 1,
        proposalDate: d(14),
        productIds: ["pp1"],
        memo: "収入保障保険の第1回設計書を提示。保障額・保険料について説明。",
        createdAt: d(14) + "T10:00:00",
      },
      {
        id: "pr_opp1_2",
        roundNo: 2,
        proposalDate: d(5),
        productIds: ["pp1", "pp2"],
        memo: "医療保険を追加提案。配偶者分の追加設計書も準備中とお伝えした。",
        createdAt: d(5) + "T10:00:00",
      },
    ] as ProposalRound[],
    // ★ Batch-B デモ用タスク（項目3）
    tasks: [
      {
        id: "task_opp1_01",
        title: "設計書の内容を確認・説明",
        done: true,
        doneDate: d(4),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(5) + "T09:00:00",
      },
      {
        id: "task_opp1_02",
        title: "意向確認書の署名取得",
        done: true,
        doneDate: d(3),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(5) + "T09:00:00",
      },
      {
        id: "task_opp1_03",
        title: "配偶者分の追加設計書作成",
        done: false,
        dueDate: f(2),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T10:00:00",
      },
      {
        id: "task_opp1_04",
        title: "申込書類一式の準備",
        done: false,
        dueDate: f(7),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T10:00:00",
      },
    ] as Task[],
  }),

  // c2: 齋藤 和久 — 医療保険 (negotiation ステージ)
  mkOpp("opp2", "c2", "u1", "齋藤家 医療保険 新規", "negotiation", "open", {
    targetPersonIds: ["p_c2_head"],
    productCategories: ["medical"],
    proposalProducts: [
      {
        id: "pp3",
        productCategory: "medical",
        productName: "メディカルKit R",
        insurer: "ソニー生命",
        insuredPersonId: "p_c2_head",
        monthlyPremium: 5500,
        firstYearCommission: 33000,
        firstConsultDate: d(45),
        memo: "がん特約あり",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: "奥様との合同面談",
    nextActionDate: f(7),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(45) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "fact_finding",
        changedAt: d(30) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "needs_analysis",
        changedAt: d(20) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "proposal",
        changedAt: d(10) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "negotiation",
        changedAt: d(3) + "T10:00:00",
        changedByUserId: "u1",
        note: "奥様が同席を希望",
      },
    ],
    memo: "奥様の同席が必要",
    tags: ["医療保険"],
    expectedCloseDate: f(14),
    // ★ B-1 デモ値
    contractorPersonId: "p_c2_head",
    channelId: "ch_agency_bagwell",
    confidence: "B" as const,
    milestones: {
      firstConsultDate: d(45),
      lifePlanDate: d(25),
      proposalDate: d(10),
    } as ContractMilestones,
    deficiencies: [
      {
        id: "def_opp2_1",
        item: "告知書未記入",
        detail: "貧血歴の記載漏れ",
        resolved: false,
      } as DeficiencyItem,
    ],
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp2_1",
        roundNo: 1,
        proposalDate: d(10),
        productIds: ["pp3"],
        memo: "メディカルKit R 第1回設計書を提示。がん特約の詳細を説明。",
        createdAt: d(10) + "T10:00:00",
      },
      {
        id: "pr_opp2_2",
        roundNo: 2,
        proposalDate: d(3),
        productIds: ["pp3"],
        memo: "告知上の費用等を考慮した修正設計書を提示。奶様機宜を考慮中。",
        createdAt: d(3) + "T16:30:00",
      },
    ] as ProposalRound[],
    // F3: タスク登載（自動生成タスク+手動タスク混在）
    tasks: [
      {
        id: "task_opp2_01",
        title: "告知書記入内容の確認・修正依頼",
        done: false,
        dueDate: f(3),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T10:00:00",
      },
      {
        id: "task_opp2_02",
        title: "奥様の同席面談のアポ取得",
        done: false,
        dueDate: f(7),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T10:00:00",
        sourceMasterId: "tpl_opp_negotiation_1",
      },
      {
        id: "task_opp2_03",
        title: "ニーズ分析シートの記入・送付",
        done: true,
        doneDate: d(5),
        priority: "medium" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(10) + "T09:00:00",
        sourceMasterId: "tpl_opp_proposal_1",
      },
    ] as Task[],
  }),

  // c4: 水野 幸重 — 自動車保険 (application ステージ)
  mkOpp("opp3", "c4", "u1", "水野家 自動車保険 更新", "application", "open", {
    targetPersonIds: ["p_c4_head"],
    tasks: [
      {
        id: "task_opp3_01",
        title: "申込書の記入内容を確認",
        done: true,
        doneDate: d(2),
        priority: "high" as TaskPriority,
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T09:00:00",
      },
      {
        id: "task_opp3_02",
        title: "本人確認書類の回収",
        done: false,
        priority: "medium" as TaskPriority,
        dueDate: f(2),
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T09:00:00",
      },
      {
        id: "task_opp3_03",
        title: "初回保険料の口座振替手続き案内",
        done: false,
        priority: "medium" as TaskPriority,
        dueDate: f(5),
        rolledOver: false,
        scope: "opportunity" as const,
        createdAt: d(3) + "T09:00:00",
      },
    ],
    productCategories: ["auto"],
    proposalProducts: [
      {
        id: "pp4",
        productCategory: "auto",
        productName: "タフ・くるまの保険",
        insurer: "東京海上日動",
        insuredPersonId: "p_c4_head",
        monthlyPremium: 7200,
        firstConsultDate: d(20),
        memo: "弁護士費用特約付",
      },
    ],
    needsAnalysisDone: true,
    illustrationProvided: true,
    nextAction: "申込書の回収",
    nextActionDate: f(2),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(20) + "T09:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "proposal",
        changedAt: d(7) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "negotiation",
        changedAt: d(4) + "T10:00:00",
        changedByUserId: "u1",
      },
      {
        stage: "application",
        changedAt: d(1) + "T10:00:00",
        changedByUserId: "u1",
        note: "申込意向確認済み",
      },
    ],
    memo: "7月更新案件",
    tags: ["自動車保険", "更新"],
    expectedCloseDate: f(5),
    // ★ B-1 デモ値
    contractorPersonId: "p_c4_head",
    channelId: "ch_direct_tel",
    confidence: "S" as const,
    milestones: {
      firstConsultDate: d(20),
      proposalDate: d(7),
      applicationDate: d(1),
      inceptionDate: f(30),
    } as ContractMilestones,
    // ★ 提案履歴
    proposals: [
      {
        id: "pr_opp3_1",
        roundNo: 1,
        proposalDate: d(7),
        productIds: ["pp4"],
        memo: "タフ・くるまの保険 自動車更新。弁護士費用特約の付加を提案。",
        createdAt: d(7) + "T10:00:00",
      },
    ] as ProposalRound[],
  }),

  // c6: 鈴木 花代 — 生命保険 見直し (approach ステージ)
];
