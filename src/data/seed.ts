// =====================================================
// シードデータ — barrel (re-export)
// =====================================================
// このファイルは純粋な barrel。実装は src/data/seed/ 以下に分割済み。
// 既存の `import { X } from '@/data/seed'` をすべて維持する。

export { USERS, TEAMS } from "./seed/users";
export { CUSTOMERS } from "./seed/customers";
export { PERSONS } from "./seed/persons";
export { REPORTS } from "./seed/reports";
export {
  TEMPLATES,
  DEFAULT_QUICK_CHIPS,
  NOTIFICATIONS,
  AUDIT_LOGS,
} from "./seed/templates";
export { OPPORTUNITIES } from "./seed/opportunities";
export { POLICIES } from "./seed/policies-2";
export {
  SALES_TARGETS,
  POLICY_STATUS_HISTORY,
  TASK_TEMPLATES,
  OPP_ACTIVITY_REPORTS,
} from "./seed/sales";
export { RENEWAL_CASES } from "./seed/renewals";
export { CUSTOMER_INTERACTIONS } from "./seed/customerInteractions";
