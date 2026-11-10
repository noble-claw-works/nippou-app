// =====================================================
// OpportunityActivityReport slice (ADR-B4 v2 要件6/9)
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, OpportunityActivityReport } from "../_internal/types";
import { uid } from "../_internal/constants";
import type { BlockType } from "../_internal/types";

export const createOppActivitySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "getOppActivityReport"
    | "getOppActivityReportsByOpportunity"
    | "addOppActivityReport"
    | "updateOppActivityReport"
    | "deleteOppActivityReport"
    | "syncOppReportToNippou"
  >
> = (set, get) => ({
  getOppActivityReport: (opportunityId, reportDate, userId) => {
    return get().oppActivityReports.find(
      (r) =>
        r.opportunityId === opportunityId &&
        r.reportDate === reportDate &&
        r.userId === userId,
    );
  },

  getOppActivityReportsByOpportunity: (opportunityId) => {
    return get().oppActivityReports.filter(
      (r) => r.opportunityId === opportunityId,
    );
  },

  addOppActivityReport: (partial) => {
    const now = new Date().toISOString();
    const report: OpportunityActivityReport = {
      ...partial,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...get().oppActivityReports, report];
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        "nippou.oppActivityReports.v1",
        JSON.stringify(updated),
      );
    }
    set({ oppActivityReports: updated });
    return report;
  },

  updateOppActivityReport: (id, patch) => {
    const now = new Date().toISOString();
    const updated = get().oppActivityReports.map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: now } : r,
    );
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        "nippou.oppActivityReports.v1",
        JSON.stringify(updated),
      );
    }
    set({ oppActivityReports: updated });
  },

  deleteOppActivityReport: (id) => {
    const updated = get().oppActivityReports.filter((r) => r.id !== id);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        "nippou.oppActivityReports.v1",
        JSON.stringify(updated),
      );
    }
    set({ oppActivityReports: updated });
  },

  // 要件9: 報告保存→日報 TimeBlock 自動生成/更新
  syncOppReportToNippou: (reportId) => {
    const s = get();
    const oppReport = s.oppActivityReports.find((r) => r.id === reportId);
    if (!oppReport) return;

    const {
      opportunityId,
      userId,
      reportDate,
      activityType,
      summary,
      nextAction,
    } = oppReport;
    const opp = s.opportunities.find((o) => o.id === opportunityId);

    // 日報を取得または作成
    let nippou = s.reports.find(
      (r) => r.userId === userId && r.date === reportDate,
    );
    if (!nippou) {
      nippou = get().createReport(userId, reportDate);
    }

    // 活動タイプ→ BlockTypeマッピング
    const blockTypeMap: Record<
      OpportunityActivityReport["activityType"],
      BlockType
    > = {
      visit: "visit",
      phone: "phone",
      web: "meeting",
      other: "meeting",
    };
    const blockType: BlockType = blockTypeMap[activityType];

    // title: "案件名 活動サマリ"
    const oppTitle = opp?.title ?? "商談内容";
    const title = `${oppTitle}: ${summary.slice(0, 40)}`;
    const memo = [summary, nextAction ? `次アクション: ${nextAction}` : ""]
      .filter(Boolean)
      .join("\n");

    // sourceReportId で既存ブロックを検索（二重生成防止）
    const existingBlock = nippou.blocks.find(
      (b) => b.sourceReportId === reportId,
    );

    if (existingBlock) {
      // 更新
      get().updateBlock(nippou.id, existingBlock.id, {
        title,
        memo,
        opportunityId,
        type: blockType,
      });
    } else {
      // 新規追加（時間帯は 09:00-09:30 デフォルト）
      get().addBlock(nippou.id, {
        reportId: nippou.id,
        type: blockType,
        startTime: "09:00",
        endTime: "09:30",
        title,
        memo,
        isPlanned: false,
        isActual: true,
        attachments: [],
        opportunityId,
        sourceReportId: reportId,
      });
    }

    // reachedMilestones 処理: milestones 日付を更新
    if (oppReport.reachedMilestones && opp) {
      const milestoneKeyMap: Record<
        string,
        keyof import("../../types").ContractMilestones
      > = {
        firstConsult: "firstConsultDate",
        lifePlan: "lifePlanDate",
        proposal: "proposalDate",
        contract: "contractDate",
        established: "establishedDate",
      };
      const milestonePatch: Partial<import("../../types").ContractMilestones> =
        {};
      for (const [k, reached] of Object.entries(oppReport.reachedMilestones)) {
        if (reached) {
          const msKey = milestoneKeyMap[k];
          if (msKey && !opp.milestones?.[msKey]) {
            milestonePatch[msKey] = reportDate;
          }
        }
      }
      if (Object.keys(milestonePatch).length > 0) {
        get().updateOpportunity(opportunityId, {
          milestones: { ...opp.milestones, ...milestonePatch },
        });
      }
    }

    // confidence 更新
    if (oppReport.confidence !== undefined && opp) {
      get().updateOpportunity(opportunityId, {
        confidence: oppReport.confidence,
      });
    }
  },
});
