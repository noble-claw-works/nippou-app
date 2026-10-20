// =====================================================
// Policy slice — addPolicy, updatePolicy, deletePolicy,
// addCoverage, updateCoverage, deleteCoverage,
// issuePoliciesFromOpportunity, activatePolicy,
// changePolicyStatus, getPoliciesByHousehold,
// getPoliciesByPerson, getCoverageMatrix
// =====================================================
import type { StateCreator } from "zustand";
import type {
  AppState,
  Policy,
  Coverage,
  PolicyStatus,
  CoverageType,
  PolicyStatusHistory,
  OpportunityStage,
  ProductCategory,
} from "../_internal/types";
import { uid } from "../_internal/constants";

export const createPolicySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addPolicy"
    | "updatePolicy"
    | "deletePolicy"
    | "addCoverage"
    | "updateCoverage"
    | "deleteCoverage"
    | "issuePoliciesFromOpportunity"
    | "activatePolicy"
    | "changePolicyStatus"
    | "getPoliciesByHousehold"
    | "getPoliciesByPerson"
    | "getCoverageMatrix"
  >
> = (set, get) => ({
  addPolicy: (partial) => {
    const now = new Date().toISOString();
    const policy: Policy = {
      ...partial,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const updated = [...s.policies, policy];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
    return policy;
  },

  updatePolicy: (id, patch) => {
    set((s) => {
      const updated = s.policies.map((p) =>
        p.id === id
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p,
      );
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
  },

  deletePolicy: (id) => {
    set((s) => {
      const updated = s.policies.filter((p) => p.id !== id);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
  },

  addCoverage: (policyId, partial) => {
    const coverage: Coverage = { ...partial, id: uid(), policyId };
    set((s) => {
      const updated = s.policies.map((p) =>
        p.id === policyId
          ? {
              ...p,
              coverages: [...p.coverages, coverage],
              updatedAt: new Date().toISOString(),
            }
          : p,
      );
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
    return coverage;
  },

  updateCoverage: (coverageId, patch) => {
    set((s) => {
      const updated = s.policies.map((p) => {
        if (!p.coverages.find((c) => c.id === coverageId)) return p;
        return {
          ...p,
          coverages: p.coverages.map((c) =>
            c.id === coverageId ? { ...c, ...patch } : c,
          ),
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
  },

  deleteCoverage: (coverageId) => {
    set((s) => {
      const updated = s.policies.map((p) => {
        if (!p.coverages.find((c) => c.id === coverageId)) return p;
        return {
          ...p,
          coverages: p.coverages.filter((c) => c.id !== coverageId),
          updatedAt: new Date().toISOString(),
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updated),
        );
      }
      return { policies: updated };
    });
  },

  issuePoliciesFromOpportunity: (opportunityId, userId) => {
    const opp = get().opportunities.find((o) => o.id === opportunityId);
    if (!opp) return [];
    const now = new Date().toISOString();
    const issued: Policy[] = opp.proposalProducts.map((pp) => {
      const policy: Policy = {
        id: uid(),
        householdId: opp.householdId,
        ownerId: userId,
        contractorPersonId:
          pp.insuredPersonId || (opp.targetPersonIds[0] ?? ""),
        insuredPersonIds: pp.insuredPersonId
          ? [pp.insuredPersonId]
          : opp.targetPersonIds,
        insurer: pp.insurer,
        productName: pp.productName,
        productCategory: pp.productCategory as ProductCategory,
        status: "pending",
        startDate: now.slice(0, 10),
        monthlyPremium: pp.monthlyPremium,
        payMode: "monthly",
        hasCashValue: ["life", "savings", "nursing"].includes(
          pp.productCategory,
        ),
        sourceOpportunityId: opportunityId,
        coverages: [],
        tags: [],
        memo: pp.memo ?? "",
        createdAt: now,
        updatedAt: now,
      };
      if (pp.faceAmount) {
        const cov: Coverage = {
          id: uid(),
          policyId: policy.id,
          type:
            pp.productCategory === "life"
              ? "death"
              : pp.productCategory === "medical"
                ? "medical_hospital"
                : pp.productCategory === "cancer"
                  ? "cancer"
                  : pp.productCategory === "income"
                    ? "disability"
                    : pp.productCategory === "nursing"
                      ? "nursing"
                      : pp.productCategory === "savings"
                        ? "savings"
                        : "other",
          label: pp.productName,
          faceAmount: pp.faceAmount,
          unit: "JPY",
          insuredPersonId: pp.insuredPersonId || (opp.targetPersonIds[0] ?? ""),
          isMain: true,
          memo: "",
        };
        policy.coverages = [cov];
      }
      return policy;
    });
    set((s) => {
      const updatedPolicies = [...s.policies, ...issued];
      const updatedOpps = s.opportunities.map((o) => {
        if (o.id !== opportunityId) return o;
        return {
          ...o,
          stage: "issued" as OpportunityStage,
          status: "won" as const,
          actualCloseDate: o.actualCloseDate ?? now.slice(0, 10),
          stageHistory: [
            ...o.stageHistory,
            {
              stage: "issued" as OpportunityStage,
              changedAt: now,
              changedByUserId: userId,
              note: "契約発行",
            },
          ],
          updatedAt: now,
        };
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updatedPolicies),
        );
        window.localStorage.setItem(
          "nippou.opportunities.v2",
          JSON.stringify(updatedOpps),
        );
      }
      return { policies: updatedPolicies, opportunities: updatedOpps };
    });
    return issued;
  },

  activatePolicy: (policyId, policyNumber, startDate, userId) => {
    const now = new Date().toISOString();
    set((s) => {
      const updatedPolicies = s.policies.map((p) =>
        p.id === policyId
          ? {
              ...p,
              policyNumber,
              startDate,
              status: "inforce" as PolicyStatus,
              updatedAt: now,
            }
          : p,
      );
      const histEntry: PolicyStatusHistory = {
        id: uid(),
        policyId,
        status: "inforce",
        changedAt: now,
        changedByUserId: userId,
        note: `証券番号: ${policyNumber}`,
      };
      const updatedHistory = [...s.policyStatusHistory, histEntry];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updatedPolicies),
        );
        window.localStorage.setItem(
          "nippou.policyHistory.v1",
          JSON.stringify(updatedHistory),
        );
      }
      return { policies: updatedPolicies, policyStatusHistory: updatedHistory };
    });
  },

  changePolicyStatus: (id, newStatus, note?, userId?) => {
    const now = new Date().toISOString();
    const currentUserId = userId ?? get().currentUserId;
    set((s) => {
      const updatedPolicies = s.policies.map((p) =>
        p.id === id ? { ...p, status: newStatus, updatedAt: now } : p,
      );
      const histEntry: PolicyStatusHistory = {
        id: uid(),
        policyId: id,
        status: newStatus,
        changedAt: now,
        changedByUserId: currentUserId,
        note,
      };
      const updatedHistory = [...s.policyStatusHistory, histEntry];
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "nippou.policies.v1",
          JSON.stringify(updatedPolicies),
        );
        window.localStorage.setItem(
          "nippou.policyHistory.v1",
          JSON.stringify(updatedHistory),
        );
      }
      return { policies: updatedPolicies, policyStatusHistory: updatedHistory };
    });
  },

  getPoliciesByHousehold: (householdId, options?) => {
    const policies = get().policies.filter(
      (p) => p.householdId === householdId,
    );
    if (options?.activeOnly)
      return policies.filter(
        (p) => p.status === "inforce" || p.status === "pending",
      );
    return policies;
  },

  getPoliciesByPerson: (personId, options?) => {
    const policies = get().policies.filter(
      (p) =>
        p.contractorPersonId === personId ||
        p.insuredPersonIds.includes(personId) ||
        p.coverages.some((c) => c.insuredPersonId === personId),
    );
    if (options?.activeOnly)
      return policies.filter(
        (p) => p.status === "inforce" || p.status === "pending",
      );
    return policies;
  },

  getCoverageMatrix: (householdId) => {
    const policies = get().policies.filter(
      (p) =>
        p.householdId === householdId &&
        (p.status === "inforce" || p.status === "pending"),
    );
    const persons = get().persons.filter((p) => p.householdId === householdId);
    return persons.map((person) => {
      const personPolicies = policies.filter(
        (p) =>
          p.insuredPersonIds.includes(person.id) ||
          p.coverages.some((c) => c.insuredPersonId === person.id),
      );
      const coverageTypes = new Set<CoverageType>();
      const totalFaceByType: Record<string, number> = {};
      for (const policy of personPolicies) {
        for (const cov of policy.coverages) {
          if (
            cov.insuredPersonId === person.id ||
            policy.insuredPersonIds.includes(person.id)
          ) {
            coverageTypes.add(cov.type);
            if (cov.faceAmount) {
              totalFaceByType[cov.type] =
                (totalFaceByType[cov.type] ?? 0) + cov.faceAmount;
            }
          }
        }
      }
      return { personId: person.id, coverageTypes, totalFaceByType };
    });
  },
});
