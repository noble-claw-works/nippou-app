// =====================================================
// salesPerf/store.ts — 本体ストア購読の派生ストア
// contracts/masters/targets を本体 Opportunity/Policy/SalesTarget から
// adapter 経由で導出する。SEED は開発フォールバックのみ。
//
// 方針:
//   Zustand state に contracts/masters/targets を持ち、
//   本体ストアの変化を subscribeWithSelector で購読して自動更新する。
//   既存コンポーネントの `useSalesPerfStore()` 呼出は変更不要。
// =====================================================
import { create } from "zustand";
import { useAppStore } from "../../store";
import type {
  SalesContract,
  SalesTargetRow,
  SalesPerfFilter,
  SalesPerfMasters,
} from "./types";
import { SEED_CONTRACTS } from "./data/seedContracts";
import { normalizeAll } from "./lib/contractNormalize";
import {
  buildSalesContractRaws,
  type AdapterContext,
} from "./lib/contractAdapter";
import { buildMastersFromStore } from "./lib/mastersAdapter";
import { buildTargetRows } from "./lib/targetAdapter";
import { DEFAULT_FISCAL_YEAR } from "./constants";

// ----------------------------------------
// デモフラグ（既定 OFF）
// 異常値サンプルを注入してデータ品質バッジを実演する場合は true に
// ----------------------------------------
export const DEMO_ANOMALY_ENABLED = false;

// ----------------------------------------
// ストア型定義
// ----------------------------------------
interface SalesPerfState {
  // フィルタ状態
  filter: SalesPerfFilter;

  // 派生データ（本体ストアから自動導出）
  masters: SalesPerfMasters;
  contracts: SalesContract[];
  targets: SalesTargetRow[];

  // フィルタ setter
  setFilter: (patch: Partial<SalesPerfFilter>) => void;
  resetFilter: () => void;

  // 内部: 派生データ再計算
  _refresh: () => void;
}

// ----------------------------------------
// 初期フィルタ
// ----------------------------------------
const initialFilter: SalesPerfFilter = {
  line: "both",
  fiscalYear: DEFAULT_FISCAL_YEAR,
  periodMode: "full",
  confidenceScenario: "fixed_s_a",
};

// ----------------------------------------
// 初期値: 本体ストアが初期化されている前提で計算
// ----------------------------------------
function computeContracts(fiscalYear: number): SalesContract[] {
  const { opportunities, policies, users, teams } = useAppStore.getState();
  const ctx: AdapterContext = { fiscalYear, users, teams };

  // 本体データが十分にある場合は adapter 経由
  let raws = buildSalesContractRaws(opportunities, policies, ctx);

  if (DEMO_ANOMALY_ENABLED) {
    raws = [...raws, ...SEED_CONTRACTS];
  }

  // raws が空の場合は seed フォールバック（開発環境保護）
  if (raws.length === 0) {
    return normalizeAll(SEED_CONTRACTS);
  }

  return normalizeAll(raws);
}

function computeMasters(): SalesPerfMasters {
  const { users, teams } = useAppStore.getState();
  return buildMastersFromStore(users, teams);
}

function computeTargets(fiscalYear: number): SalesTargetRow[] {
  const { salesTargets } = useAppStore.getState();
  return buildTargetRows(salesTargets, fiscalYear);
}

// ----------------------------------------
// ストア
// ----------------------------------------
export const useSalesPerfStore = create<SalesPerfState>()((set, get) => ({
  filter: initialFilter,
  masters: computeMasters(),
  contracts: computeContracts(DEFAULT_FISCAL_YEAR),
  targets: computeTargets(DEFAULT_FISCAL_YEAR),

  setFilter: (patch) => {
    const nextFilter = { ...get().filter, ...patch };
    set({ filter: nextFilter });
    // fiscalYear が変わったら即再計算
    if (patch.fiscalYear !== undefined) {
      set({
        contracts: computeContracts(nextFilter.fiscalYear),
        targets: computeTargets(nextFilter.fiscalYear),
      });
    }
  },

  resetFilter: () => {
    set({ filter: initialFilter });
    set({
      contracts: computeContracts(DEFAULT_FISCAL_YEAR),
      targets: computeTargets(DEFAULT_FISCAL_YEAR),
    });
  },

  _refresh: () => {
    const fy = get().filter.fiscalYear;
    set({
      masters: computeMasters(),
      contracts: computeContracts(fy),
      targets: computeTargets(fy),
    });
  },
}));

// ----------------------------------------
// 本体ストアを購読して派生データを自動更新
// (モジュール初回 import 時に1回だけ登録)
// Zustand v5: subscribe(listener) のみ。selector is unavailable on appStore.
// ----------------------------------------
let _prevOpps = useAppStore.getState().opportunities;
let _prevPolicies = useAppStore.getState().policies;
let _prevUsers = useAppStore.getState().users;
let _prevTeams = useAppStore.getState().teams;
let _prevTargets = useAppStore.getState().salesTargets;

useAppStore.subscribe((s) => {
  if (
    s.opportunities !== _prevOpps ||
    s.policies !== _prevPolicies ||
    s.users !== _prevUsers ||
    s.teams !== _prevTeams ||
    s.salesTargets !== _prevTargets
  ) {
    _prevOpps = s.opportunities;
    _prevPolicies = s.policies;
    _prevUsers = s.users;
    _prevTeams = s.teams;
    _prevTargets = s.salesTargets;
    useSalesPerfStore.getState()._refresh();
  }
});
