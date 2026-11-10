// =====================================================
// appstate/policies.ts — Policy & Coverage slice of AppState
// =====================================================
import type {
  Policy,
  PolicyStatusHistory,
  Coverage,
  PolicyStatus,
  CoverageType,
} from "../../../types";

export interface AppStatePoliciesSlice {
  // Data: Policy
  policies: Policy[];
  policyStatusHistory: PolicyStatusHistory[];

  // Actions: Policy
  addPolicy: (
    partial: Omit<Policy, "id" | "createdAt" | "updatedAt">,
  ) => Policy;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  addCoverage: (
    policyId: string,
    partial: Omit<Coverage, "id" | "policyId">,
  ) => Coverage;
  updateCoverage: (coverageId: string, patch: Partial<Coverage>) => void;
  deleteCoverage: (coverageId: string) => void;
  issuePoliciesFromOpportunity: (
    opportunityId: string,
    userId: string,
  ) => Policy[];
  activatePolicy: (
    policyId: string,
    policyNumber: string,
    startDate: string,
    userId: string,
  ) => void;
  changePolicyStatus: (
    id: string,
    newStatus: PolicyStatus,
    note?: string,
    userId?: string,
  ) => void;
  getPoliciesByHousehold: (
    householdId: string,
    options?: { activeOnly?: boolean },
  ) => Policy[];
  getPoliciesByPerson: (
    personId: string,
    options?: { activeOnly?: boolean },
  ) => Policy[];
  getCoverageMatrix: (householdId: string) => Array<{
    personId: string;
    coverageTypes: Set<CoverageType>;
    totalFaceByType: Record<string, number>;
  }>;
}
