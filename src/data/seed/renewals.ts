// =====================================================
// シードデータ — 更新案件 (RenewalCase)
// POLICIES を filterRenewalPolicies で走査し、損保 inforce+renewalDate
// の全契約から RenewalCase を 1:1 生成する。DESIGN-RENEWAL §3 準拠。
// =====================================================
import type {
  RenewalCase,
  RenewalMethod,
  RenewalProductType,
} from "../../types/renewal";
import type { Policy } from "../../types";
import { POLICIES } from "./policies-2";
import { CUSTOMERS } from "./customers";
import { PERSONS } from "./persons";
import { filterRenewalPolicies } from "../../utils/filterRenewalPolicies";
import { f, d, _now } from "./helpers";

// ── id ヘルパー ────────────────────────────────────────
let _rcCounter = 1;
const rcid = () => `rc_${String(_rcCounter++).padStart(3, "0")}`;
let _rlCounter = 1;
const rlid = () => `rl_${String(_rlCounter++).padStart(3, "0")}`;
let _rnCounter = 1;
const rnid = () => `rn_${String(_rnCounter++).padStart(3, "0")}`;
let _rtCounter = 1;
const rtid = () => `rt_${String(_rtCounter++).padStart(3, "0")}`;

// ── ProductCategory → RenewalProductType マッピング ───
function toProductType(
  category: Policy["productCategory"],
): RenewalProductType {
  switch (category) {
    case "auto":
      return "auto";
    case "fire":
      return "fire";
    case "liability":
      return "liability";
    default:
      return "other";
  }
}

// ── デモ見栄えのための method 散らし ──────────────────
const DEMO_METHODS: RenewalMethod[] = [
  "undecided",
  "undecided",
  "rakuraku_seat",
  "phone",
  "undecided",
  "visit",
  "undecided",
];

// ── 母集団: 損保 inforce+renewalDate の全契約を抽出 ────
const renewalPolicies = filterRenewalPolicies(POLICIES);

// ── Helpers ────────────────────────────────────────────
function resolveContractorName(policy: Policy): string {
  const person = PERSONS.find((p) => p.id === policy.contractorPersonId);
  if (person?.name) return person.name;
  const household = CUSTOMERS.find((c) => c.id === policy.householdId);
  return household?.name ?? policy.householdId;
}

function resolveGroupName(policy: Policy): string | undefined {
  const household = CUSTOMERS.find((c) => c.id === policy.householdId);
  if (household?.type === "corporate") return household.name;
  return undefined;
}

