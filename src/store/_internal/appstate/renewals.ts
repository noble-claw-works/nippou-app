// =====================================================
// appstate/renewals.ts — RenewalCase & CustomerInteraction slice of AppState
// =====================================================
import type {
  RenewalCase,
  RenewalSurvey,
  RenewalStatus,
  RenewalLogKind,
  CustomerInteraction,
  Task,
  RenewalRoadmapItemDef,
  RenewalRoadmapTemplateVersion,
  RenewalRoadmapAnswer,
} from "../../../types";

export interface AppStateRenewalsSlice {
  // Data: CustomerInteraction (世帯対応記録)
  customerInteractions: CustomerInteraction[];

  // Actions: CustomerInteraction
  getInteractionsByHousehold: (householdId: string) => CustomerInteraction[];
  addCustomerInteraction: (
    partial: Omit<
      CustomerInteraction,
      "id" | "createdAt" | "updatedAt" | "byUserId"
    > &
      Partial<Pick<CustomerInteraction, "byUserId">>,
  ) => CustomerInteraction;
  updateCustomerInteraction: (
    id: string,
    patch: Partial<Omit<CustomerInteraction, "id" | "createdAt">>,
  ) => void;
  deleteCustomerInteraction: (id: string) => void;

  // Data: RenewalCase
  renewalCases: RenewalCase[];

  // Actions: RenewalCase
  getRenewalCases: (opts?: { role?: string; userId?: string }) => RenewalCase[];
  getRenewalCaseById: (id: string) => RenewalCase | undefined;
  saveRenewalSurvey: (id: string, patch: Partial<RenewalSurvey>) => void;
  addRenewalNote: (id: string, body: string, userId?: string) => void;
  addRenewalLog: (
    id: string,
    entry: { kind: RenewalLogKind; body: string },
    userId?: string,
  ) => void;
  changeRenewalStatus: (
    id: string,
    status: RenewalStatus,
    userId?: string,
  ) => void;
  addRenewalTask: (id: string, task: Omit<Task, "id" | "createdAt">) => void;
  updateRenewalTask: (id: string, taskId: string, patch: Partial<Task>) => void;
  toggleRenewalTaskDone: (
    id: string,
    taskId: string,
    done: boolean,
    today?: string,
  ) => void;
  removeRenewalTask: (id: string, taskId: string) => void;
  /** M3: CSVインポートで生成した RenewalCase 群を一括追加 */
  importRenewalCases: (cases: RenewalCase[]) => void;

  // ── Doc5 ロードマップ テンプレ版管理（§2.5 / PC-5・PC-6）──
  /** 公開済みテンプレ版（昇順, 末尾=最新）。初期値は seed v1 */
  roadmapTemplateVersions: RenewalRoadmapTemplateVersion[];
  /** 最新テンプレ版を取得（PC-5 で実体実装） */
  getCurrentRoadmapTemplate: () => RenewalRoadmapTemplateVersion | undefined;
  /** 指定版のテンプレを取得（PC-5 で実体実装） */
  getRoadmapTemplateVersion: (
    version: number,
  ) => RenewalRoadmapTemplateVersion | undefined;
  /** 新テンプレ版を発行（manager 必須, PC-5 で実体実装） */
  publishRoadmapTemplate: (
    items: RenewalRoadmapItemDef[],
    userId: string,
  ) => RenewalRoadmapTemplateVersion;
  /**
   * ★宣言のみ（M6 coder が実装）: 案件のロードマップ回答を保存。
   * 回答時点の最新テンプレ版をスナップショットして roadmapVersions に push。
   */
  saveRoadmapAnswers: (
    caseId: string,
    answers: RenewalRoadmapAnswer[],
    meta?: {
      inputDate?: string;
      gender?: "male" | "female" | "other";
      ageBand?: string;
      userId?: string;
    },
  ) => void;
}
