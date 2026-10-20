// =====================================================
// シードデータ — 保険契約ヘルパー
// =====================================================
import type { Policy, Coverage } from "../../types";
import { _now } from "./helpers";

// Policy (保険契約) シードデータ — Phase 3
// =====================================================
export let _policyIdCounter = 1;
export const pid = () => `pol_${String(_policyIdCounter++).padStart(3, "0")}`;
export let _covIdCounter = 1;
export const cid = () => `cov_${String(_covIdCounter++).padStart(3, "0")}`;

export function mkPolicy(
  id: string,
  overrides: Partial<Policy> & {
    householdId: string;
    ownerId: string;
    contractorPersonId: string;
    insurer: string;
    productName: string;
    productCategory: Policy["productCategory"];
    status: Policy["status"];
    monthlyPremium: number;
    startDate: string;
  },
): Policy {
  return {
    id,
    policyNumber: undefined,
    insuredPersonIds: [overrides.contractorPersonId],
    payMode: "monthly",
    hasCashValue: false,
    coverages: [],
    tags: [],
    memo: "",
    createdAt: _now,
    updatedAt: _now,
    ...overrides,
  };
}

export function mkCoverage(
  id: string,
  policyId: string,
  overrides: Partial<Coverage> & {
    type: Coverage["type"];
    label: string;
    insuredPersonId: string;
    isMain: boolean;
  },
): Coverage {
  return {
    id,
    policyId,
    unit: "JPY",
    memo: "",
    ...overrides,
  };
}

// ── c1: KOORO GILSON 世帯 ────────────────────────────