// ── RenewalCase 生成 ────────────────────────────────────
export const RENEWAL_CASES: RenewalCase[] = renewalPolicies.map(
  (policy, idx) => {
    const id = rcid();
    const now = _now;
    const method = DEMO_METHODS[idx % DEMO_METHODS.length];
    const contractorName = resolveContractorName(policy);
    const groupName = resolveGroupName(policy);
    const prevYearPremium =
      policy.annualPremium ??
      (policy.monthlyPremium ? policy.monthlyPremium * 12 : undefined);

    // ── status 分布: maturityDate 昇順で割り振り ────
    // 最も近い2件 → in_progress、次の2件 → completed、残り → not_started
    let status: RenewalCase["status"];
    if (idx < 2) {
      status = "in_progress";
    } else if (idx < 4) {
      status = "completed";
    } else {
      status = "not_started";
    }

    // ── デモデータ組み立て ────────────────────────────
    const createdAt = now;
    const updatedAt = now;

    const baseLog = {
      id: rlid(),
      kind: "other" as const,
      body: "更新案件を登録しました",
      byUserId: policy.ownerId,
      at: createdAt,
    };

    if (status === "in_progress") {
      // 対応中: consult 一部、activityLog 2件、tasks 1〜2件、notes 1件
      const fcDate = d(10 - idx * 3); // ファーストコンタクト日
      return {
        id,
        policyId: policy.id,
        householdId: policy.householdId,
        contractorPersonId: policy.contractorPersonId,
        contractorName,
        groupName,
        ownerUserId: policy.ownerId,
        insurer: policy.insurer,
        maturityDate: policy.renewalDate!,
        productType: toProductType(policy.productCategory),
        prevYearPremium,
        method,
        status,
        survey: {
          consult: {
            firstContactDate: fcDate,
            renewalMethod: method === "undecided" ? undefined : method,
          },
        },
        notes: [
          {
            id: rnid(),
            body: "お客様から「今年は保険料を抑えたい」とのご要望。見積もり時に前年比較を必ず提示すること。",
            byUserId: policy.ownerId,
            at: createdAt,
          },
        ],
        activityLog: [
          baseLog,
          {
            id: rlid(),
            kind: "contact" as const,
            body: `ファーストコンタクト実施。日時: ${fcDate}`,
            byUserId: policy.ownerId,
            at: createdAt,
          },
        ],
        tasks: [
          {
            id: rtid(),
            title: "意向確認TEL",
            done: false,
            priority: "high" as const,
            rolledOver: false,
            scope: "renewal" as const,
            dueDate: f(7),
            ownerId: policy.ownerId,
            createdAt,
          },
          {
            id: rtid(),
            title: "更新書類送付",
            done: false,
            priority: "medium" as const,
            rolledOver: false,
            scope: "renewal" as const,
            dueDate: f(14),
            ownerId: policy.ownerId,
            createdAt,
          },
        ],
        createdAt,
        updatedAt,
      } satisfies RenewalCase;
    } else if (status === "completed") {
      // 完了: survey 一部埋め、activityLog 3件、notes 1件、tasks 完了済み1件
      const fcDate = d(45 + idx * 5);
      const procDate = d(20 + idx * 3);
      return {
        id,
        policyId: policy.id,
        householdId: policy.householdId,
        contractorPersonId: policy.contractorPersonId,
        contractorName,
        groupName,
        ownerUserId: policy.ownerId,
        insurer: policy.insurer,
        maturityDate: policy.renewalDate!,
        productType: toProductType(policy.productCategory),
        prevYearPremium,
        method: "rakuraku_seat",
        status,
        survey: {
          consult: {
            firstContactDate: fcDate,
            procedureDate: procDate,
            flyerDistribution: "delivered",
            renewedPremium: prevYearPremium
              ? Math.round(prevYearPremium * 1.02)
              : undefined,
            renewalMethod: "rakuraku_seat",
          },
          roadmap: {
            inputDate: fcDate,
            gender: "male",
            ageBand: "50s",
            topConcern: "fire_renewal",
          },
          updatedAt: now,
        },
        notes: [
          {
            id: rnid(),
            body: "更新手続き完了。次回更新時は早めのコンタクトを心がけること。",
            byUserId: policy.ownerId,
            at: now,
          },
        ],
        activityLog: [
          baseLog,
          {
            id: rlid(),
            kind: "contact" as const,
            body: `ファーストコンタクト実施。日時: ${fcDate}`,
            byUserId: policy.ownerId,
            at: now,
          },
          {
            id: rlid(),
            kind: "survey_saved" as const,
            body: "アンケートを保存しました",
            byUserId: policy.ownerId,
            at: now,
          },
          {
            id: rlid(),
            kind: "status_change" as const,
            body: "ステータスを変更しました: 対応中→完了",
            byUserId: policy.ownerId,
            at: now,
          },
        ],
        tasks: [
          {
            id: rtid(),
            title: "更新書類確認",
            done: true,
            doneDate: procDate,
            doneBy: policy.ownerId,
            priority: "medium" as const,
            rolledOver: false,
            scope: "renewal" as const,
            ownerId: policy.ownerId,
            createdAt,
          },
        ],
        createdAt,
        updatedAt,
      } satisfies RenewalCase;
    } else {
      // not_started: survey 空、activityLog 1件（登録のみ）、tasks 1件
      return {
        id,
        policyId: policy.id,
        householdId: policy.householdId,
        contractorPersonId: policy.contractorPersonId,
        contractorName,
        groupName,
        ownerUserId: policy.ownerId,
        insurer: policy.insurer,
        maturityDate: policy.renewalDate!,
        productType: toProductType(policy.productCategory),
        prevYearPremium,
        method,
        status,
        survey: {},
        notes: [],
        activityLog: [baseLog],
        tasks: [
          {
            id: rtid(),
            title: "ファーストコンタクト",
            done: false,
            priority: "medium" as const,
            rolledOver: false,
            scope: "renewal" as const,
            dueDate: f(30),
            ownerId: policy.ownerId,
            createdAt,
          },
        ],
        createdAt,
        updatedAt,
      } satisfies RenewalCase;
    }
  },
);
