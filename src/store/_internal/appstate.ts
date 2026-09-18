// =====================================================
// AppState interface — central store shape
// ドメイン別スライスを合成して AppState を構成する
// 各スライスの詳細は ./appstate/ 配下を参照
// =====================================================
import type { AppStateAuthSlice } from "./appstate/auth";
import type { AppStateReportsSlice } from "./appstate/reports";
import type { AppStateCustomersSlice } from "./appstate/customers";
import type { AppStateOpportunitiesSlice } from "./appstate/opportunities";
import type { AppStatePoliciesSlice } from "./appstate/policies";
import type { AppStateRenewalsSlice } from "./appstate/renewals";

export interface AppState
  extends
    AppStateAuthSlice,
    AppStateReportsSlice,
    AppStateCustomersSlice,
    AppStateOpportunitiesSlice,
    AppStatePoliciesSlice,
    AppStateRenewalsSlice {
  // Reset (全スライスに属さないグローバルアクション)
  resetAll: () => void;
}
