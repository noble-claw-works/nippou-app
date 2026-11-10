// =====================================================
// シードデータ — 商談案件 9〜11/demo1 (opp9/opp10/opp11/opp_demo1)
// =====================================================
import type {
  ContractMilestones,
  ProposalRound,
  Task,
  TaskPriority,
} from "../../types";
import { d, f } from "./helpers";
import { mkOpp } from "./opportunities-helpers";

export const OPP_DATA_9_DEMO1 = [
  mkOpp(
    "opp9",
    "c3",
    "u1",
    "暁和化学ゴム 工場火災保険",
    "underwriting",
    "open",
    {
      contractorPersonId: "p_c3_head",
      productCategories: ["fire"],
      proposalProducts: [
        {
          id: "pp6",
          productCategory: "fire",
          productName: "企業総合保険",
          insurer: "損保ジャパン",
          insuredPersonId: "",
          monthlyPremium: 45000,
          faceAmount: 200000000,
          memo: "工場・在庫一式",
        },
      ],
      needsAnalysisDone: true,
      illustrationProvided: true,
      nextAction: "査定結果待ち",
      nextActionDate: f(14),
      stageHistory: [
        {
          stage: "approach",
          changedAt: d(40) + "T09:00:00",
          changedByUserId: "u1",
        },
        {
          stage: "fact_finding",
          changedAt: d(30) + "T10:00:00",
          changedByUserId: "u1",
        },
        {
          stage: "needs_analysis",
          changedAt: d(21) + "T10:00:00",
          changedByUserId: "u1",
        },
        {
          stage: "proposal",
          changedAt: d(14) + "T10:00:00",
          changedByUserId: "u1",
        },
        {
          stage: "application",
          changedAt: d(7) + "T10:00:00",
          changedByUserId: "u1",
        },
        {
          stage: "underwriting",
          changedAt: d(3) + "T10:00:00",
          changedByUserId: "u1",
          note: "申込書提出済み、査定待ち",
        },
      ],
      memo: "山田部長承認済み",
      tags: ["法人", "火災保険"],
      expectedCloseDate: f(21),
      // ★ milestones: contractDate があることで underwriting タブ（contract）に分類される
      milestones: {
        firstConsultDate: d(40),
        proposalDate: d(14),
        applicationDate: d(7),
        contractDate: d(3),
      } as ContractMilestones,
      // ★ 提案履歴
      proposals: [
        {
          id: "pr_opp9_1",
          roundNo: 1,
          proposalDate: d(14),
          productIds: ["pp6"],
          memo: "企業総合保険の第1回設計書を提示。工場・在庫一式の内容を説明。山田部長が出席。",
          createdAt: d(14) + "T10:00:00",
        },
      ] as ProposalRound[],
    },
  ),

  // c6: 鈴木 — 学資保険 (fact_finding)
  mkOpp("opp10", "c6", "u2", "鈴木家 学資保険 検討", "fact_finding", "open", {
    targetPersonIds: ["p_c6_head"],
    contractorPersonId: "p_c6_head",
    productCategories: ["savings"],
    proposalProducts: [
      {
        id: "pp_opp10_savings",
        productCategory: "savings",
        productName: "学資ねるきん(小学校型)",
        insurer: "ソニー生命",
        insuredPersonId: "p_c6_head",
        monthlyPremium: 8000,
        faceAmount: 2000000,
        memo: "小学校入学時から満期金が受取れるタイプ。暗定見積もり。",
      },
    ],
    needsAnalysisDone: false,
    illustrationProvided: false,
    nextAction: "子供の年齢・学費計画確認",
    nextActionDate: f(10),
    stageHistory: [
      {
        stage: "approach",
        changedAt: d(10) + "T09:00:00",
        changedByUserId: "u2",
      },
      {
        stage: "fact_finding",
        changedAt: d(3) + "T10:00:00",
        changedByUserId: "u2",
        note: "学費への不安あり",
      },
    ],
    memo: "小学生3名分の学費積み立て",
    tags: ["学資保険", "積立"],
    expectedCloseDate: f(60),
    // opp10 は fact_finding 段階のため ProposalRound なし（暫定見積もりのみ）
  }),

  // c4: 水野 — 生命保険 (approach)
  mkOpp(
    "opp11",
    "c4",
    "u1",
    "水野家 生命保険 初回アプローチ",
    "approach",
    "open",
    {
      targetPersonIds: ["p_c4_head"],
      contractorPersonId: "p_c4_head",
      productCategories: ["life"],
      proposalProducts: [
        {
          id: "pp_opp11_life",
          productCategory: "life",
          productName: "定期保険(暫定見積もり)",
          insurer: "第一生命",
          insuredPersonId: "p_c4_head",
          monthlyPremium: 4000,
          faceAmount: 15000000,
          memo: "自動車保険更新の障に提案予定。暫定見積もり。",
        },
      ],
      needsAnalysisDone: false,
      illustrationProvided: false,
      nextAction: "初回面談のアポ取得",
      nextActionDate: f(14),
      stageHistory: [
        {
          stage: "approach",
          changedAt: d(2) + "T09:00:00",
          changedByUserId: "u1",
          note: "自動車更新時に生命保険の興味を確認",
        },
      ],
      memo: "自動車保険更新ついでに生命保険も提案",
      tags: ["生命保険", "新規"],
      expectedCloseDate: f(90),
      // opp11 は approach 段階のため ProposalRound なし（暫定見積もりのみ）
    },
  ),

  // ★ ADR-B3 デモ案件: 1世帯1アクティブ案件・複数商品・一部商品のみ契約予定日未入力で⚠️
  // opp1〜11・Policyは一切触らない（非破壊）。新世帯 c_demo1 に追加。
  mkOpp(
    "opp_demo1",
    "c_demo1",
    "u1",
    "松本家 総合保険 見直し",
    "proposal",
    "open",
    {
      contractorPersonId: "p_demo1_head",
      targetPersonIds: ["p_demo1_head", "p_demo1_spouse"],
      productCategories: ["life", "medical", "auto"],
      proposalProducts: [
        {
          id: "pp_demo1_life",
          productCategory: "life",
          productName: "定期保険スーパー割引",
          insurer: "日本生命",
          insuredPersonId: "p_demo1_head",
          monthlyPremium: 6200,
          faceAmount: 30000000,
          firstYearCommission: 74400,
          memo: "60歳満了。家族収入特約付",
          // ★ 個別ステージ・申込予定日あり
          stage: "proposal",
          milestones: {
            firstConsultDate: d(25),
            lifePlanDate: d(15),
            proposalDate: d(6),
            applicationDate: f(14), // 契約予定日入力済み
          },
        },
        {
          id: "pp_demo1_medical",
          productCategory: "medical",
          productName: "キュア・ネクスト",
          insurer: "オリックス生命",
          insuredPersonId: "p_demo1_head",
          monthlyPremium: 4100,
          firstYearCommission: 24600,
          memo: "1入院120日型",
          // ★ 個別ステージ同じだが applicationDate 未入力 → ⚠️ が出る
          stage: "proposal",
          milestones: {
            firstConsultDate: d(25),
            proposalDate: d(6),
            // applicationDate: 未入力（意図的。配偶者分と合わせて後日設定予定）
          },
        },
        {
          id: "pp_demo1_auto",
          productCategory: "auto",
          productName: "タフ・くるまの保険",
          insurer: "東京海上日動",
          insuredPersonId: "p_demo1_head",
          monthlyPremium: 8500,
          memo: "弁護士費用特約+車両保険（一般条件）",
          // ★ 個別ステージあり。applicationDate 未入力
          stage: "proposal",
          milestones: {
            firstConsultDate: d(25),
            proposalDate: d(6),
            // applicationDate: 未入力
          },
        },
      ],
      needsAnalysisDone: true,
      illustrationProvided: true,
      nextAction: "配偶者の医療・自動車の申込日確認・申込書回収",
      nextActionDate: f(7),
      stageHistory: [
        {
          stage: "approach",
          changedAt: d(30) + "T09:00:00",
          changedByUserId: "u1",
          note: "紹介案件。同僚からの紹介",
        },
        {
          stage: "fact_finding",
          changedAt: d(22) + "T10:00:00",
          changedByUserId: "u1",
          note: "家族構成・既契約棚卸し完了",
        },
        {
          stage: "needs_analysis",
          changedAt: d(15) + "T10:00:00",
          changedByUserId: "u1",
          note: "LPで家族収入保障の重要性を共有",
        },
        {
          stage: "proposal",
          changedAt: d(6) + "T10:00:00",
          changedByUserId: "u1",
          note: "生命・医療・自動車3商品の設計書を提示",
        },
      ],
      memo: "3商品まとめて提案中。生命保険の申込日は合意済み。医療・自動車は配偶者と相談後に確定予定。",
      tags: ["生命保険", "医療保険", "自動車保険", "複合提案"],
      expectedCloseDate: f(21),
      channelId: "ch_referral_existing",
      confidence: "A" as const,
      milestones: {
        firstConsultDate: d(25),
        lifePlanDate: d(15),
        proposalDate: d(6),
        // applicationDate: 未入力（商品ごとに異なるため商品側で管理）
      } as ContractMilestones,
      // F3: タスク登載（複合提案案件・自動生成タスク+手動タスク混在）
      tasks: [
        {
          id: "task_opp_demo1_01",
          title: "生命保険 申込書類一式の準備",
          done: true,
          doneDate: d(2),
          priority: "high" as TaskPriority,
          rolledOver: false,
          scope: "opportunity" as const,
          createdAt: d(6) + "T10:00:00",
          sourceMasterId: "tpl_opp_proposal_1",
        },
        {
          id: "task_opp_demo1_02",
          title: "配偶者分 医療・自動車の申込日確定",
          done: false,
          dueDate: f(7),
          priority: "high" as TaskPriority,
          rolledOver: false,
          scope: "opportunity" as const,
          createdAt: d(3) + "T10:00:00",
        },
        {
          id: "task_opp_demo1_03",
          title: "医療保険 意向確認書の署名取得",
          done: false,
          dueDate: f(10),
          priority: "medium" as TaskPriority,
          rolledOver: false,
          scope: "opportunity" as const,
          createdAt: d(3) + "T10:00:00",
          sourceMasterId: "tpl_opp_negotiation_1",
        },
        {
          id: "task_opp_demo1_04",
          title: "自動車保険 現行保険の解約手続き確認",
          done: false,
          dueDate: f(14),
          priority: "low" as TaskPriority,
          rolledOver: false,
          scope: "opportunity" as const,
          createdAt: d(3) + "T10:00:00",
        },
      ] as Task[],
      // ★ 提案履歴
      proposals: [
        {
          id: "pr_opp_demo1_1",
          roundNo: 1,
          proposalDate: d(15),
          productIds: ["pp_demo1_life"],
          memo: "生命保険の第1回設計書を提示。家族収入保障の重要性を説明。",
          createdAt: d(15) + "T10:00:00",
        },
        {
          id: "pr_opp_demo1_2",
          roundNo: 2,
          proposalDate: d(6),
          productIds: ["pp_demo1_life", "pp_demo1_medical", "pp_demo1_auto"],
          memo: "3商品まとめ提案。生命または医療・自動車の詳細を説明。配偶者分は相談待ち。",
          createdAt: d(6) + "T10:00:00",
        },
      ] as ProposalRound[],
    },
  ),
];
