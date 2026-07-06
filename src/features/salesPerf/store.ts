// =====================================================
// salesPerf/store.ts — 専用 Zustand ストア
// 既存 src/store/index.ts は触らない
// =====================================================
import { create } from 'zustand';
import type { SalesContract, SalesTargetRow, SalesPerfFilter, SalesPerfMasters } from './types';
import { SALES_PERF_MASTERS } from './data/masters';
import { SEED_CONTRACTS, SEED_TARGETS } from './data/seedContracts';
import { normalizeAll } from './lib/contractNormalize';
import { DEFAULT_FISCAL_YEAR } from './constants';

// ----------------------------------------
// 初期正規化 (一度だけ実行)
// ----------------------------------------
const normalizedContracts: SalesContract[] = normalizeAll(SEED_CONTRACTS);

// ----------------------------------------
// ストア型定義
// ----------------------------------------
interface SalesPerfState {
  // フィルタ状態
  filter: SalesPerfFilter;

  // データ (変更不要: seed から初期化)
  masters: SalesPerfMasters;
  contracts: SalesContract[];
  targets: SalesTargetRow[];

  // フィルタ setter
  setFilter: (patch: Partial<SalesPerfFilter>) => void;
  resetFilter: () => void;
}

// ----------------------------------------
// 初期フィルタ
// ----------------------------------------
const initialFilter: SalesPerfFilter = {
  line: 'both',
  fiscalYear: DEFAULT_FISCAL_YEAR,
  periodMode: 'full',
  confidenceScenario: 'fixed_s_a',
};

// ----------------------------------------
// ストア
// ----------------------------------------
export const useSalesPerfStore = create<SalesPerfState>((set) => ({
  filter: initialFilter,
  masters: SALES_PERF_MASTERS,
  contracts: normalizedContracts,
  targets: SEED_TARGETS,

  setFilter: (patch) =>
    set((state) => ({ filter: { ...state.filter, ...patch } })),

  resetFilter: () => set({ filter: initialFilter }),
}));
