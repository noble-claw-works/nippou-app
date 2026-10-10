// =====================================================
// salesPerf/data/seedContracts.ts — 開発フォールバック用 barrel
// =====================================================
// G2 改修後の位置づけ:
//   SEED_CONTRACTS → デモフラグ注入用异常値サンプル（既定 OFF）
//   SEED_TARGETS   → 本体データが空のときのフォールバック番（targetAdapter が使用）
// 既存の `import { SEED_CONTRACTS, SEED_TARGETS } from './data/seedContracts'` を維持する。

// 异常値サンプル: DEMO_ANOMALY_ENABLED=true のときのみ store.ts から注入する
export { SEED_CONTRACTS } from "./seed/contracts-anomaly";
// フォールバック目標行: 本体 salesTargets が空のときに targetAdapter が使用
export { SEED_TARGETS } from "./seed/contracts-targets";
