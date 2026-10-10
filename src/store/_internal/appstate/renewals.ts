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
}
