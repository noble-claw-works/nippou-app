# 営業進捗管理ダッシュボード 設計書（最終版）

**対象**: `noble-claw-works/nippou-app` (branch: `staging`) / 305-hrl-nippou-app
**設計方針**: モック(localStorage seed ベースのフルCRUD)。実DBは持たず、フロント型モデル + seed データ + Zustand store で完結。
**作成**: 青龍 (architect subagent) / 2026-07-05
**主軸要件**: 目標対比の達成率(ノルマ達成率)。**期間は月次 / 四半期 / 年間の3種に対応**。

---

## ① 目的 / 要件

### 目的
営業組織のノルマ(営業目標)達成状況を可視化し、**目標対比の達成率を主軸**とした進捗管理を実現する。個人・マネージャーの2階層で、目標に対する現在地・不足分・チーム内順位を、**月次 / 四半期 / 年間**の各期間で把握できるようにする。

### 機能要件
1. **個人用ダッシュボード** (`/sales-dashboard`)
   - `general`: 本人の営業進捗のみ閲覧
   - `manager`: 対象者セレクタで自チームメンバーの個人進捗に切替可能
   - 表示: ①**達成カードの横並びレーン(主視覚、後述)** ②目標対比達成率(成約件数 / 保険料額) ③商談ファネル(Opportunity 8 stage) ④成約実績(Policy 一覧・期間サマリ)
   - **主視覚要素 = 単月達成カード×12(その年の1〜12月)の横並びレーン**(先方明確要望)。期間タブで monthly=12カード / quarterly=4カード / annual=1カードに統一切替
   - **期間切替(月次 / 四半期 / 年間)** と **対象年切替(前年 / 翌年)** に対応

2. **マネージャー用ダッシュボード** (`/team-dashboard`)
   - `manager` / `executive` / `admin`
   - チームメンバー横断: 達成カードレーン(チーム集計の12/4/1カード)、メンバー別達成率ランキング/一覧、チーム集計(目標対比)、未達アラート
   - **期間切替(月次 / 四半期 / 年間)** と **対象年切替** に対応

### 非機能・整合要件
- 既存 `types/index.ts` の命名規約・型スタイルに厳密準拠 (interface, camelCase, `id: string`, ISO 日付文字列)
- 既存 orgChart.ts のチーム階層 (`getSubordinatesOf`) と role に整合
- 実績算出は既存 `Policy` / `Opportunity` を集計するだけ (新規実績データは作らない)
- 新規追加は「目標(Target)」型のみ。localStorage 永続化パターン `nippou.<name>.v1` を踏襲
- **年間↔四半期↔月次のロールアップ整合**(実績は自動整合、目標は独立設定+整合警告)

---

## ② データモデル

### 2-1. 新規型定義 (`src/types/index.ts` に追記)

現行 types に営業目標型が無いため新設する。既存の `ProductCategory` 等は再利用。

```typescript
// =====================================================
// SalesTarget (営業目標 / ノルマ) 型 — Phase 4
// =====================================================

/** 目標の対象スコープ: 個人 or チーム */
export type TargetScope = 'individual' | 'team';

/** 目標期間種別。既定は月次。四半期・年間もサポート */
export type TargetPeriodType = 'monthly' | 'quarterly' | 'annual';

/**
 * 営業目標(ノルマ)。個人単位・チーム単位の双方を1型で表す。
 * scope='individual' のとき ownerId=User.id、scope='team' のとき ownerId=Team.id。
 * period 書式は periodType により固定:
 *   monthly   → 'YYYY-MM'   (例 '2026-07')
 *   quarterly → 'YYYY-Qn'   (例 '2026-Q3', n=1..4)
 *   annual    → 'YYYY'      (例 '2026')
 * 同一 owner が monthly/quarterly/annual を並存可能。突合キーは (scope, ownerId, periodType, period)。
 */
export interface SalesTarget {
  id: string;
  scope: TargetScope;
  ownerId: string;              // scope=individual → User.id / scope=team → Team.id
  periodType: TargetPeriodType; // 既定 'monthly'
  period: string;               // 'YYYY-MM' | 'YYYY-Qn' | 'YYYY'
  /** 成約件数の目標 (Policy inforce 化ベース) */
  targetPolicyCount: number;
  /** 成約保険料額の目標。月換算保険料の合計 (monthlyPremium ベース) */
  targetPremium: number;
  memo: string;
  createdByUserId: string;      // 設定者 (manager/admin)
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
}
```

> **設計判断**: `targetPremium` は既存 `Policy.monthlyPremium` に揃え「月換算保険料」を単位とする(年払契約も月換算で正規化 → ③)。件数・金額の2指標に絞り、商品カテゴリ別目標は本フェーズでは持たない(将来 `Record<ProductCategory, number>` で拡張可)。

### 2-2. 期間ユーティリティ (`src/utils/salesPeriod.ts` 新規)

period 文字列の書式・判定・ロールアップを一元管理する。**四半期は前方一致で判定不能**なため、全モジュールは本ユーティリティ経由で判定する。

```typescript
// src/utils/salesPeriod.ts — 期間ユーティリティ
export type PeriodType = 'monthly' | 'quarterly' | 'annual';

/** 会計年度開始月 (1=1月始まり)。hrl が4月始まり等ならここだけ変更 */
export const FISCAL_START_MONTH = 1;

/** Date → 各期間の period 文字列 */
export function toPeriod(date: Date, type: PeriodType): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1..12
  if (type === 'monthly')   return `${y}-${String(m).padStart(2, '0')}`;
  if (type === 'annual')    return `${y}`;
  const q = Math.floor((m - 1) / 3) + 1; // 1..4
  return `${y}-Q${q}`;
}

/** ある契約日 (YYYY-MM-DD) が、指定 period(type) に属するか */
export function dateInPeriod(dateStr: string, type: PeriodType, period: string): boolean {
  if (!dateStr) return false;
  const ym = dateStr.slice(0, 7);   // 'YYYY-MM'
  const y  = dateStr.slice(0, 4);   // 'YYYY'
  if (type === 'monthly')  return ym === period;
  if (type === 'annual')   return y === period;
  // quarterly: period='YYYY-Qn'
  const [py, pq] = period.split('-Q');
  if (y !== py) return false;
  const m = Number(dateStr.slice(5, 7));
  const q = Math.floor((m - 1) / 3) + 1;
  return q === Number(pq);
}

/** 指定 period 内に含まれる下位 period 群を返す(ロールアップ用) */
export function childPeriods(type: PeriodType, period: string): { monthly: string[]; quarterly: string[] } {
  if (type === 'monthly') return { monthly: [period], quarterly: [] };
  if (type === 'quarterly') {
    const [y, q] = period.split('-Q');
    const startM = (Number(q) - 1) * 3 + 1;
    const monthly = [0, 1, 2].map(i => `${y}-${String(startM + i).padStart(2, '0')}`);
    return { monthly, quarterly: [period] };
  }
  // annual → 4 四半期 + 12 か月
  const quarterly = [1, 2, 3, 4].map(n => `${period}-Q${n}`);
  const monthly = Array.from({ length: 12 }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
  return { monthly, quarterly };
}

/** period を前後 1 単位ずらす(期間ナビ用) */
export function shiftPeriod(type: PeriodType, period: string, delta: number): string {
  if (type === 'monthly') {
    const [y, m] = period.split('-').map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    return toPeriod(dt, 'monthly');
  }
  if (type === 'annual') return `${Number(period) + delta}`;
  const [y, q] = period.split('-Q').map(Number);
  let ny = y, nq = q + delta;
  while (nq > 4) { nq -= 4; ny += 1; }
  while (nq < 1) { nq += 4; ny -= 1; }
  return `${ny}-Q${nq}`;
}

/**
 * カードレーン用: 指定年 + periodType に属する period 配列を順番に返す。
 *   monthly   → 12 本 ['2026-01' .. '2026-12']
 *   quarterly →  4 本 ['2026-Q1' .. '2026-Q4']
 *   annual    →  1 本 ['2026']
 */
export function periodsOfYear(year: number, type: PeriodType): string[] {
  if (type === 'annual') return [`${year}`];
  if (type === 'quarterly') return [1, 2, 3, 4].map(n => `${year}-Q${n}`);
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}
```

### period 書式規約(全モジュール共通)

| periodType | period 書式 | 例 | 含む月 |
|---|---|---|---|
| `monthly` | `YYYY-MM` | `2026-07` | 当月 |
| `quarterly` | `YYYY-Qn` (n=1..4) | `2026-Q3` | Q1=01-03 / Q2=04-06 / Q3=07-09 / Q4=10-12 |
| `annual` | `YYYY` | `2026` | 01-12 |

会計年度は暦年(1月始まり)を既定とし、`FISCAL_START_MONTH` 定数で将来吸収。

### 2-3. seed データ例 (`src/data/seed.ts` に追記)

既存の `mkOpp` / `mkPolicy` と同様に helper を用意。月/四半期/年の3種を代表ユーザー分投入し、ロールアップ整合(四半期≈月次×3, 年間≈四半期×4)を持たせる。

```typescript
import type { SalesTarget } from '../types';
import { toPeriod } from '../utils/salesPeriod';

const now = new Date();
const P = { m: toPeriod(now, 'monthly'), q: toPeriod(now, 'quarterly'), y: toPeriod(now, 'annual') };

const mkTarget = (
  id: string, scope: SalesTarget['scope'], ownerId: string,
  periodType: SalesTarget['periodType'], period: string,
  targetPolicyCount: number, targetPremium: number, createdByUserId: string,
): SalesTarget => ({
  id, scope, ownerId, periodType, period,
  targetPolicyCount, targetPremium, memo: '', createdByUserId,
  createdAt: _now, updatedAt: _now,
});

export const SALES_TARGETS: SalesTarget[] = [
  // 個人 u1(霧島): 月3件/4万 → 四半期9件/12万 → 年間36件/48万
  mkTarget('tgt_u1_m', 'individual', 'u1', 'monthly',   P.m, 3,  40000,  'u4'),
  mkTarget('tgt_u1_q', 'individual', 'u1', 'quarterly', P.q, 9,  120000, 'u4'),
  mkTarget('tgt_u1_y', 'individual', 'u1', 'annual',    P.y, 36, 480000, 'u4'),
  // 個人 u3(山田)
  mkTarget('tgt_u3_m', 'individual', 'u3', 'monthly',   P.m, 2,  30000,  'u4'),
  mkTarget('tgt_u3_q', 'individual', 'u3', 'quarterly', P.q, 6,  90000,  'u4'),
  // 個人 u2(営業2課)
  mkTarget('tgt_u2_m', 'individual', 'u2', 'monthly',   P.m, 2,  25000,  'u5'),
  // チーム t1(営業1課): 月6件/8万 → 四半期18件/24万 → 年間72件/96万
  mkTarget('tgt_t1_m', 'team', 't1', 'monthly',   P.m, 6,  80000,  'u5'),
  mkTarget('tgt_t1_q', 'team', 't1', 'quarterly', P.q, 18, 240000, 'u5'),
  mkTarget('tgt_t1_y', 'team', 't1', 'annual',    P.y, 72, 960000, 'u5'),
  // チーム t2(営業2課)
  mkTarget('tgt_t2_m', 'team', 't2', 'monthly',   P.m, 2,  25000,  'u5'),
];
```

### 2-4. store 拡張 (`src/store/index.ts`)

`opportunities` / `policies` と同じ localStorage 永続化パターンを踏襲。突合は periodType 込み。

```typescript
// AppState interface へ追記
  // Data: SalesTarget
  salesTargets: SalesTarget[];

  // Actions: SalesTarget
  addSalesTarget: (partial: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>) => SalesTarget;
  updateSalesTarget: (id: string, patch: Partial<SalesTarget>) => void;
  deleteSalesTarget: (id: string) => void;
  getTarget: (scope: TargetScope, ownerId: string, periodType: TargetPeriodType, period: string) => SalesTarget | undefined;
  upsertTarget: (
    scope: TargetScope, ownerId: string, periodType: TargetPeriodType, period: string,
    values: { targetPolicyCount: number; targetPremium: number; memo?: string },
    createdByUserId: string,
  ) => SalesTarget;
```

初期化 (localStorage 復元) は既存 `opportunities` セクションと同一パターン:

```typescript
  salesTargets: (() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('nippou.salesTargets.v1');
        if (raw) return JSON.parse(raw) as SalesTarget[];
      } catch { /* ignore */ }
    }
    return SALES_TARGETS;
  })(),
```

`getTarget` / `upsertTarget` は `(scope, ownerId, periodType, period)` の複合キーで検索/更新。全 mutation で `localStorage.setItem('nippou.salesTargets.v1', ...)` を実施。`resetAll()` に `salesTargets: SALES_TARGETS` と `localStorage.removeItem('nippou.salesTargets.v1')` を追記。

---

## ③ 達成率算出ロジック(3期間対応)

### 3-1. 実績(分子)の定義

**既定: 実績 = 成約契約(Policy)。選択期間に成立した契約の件数と月換算保険料合計。** Opportunity は補助ファネル指標として別枠表示(実績にはカウントしない)。

- **成約件数の実績**: 対象期間内に `status === 'inforce'` の Policy 件数。判定は `Policy.startDate` を `dateInPeriod(startDate, periodType, period)` で突合(四半期は前方一致不可のため必須)。`pending`(申込中)は実績に含めず見込みとして別表示。
- **保険料額の実績**: 上記対象 Policy の**月換算保険料**合計。`monthlyPremium` を基本、0 かつ `annualPremium` があれば `annualPremium/12`。

```typescript
// src/utils/salesMetrics.ts (新規)
import type { Policy, Opportunity } from '../types';
import { dateInPeriod, childPeriods, type PeriodType } from './salesPeriod';

/** 未達判定閾値(達成率%) */
export const UNDER_TARGET_THRESHOLD = 70;

/** 契約の月換算保険料。monthly が無ければ annual/12 にフォールバック */
export function monthlyEquivPremium(p: Pick<Policy, 'monthlyPremium' | 'annualPremium'>): number {
  if (p.monthlyPremium && p.monthlyPremium > 0) return p.monthlyPremium;
  if (p.annualPremium && p.annualPremium > 0) return Math.round(p.annualPremium / 12);
  return 0;
}

/** period(type) に成約(発効)した inforce 契約か */
export function isAchievedInPeriod(p: Policy, type: PeriodType, period: string): boolean {
  return p.status === 'inforce' && dateInPeriod(p.startDate, type, period);
}

export interface Achievement {
  policyCount: number;
  premium: number;        // 月換算保険料合計
  pendingCount: number;   // 申込中 (見込み・別表示)
  pendingPremium: number;
}

/** owner(User.id) 群の実績を集計。ownerId は Policy.ownerId に対応 */
export function calcAchievement(
  policies: Policy[], ownerIds: string[], type: PeriodType, period: string,
): Achievement {
  const mine = policies.filter(p => ownerIds.includes(p.ownerId));
  const achieved = mine.filter(p => isAchievedInPeriod(p, type, period));
  const pending  = mine.filter(p => p.status === 'pending' && dateInPeriod(p.startDate, type, period));
  return {
    policyCount: achieved.length,
    premium: achieved.reduce((s, p) => s + monthlyEquivPremium(p), 0),
    pendingCount: pending.length,
    pendingPremium: pending.reduce((s, p) => s + monthlyEquivPremium(p), 0),
  };
}

/** 達成率 (%). 目標0のとき: 実績>0 なら 100 扱い、実績0なら 0 */
export function achievementRate(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}
```

### 3-2. ファネル(補助指標)

Opportunity を stage 別に件数集計。オーナー(または対象メンバー群)でフィルタし、8 stage(approach…issued、lost は別掲)を `STAGE_META` の順で表示。

```typescript
import { STAGE_META } from '../components/opportunity/StageBadge';
import type { OpportunityStage } from '../types';

const FUNNEL_ORDER: OpportunityStage[] = [
  'approach','fact_finding','needs_analysis','proposal',
  'negotiation','application','underwriting','issued',
];

export function calcFunnel(opps: Opportunity[], ownerIds: string[]): Record<OpportunityStage, number> {
  const mine = opps.filter(o => ownerIds.includes(o.ownerId));
  const base = Object.fromEntries(FUNNEL_ORDER.map(s => [s, 0])) as Record<OpportunityStage, number>;
  base.lost = 0;
  for (const o of mine) base[o.stage] = (base[o.stage] ?? 0) + 1;
  return base;
}
```

### 3-3. チーム集計

チームメンバー ID 群 = `Team.memberIds`。チーム実績はメンバー全員の Policy を合算 (`calcAchievement(policies, team.memberIds, type, period)`)。チーム目標は `getTarget('team', teamId, periodType, period)`。メンバー別ランキングは各 `general/manager` メンバーの選択期間の達成率で降順ソート(件数主・金額副)。

### 3-4. 期間ロールアップ(実績は自動整合)

```typescript
/** 上位 period の下位内訳を返す(ロールアップ表示用) */
export function rollupAchievements(
  policies: Policy[], ownerIds: string[], type: PeriodType, period: string,
): { period: string; ach: Achievement }[] {
  const { monthly, quarterly } = childPeriods(type, period);
  if (type === 'annual') {
    return quarterly.map(q => ({ period: q, ach: calcAchievement(policies, ownerIds, 'quarterly', q) }));
  }
  if (type === 'quarterly') {
    return monthly.map(m => ({ period: m, ach: calcAchievement(policies, ownerIds, 'monthly', m) }));
  }
  return [{ period, ach: calcAchievement(policies, ownerIds, 'monthly', period) }];
}
```

---

## ④ 期間ロールアップ整合(月次↔四半期↔年間)

### 4-1. 実績のロールアップ(常に自動整合)
実績は Policy の `startDate` から都度集計するため、定義上**厳密に整合**する(単一ソース = Policy):

```
年間実績 = Σ(四半期実績 Q1..Q4) = Σ(月次実績 1..12)
四半期実績 = Σ(当該3か月の月次実績)
```

`childPeriods()` / `rollupAchievements()` で下位内訳を展開表示。実績側にズレは起きない。**テストで恒等式(年間=Σ四半期=Σ月次)を担保**する。

### 4-2. 目標のロールアップ(独立設定 → 差分警告)
**目標は3期間で独立に設定可能**(現場都合で年間 ≠ 四半期×4 になりうる)。強制整合はせず、**不整合を検知して警告表示**する:

```typescript
export interface TargetConsistency {
  annualTarget?: number;        // 上位目標(件数 or 保険料)
  sumOfChildren?: number;       // 下位目標の合計
  gap?: number;                 // upper - Σchild
  status: 'ok' | 'over' | 'under' | 'no_data';
}

/** 上位目標と下位目標合計の整合をチェック(件数・保険料それぞれで呼ぶ) */
export function checkTargetRollup(upper: number | undefined, children: number[]): TargetConsistency {
  if (upper == null || children.length === 0) return { status: 'no_data' };
  const sum = children.reduce((s, n) => s + n, 0);
  const gap = upper - sum;
  return { annualTarget: upper, sumOfChildren: sum, gap,
    status: gap === 0 ? 'ok' : gap > 0 ? 'under' : 'over' };
}
```

- `under`(下位合計 < 上位): 「合計が上位目標に未達 (残 N)」橙表示
- `over`(下位合計 > 上位): 「合計が上位目標を超過」青表示
- **年間 vs 四半期×4** / **四半期 vs 月次×3** の双方を同関数で検査
- `TargetEditModal` 保存時に差分をインライン提示(保存はブロックしない=現場裁量尊重)

---

## ⑤ 権限マトリクス

| role | 個人ダッシュボード | 対象者切替 | チームダッシュボード | 目標設定(自分) | 目標設定(他者/チーム) |
|---|---|---|---|---|---|
| `general` | 本人のみ | ✗ | ✗ | ✗ | ✗ |
| `manager` | 本人 + 自チームメンバー | ✓(自チーム内) | ✓(自チームのみ) | ✗ | ✓(自チーム個人・チーム目標) |
| `executive` | 全員 | ✓(全員) | ✓(全チーム) | — | ✓(全て) |
| `admin` | 全員 | ✓(全員) | ✓(全チーム) | — | ✓(全て) |

判定ルール(既存 orgChart.ts / role に整合):
- **切替可能な対象者集合**: `general`→`[currentUser]` / `manager`→`[currentUser, ...getSubordinatesOf()]` / `executive`・`admin`→全 `general/manager`
- **チーム集合**: `manager`→`teams.filter(t => t.managerIds.includes(currentUserId))` / `executive`・`admin`→全チーム
- **目標設定権限**: `manager`(自チーム範囲) / `executive` / `admin`。`general` は閲覧のみ

```typescript
import type { Role, User, Team } from '../types';
import { getSubordinatesOf } from './orgChart';

export function getScopeUsers(role: Role, userId: string, users: User[], teams: Team[]): User[] {
  if (role === 'general') return users.filter(u => u.id === userId);
  if (role === 'manager') {
    const subs = getSubordinatesOf(userId, users, teams);
    const self = users.find(u => u.id === userId);
    return self ? [self, ...subs.filter(s => s.id !== userId)] : subs;
  }
  // executive / admin
  return users.filter(u => u.role === 'general' || u.role === 'manager');
}
```

> **注意**: 既存 `canViewReport` は admin に false を返す(admin は日報非閲覧)。営業ダッシュボードは日報本文を出さず集計値のみのため admin も閲覧可。`canViewReport` は**流用せず** `getScopeUsers` を使う(誤流用防止)。日報詳細へのディープリンクは張らない。

---

## ⑥ 画面 / ルート / コンポーネント構成

### 6-1. ルーティング (`src/App.tsx`)
既存 `/dashboard`(日報管理ダッシュボード)はそのまま残す。営業ダッシュボードは新規2ルート:

```tsx
<Route path="/sales-dashboard" element={<SalesDashboardPage />} />   {/* 個人 */}
<Route path="/team-dashboard"  element={<TeamDashboardPage />} />    {/* マネージャー */}
```

### 6-2. サイドバー (`src/components/layout/AppShell.tsx`)
`NAV_ITEMS` に2項目追加(既存 `/dashboard` の下)。`lucide-react` から `Target`, `TrendingUp` を追加 import:

```tsx
{ to: '/sales-dashboard', icon: Target,     label: '営業進捗',   roles: ['general','manager','executive','admin'] },
{ to: '/team-dashboard',  icon: TrendingUp, label: 'チーム進捗', roles: ['manager','executive','admin'] },
```

### 6-3. ページ / コンポーネント構成

```
src/pages/
  SalesDashboardPage.tsx      … 個人用。年切替 + 期間切替 + 対象者セレクタ(manager+) + カードレーン + パネル群
  TeamDashboardPage.tsx       … マネージャー用。年切替 + 期間切替 + チームセレクタ + カードレーン + 集計・ランキング

src/components/sales/
  AchievementCardRow.tsx      … 【主視覚】達成カード横並びレーン。monthly=12 / quarterly=4 / annual=1 を統一表現。年切替・水平スクロール・当月オートスクロール
  MonthlyAchievementCard.tsx  … 単一期間(月/四半期/年)の達成カード。達成率(件数/保険料)・目標/実績・達成/未達バッジ
  PeriodSwitcher.tsx          … 月次/四半期/年間 セグメント + 年(period)前後ナビ(URLクエリ同期)
  PersonSelector.tsx          … 対象者/チーム切替ドロップダウン(共通)
  TargetProgressCard.tsx      … 選択カードの詳細サマリ(件数/保険料の2ゲージ)+ロールアップ内訳
  SalesFunnelPanel.tsx        … Opportunity 8 stage ファネル(横バー/件数)
  RecentPoliciesPanel.tsx     … 選択期間の成約 Policy 一覧 + 申込中(見込み)別掲
  MemberRankingTable.tsx      … メンバー別達成率ランキング(TeamDashboard 用)
  TeamSummaryCard.tsx         … チーム集計(目標対比)カード + 整合バッジ
  UnderTargetAlert.tsx        … 未達アラート(達成率 < UNDER_TARGET_THRESHOLD のメンバー)
  TargetEditModal.tsx         … 目標設定 UI(月/四半期/年 選択, manager/executive/admin)

src/utils/
  salesPeriod.ts              … 期間ユーティリティ(toPeriod/dateInPeriod/childPeriods/shiftPeriod/periodsOfYear)
  salesMetrics.ts             … 達成率・ファネル・ロールアップ・権限の算出関数群(純関数)
```

**再利用する既存資産**: `Modal.tsx`, `EmptyState.tsx`/`ForbiddenState`, `StageBadge`/`STAGE_META`, `PolicyStatusBadge`, `formatDate`(utils), `getSubordinatesOf`(orgChart), Tailwind カードスタイル(`bg-white rounded-xl border border-gray-200 p-4`)。既存 DashboardPage のカード/バー UI をスタイル基準にする。

### 6-4. 期間切替UI (`PeriodSwitcher`) と カードレーンの統一

主軸の視覚表現は **達成カードの横並びレーン(`AchievementCardRow`)**。先方の明確な希望「単月の達成状況カードを横に12個並べる」を中核に据え、**期間タブでカード枚数を切替える統一 UI** とする:

```
対象年:  ◀ 2026 ▶      [ 月次 | 四半期 | 年間 ]

─────────────────── カードレーン (水平スクロール) ──────────────────
[1月][2月][3月][4月][5月][6月][7月★][8月][9月][10月][11月][12月]
```

- **`periodType` タブとカード枚数の対応**: `monthly`=12カード(1〜12月) / `quarterly`=4カード(Q1〜Q4) / `annual`=1カード(年間)。`periodsOfYear(year, type)` が描画対象 period 配列を返し、`AchievementCardRow` がそれを map して `MonthlyAchievementCard` を並べる(同一コンポーネントで3ビューを統一表現)
- **年切替**: `◀ 年 ▶` で対象年を前年/翌年に移動(`shiftPeriod(..,'annual',±1)` or year±1)。レーン全体が新年のカード群に入れ替わる
- **既定**: `monthly` + **当年**。当月カードをハイライト(枕色)し、マウント時にレーンを当月位置へオートスクロール(`scrollIntoView({inline:'center'})`)
- **カード選択**: カードをクリックすると `period`をその月/四半期にセットし、下部の `TargetProgressCard`/`RecentPoliciesPanel` がその period の詳細を表示(レーン=一覧 / 下部=選択期間のドリルダウン)
- **URL クエリ**: `?year=2026&pt=monthly&period=2026-07&user=<id>` を正本とする(共有・リロード耐性)
- **レスポンシブ扱い**: PC/タブレットは横スクロール(`overflow-x-auto snap-x`)で 12 カードを 1 レーン。スマホ(< sm)はカード幅を縮め `snap` で横スワイプ。折返しモードは既定では使わず水平一列を維持(1年の連続性を視覚化するため)。将来 prop `wrap?: boolean` で折返しも選択可能にしておく

### 6-5. `MonthlyAchievementCard` 仕様(レーンの単位カード)

単一 period(月/四半期/年)の達成状況を 1 枚で表す。`AchievementCardRow` から map で並べられる。

- **ヘッダー**: 期間ラベル(`1月`/`Q3`/`2026`)。当月は枕色リング + `今` バッジ。未来月は薄グレー(実績0・進行形)
- **達成率(主)**: 件数達成率を大きく `xx%`。達成率で色分け(≥100 緑 / ≥70 青 / <70 橙 / 実績0 グレー) = `achievementRate(ach.policyCount, target.targetPolicyCount)`
- **目標/実績**: `件数 achieved/target 件` と `保険料 ¥achieved/¥target` を 2 行。ミニゲージ(件数)を下部に
- **達成/未達バッジ**: ≥90% → ✅達成 / 70〜89% → ⚠あと少し / <70% → ❌未達 / 目標未設定 → グレー「—」
- **見込み**: `pendingCount>0` なら 「申込中 N」を薄色チップで下揣げ
- **クリック**: 選択中レンダリング(下部詳細パネルへと period 連動)。`onSelect(period)` を props で受ける
- **幅**: monthly は `w-32`相当の固定幅×12で横スクロール。quarterly/annual はカード数が少ないため幅を広げて(`flex-1` 上限付) レーンを埋める

props: `{ periodType, period, target?: SalesTarget, ach: Achievement, isCurrent: boolean, isSelected: boolean, onSelect: (period: string) => void }`。純粋に表示だけを担い、集計は親(`salesMetrics`)側で行う。

### 6-6. 画面レイアウト(要点)

**個人用 (`/sales-dashboard`)**
1. ヘッダー: 「🎯 営業進捗」+ `PeriodSwitcher`(年切替+月/四半期/年タブ) + (manager+) `PersonSelector`
2. **`AchievementCardRow`(主視覚・最上部)**: 対象年のカードレーン。monthly=12カード / quarterly=4 / annual=1。`periodsOfYear(year, pt).map(p => calcAchievement(policies, [targetUserId], pt, p))` で各カードの実績を算出し、`getTarget('individual', targetUserId, pt, p)` で目標を解決。当月ハイライト+オートスクロール
3. `TargetProgressCard`(選択カードの詳細): レーンで選んだ period の件数ゲージ + 保険料ゲージ。目標未設定時は「この期間の目標未設定」+ (権限あれば)設定ボタン。年間/四半期選択時はロールアップ内訳バー(年間→四半期4本 / 四半期→月次3本)
4. `SalesFunnelPanel`: 8 stage 横バー。`lost` は別行(赤)で参考表示
5. `RecentPoliciesPanel`: 選択 period の成約契約リスト(→`/policies/:id`) + 申込中を薄色で別掲

**マネージャー用 (`/team-dashboard`)**
1. ヘッダー: 「📈 チーム進捗」+ `PeriodSwitcher`(年切替+タブ) + チームセレクタ
2. **`AchievementCardRow`(主視覚・最上部/チーム集計)**: 個人と同一コンポーネントをチーム集計で使用。実績=`calcAchievement(policies, team.memberIds, pt, p)`、目標=`getTarget('team', teamId, pt, p)`で 12/4/1 カードをチーム単位で表示(カードは流用、集計スコープだけ切替)
3. `TeamSummaryCard`: 選択 period のチーム目標対比(件数/保険料 達成率ゲージ) + 整合バッジ + メンバー数・期間合計
4. `UnderTargetAlert`: 選択 period で達成率 < `UNDER_TARGET_THRESHOLD` のメンバーを橙カードで列挙
5. `MemberRankingTable`: 選択 period のメンバー別達成率ランキング(行クリックで `/sales-dashboard?user=<id>&year=&pt=&period=` へ遷移)
6. `SalesFunnelPanel`(チーム集約): チーム全員の商談ファネル合算

> チームダッシュボードでも 12カード表現は **可能**。`AchievementCardRow` は `ownerIds: string[]` と `scope` を props で受け、個人(=単一 userId)/チーム(=memberIds 集合 + team 目標)の両方を同一実装で描画する。

`general` が `/team-dashboard` に到達したら `<ForbiddenState />`。個人ページの `?user=` は権限外なら本人にフォールバック。

---

（以下、章⑦=実装タスク分解、章⑧=既存コード影響範囲）

## ⑦ 実装タスク分解 (coder 向け・順序付き)

> 実装は `sonnet` coder 想定。DB変更なし(モック)なので `db-migration-safety` 不要。UI 実装は `ui-design-standards` 準拠。各タスクは前タスク完了を前提に順序実行。着手順の推奨は **1→2→3→4(基盤) → 5→6(個人) → 7→8(チーム) → 9→10→11**。

1. **型定義追加** (`src/types/index.ts`): `TargetScope` / `TargetPeriodType`('monthly'|'quarterly'|'annual') / `SalesTarget` を Phase 4 セクションとして追記。〔~30 行〕
2. **期間ユーティリティ** (`src/utils/salesPeriod.ts` 新規): `PeriodType` / `FISCAL_START_MONTH` / `toPeriod` / `dateInPeriod` / `childPeriods` / `shiftPeriod` / **`periodsOfYear`(カードレーン用: 年+type→period配列 12/4/1)**。純関数。〔~95 行〕
3. **算出ユーティリティ** (`src/utils/salesMetrics.ts` 新規): `UNDER_TARGET_THRESHOLD` / `monthlyEquivPremium` / `isAchievedInPeriod` / `calcAchievement`(type 引数付き) / `achievementRate` / `calcFunnel` / `rollupAchievements` / `checkTargetRollup` / `getScopeUsers`。すべて純関数で単体テスト容易に。〔~150 行〕
4. **seed 追加** (`src/data/seed.ts`): import に `SalesTarget` と `toPeriod` 追加、`mkTarget` helper と `SALES_TARGETS`(月/四半期/年の複合)を定義。〔~40 行〕
5. **store 拡張** (`src/store/index.ts`): `salesTargets` state + localStorage 復元/永続化 + `addSalesTarget`/`updateSalesTarget`/`deleteSalesTarget`/`getTarget`(periodType 込み)/`upsertTarget`(periodType 込み) 実装、`resetAll` 追記、`SALES_TARGETS` を import。既存 opportunities パターンを複写。〔~80 行〕
6. **達成カードレーン(主視覚)**: `MonthlyAchievementCard.tsx`(6-5 仕様: 単一 period の達成率/目標/実績/達成未達バッジ/見込み/当月ハイライト/onSelect) と `AchievementCardRow.tsx`(`periodsOfYear` で 12/4/1 カードを map、`overflow-x-auto snap-x` 水平レーン、当月 `scrollIntoView`、props: `scope`/`ownerIds`/`year`/`periodType`/`selectedPeriod`/`onSelect`)。〔Card ~70 行 / Row ~90 行〕
7. **共通コンポーネント**: `PeriodSwitcher.tsx`(年切替 `◀ year ▶` + 月/四半期/年セグメント + URLクエリ `year`/`pt`/`period` 同期)、`PersonSelector.tsx`、`TargetProgressCard.tsx`(選択 period 詳細+ロールアップ内訳)、`SalesFunnelPanel.tsx`、`RecentPoliciesPanel.tsx`。〔各 40–90 行〕
8. **個人ページ** `SalesDashboardPage.tsx`: role ガード + `getScopeUsers` で対象者集合 + `?user=`/`?year=`/`?pt=`/`?period=` クエリ解決 + `AchievementCardRow`(scope='individual', ownerIds=[targetUserId]) を最上部に、以下に詳細パネル組み立て。〔~150 行〕
9. **マネージャー用コンポーネント**: `TeamSummaryCard.tsx`(整合バッジ含む)、`MemberRankingTable.tsx`、`UnderTargetAlert.tsx`。〔各 50–100 行〕
10. **マネージャーページ** `TeamDashboardPage.tsx`: role ガード(general 禁止) + チームセレクタ + `PeriodSwitcher` + `AchievementCardRow`(scope='team', ownerIds=team.memberIds) を最上部に + 集計組み立て。〔~155 行〕
11. **目標設定 UI** `TargetEditModal.tsx`: periodType(月/四半期/年)選択 + `upsertTarget` 呼び出し + 権限判定(manager は自チーム範囲、exec/admin 全体) + 保存時 `checkTargetRollup` 差分インライン提示。既存 `Modal.tsx` 利用。〔~110 行〕
12. **ルーティング + ナビ**: `App.tsx` に 2 ルート追加、`AppShell.tsx` の `NAV_ITEMS` に 2 項目 + `Target`/`TrendingUp` アイコン import。〔~12 行〕
13. **テスト**:
    - `src/__tests__/salesPeriod.test.ts`: `toPeriod`/`dateInPeriod`/`childPeriods`/`shiftPeriod`/**`periodsOfYear`(12/4/1 本と順序)** の月・四半期・年境界(例: 3月末=Q1, 4月頭=Q2)。〔~100 行〕
    - `src/__tests__/salesMetrics.test.ts`: `achievementRate`(目標0/超過/未達)、`calcAchievement`(3期間)、`rollupAchievements` の恒等式(**年間 = Σ四半期 = Σ月次**)、`checkTargetRollup`(ok/under/over)、`getScopeUsers`(general/manager/exec)。既存 vitest パターン準拠。〔~130 行〕

**総ボリューム目安**: 新規 ~13 ファイル(MonthlyAchievementCard/AchievementCardRow 追加) + 既存 4 ファイル追記、実装 **1,250〜1,500 行**程度。coder 1 セッションでは タスク 1–5(基盤) / 6–8(カードレーン+個人) / 9–10(チーム) / 11–13(設定・配線・テスト) に分割して着手するのが安全。

---

## ⑧ 既存コードへの影響範囲・リスク

### 8-1. 影響ファイル(改修)

| ファイル | 変更内容 | リスク |
|---|---|---|
| `src/types/index.ts` | 型追加のみ(末尾 Phase 4 節) | 低。既存型に非破壊 |
| `src/data/seed.ts` | `SalesTarget`/`toPeriod` import 追加、`mkTarget`/`SALES_TARGETS` export 追加 | 低。store import・`resetAll` と同期必須 |
| `src/store/index.ts` | state/action 追加、`resetAll` 更新、`SALES_TARGETS` import | 中。AppState interface と実装の両方に追記漏れ注意。localStorage 新キー(`nippou.salesTargets.v1`)で既存キー衝突なし |
| `src/App.tsx` | ルート 2 本追加 | 低 |
| `src/components/layout/AppShell.tsx` | NAV_ITEMS 2 項目 + アイコン import | 低。既存 `/dashboard` と紛らわしいラベルにしない(「営業進捗」「チーム進捗」で明確化) |

新規ファイルは既存に影響しない(`src/utils/salesPeriod.ts`, `src/utils/salesMetrics.ts`, `src/pages/SalesDashboardPage.tsx`, `src/pages/TeamDashboardPage.tsx`, `src/components/sales/*`(`AchievementCardRow`/`MonthlyAchievementCard`/`PeriodSwitcher`/`PersonSelector`/`TargetProgressCard`/`SalesFunnelPanel`/`RecentPoliciesPanel`/`MemberRankingTable`/`TeamSummaryCard`/`UnderTargetAlert`/`TargetEditModal`), `src/__tests__/salesPeriod.test.ts`, `src/__tests__/salesMetrics.test.ts`)。

### 8-2. リスクと対策

1. **既存 `/dashboard` との混同**: 日報管理DBと営業進捗DBは別物。統合せず別ルート・別ラベルで分離。サイドバーは近接配置しつつ名称で区別。
2. **admin の閲覧範囲**: 既存 `canViewReport` は admin=false(日報非閲覧)。営業ダッシュボードは日報本文を出さない集計のため admin 可。`canViewReport` は**流用せず**新規 `getScopeUsers` を使う(誤流用防止)。
3. **保険料単位の不整合**: `Policy.monthlyPremium` と `annualPremium` 混在。`monthlyEquivPremium` で月換算に正規化。目標も月換算基準に統一(四半期・年間目標も月換算保険料の合計として設定)。
4. **四半期を前方一致で誤判定するリスク**: `period='2026-Q3'` は `startDate.startsWith()` で判定不能。**必ず `dateInPeriod()` を経由**(salesMetrics から直接 `startsWith` 禁止)。テストで月境界(3月末=Q1/4月頭=Q2)を必ず検証。
5. **会計年度が暦年でない場合**: hrl が4月始まり等なら `FISCAL_START_MONTH` と四半期算出を要調整。既定は暦年 → **要件確認事項**。
6. **目標の期間非整合(年間≠四半期×4)**: 強制整合しない設計。達成率の**分母は必ず選択中 (periodType, period) の目標**で、他期間目標を混ぜない。ロールアップ内訳は実績のみ表示、目標は各期間の設定値をそのまま表示 + `checkTargetRollup` で整合バッジ警告。
7. **実績判定の月/四半期/年境界**: `dateInPeriod` に依存。`pending`(申込中)は実績外・見込み別掲。経営が見込み込みを見たい場合に備え pending も表示だけはする。
8. **目標未設定時の 0 除算**: `achievementRate` で target≤0 をガード済み(実績>0 は 100%、0 は 0%表示)。UI は「目標未設定」バッジを優先。
9. **オーナー紐付け**: 実績は `Policy.ownerId`、ファネルは `Opportunity.ownerId` で集計。担当引継ぎ済み契約は現 owner に計上(seed 上は担当=owner でほぼ一致)。異論あれば householdId 経由 primaryUserId 集計へ切替可(既定は ownerId)。
10. **localStorage 肥大/破損**: 既存 opportunities/policies と同じ try-catch 復元パターンで JSON 破損時は seed にフォールバック。`resetAll` で確実にクリア。
11. **チーム未所属ユーザー** (executive `u5`/admin `u6` は `teamIds:[]`): 個人目標対象から除外(集計は role=general/manager のみ)。executive/admin 本人の営業実績は集計対象外(営業職ではない前提)。
12. **UI 状態肥大**: year×periodType×period×対象者(user/team) の組合せが増える。state は URL クエリ(`year`/`pt`/`period`/`user`/`team`)を正本にし、コンポーネントは props/クエリ駆動にして局所 state を最小化。
13. **カードレーンの描画コスト**: 12カード×(件数集計+目標解決)を毎レンダーすると policies 全走査×12になる。`AchievementCardRow` 内で `useMemo` により `periodsOfYear(year).map(calcAchievement)` を (policies, ownerIds, year, pt) 依存でメモ化し、カードは純表示に徒する。seed 規模では問題ないが実 DB 移行時の集計 API 分割を念頭に置く。
14. **未来月のノイズ表示**: 当年選択時、未到来月のカードは実績0のため一律未達表示になる。`isCurrent`/未来判定(period > 当月)で未来月は薄グレー「予定」扱いとし、達成未達バッジを出さない(誤った未達印象を避ける)。

---

**実績定義の代案メモ**: 「Opportunity `won`/`issued` 到達」を実績とする案もあるが、`issued` は Policy 化と連動し二重計上リスクがある。**確定契約(Policy inforce)を実績とする案を推奨**し、Opportunity は先行指標(パイプライン)として補助表示に留める。

以上を最終版とする。coder には `salesPeriod.ts → salesMetrics.ts → store/seed → PeriodSwitcher → 各ページ配線` の順で着手させること。

---

## ⑨ 追補: 単月達成カード横並び12枚(先方明確要件・最優先UI)

> 主上経由の先方明確要件。**個人用ダッシュボードのメイン視覚要素**として最優先で実装する。本要件は章②(`periodsOfYear`)・章⑥(6-4/6-5/6-6)・章⑦(タスク6/8/10/13)・章⑧に本編として反映済み。本節はその要点サマリ。

### 要件(確定)
- **単月の達成状況カードを横に12個(1月〜12月)並べる**水平レーンを、個人用 `/sales-dashboard` の主役(最上部)に据える。
- 各カード = 当該月の { 達成率(件数)・達成率(保険料)・目標値・実績値・達成/未達バッジ・見込み }。
- 対象**年**の切替(◀ 2026 ▶ / URLクエリ `?year=YYYY`、既定は当年)。
- **当月をハイライト**(枕色リング+「今」バッジ)し、初期表示で当月が見えるよう **`scrollIntoView({inline:'center'})` でオートスクロール**。
- 横スクロール(`overflow-x-auto snap-x`)を基本。狭幅は snap 横スワイプ。折返しは既定 off(1年の連続性を視覚化)、将来 `wrap?: boolean` で選択可。
- `PeriodSwitcher` と統一UI: `monthly`=12枚 / `quarterly`=4枚(Q1-Q4) / `annual`=1枚 を**同一レーン(`AchievementCardRow`)で枚数だけ切替**。枚数配列は `periodsOfYear(year, type)`。
- 目標未設定の月は「未設定」薄色カード(`achievementRate` の target≤0 ガードで0除算回避)。未来月は薄グレー「予定」扱いで達成/未達バッジを出さない。
- **カードクリック**でその期間を選択(`onSelect(period)`)→ 下部 `TargetProgressCard`/`SalesFunnelPanel`/`RecentPoliciesPanel` がその期間にフォーカス。
- マネージャー用 `/team-dashboard` でも、チーム集計版の12枚レーンを**同一コンポーネント**で出す(`scope='team'`, `ownerIds=team.memberIds`)。

### 確定コンポーネント名(章⑥ 6-3 と一致)
```
src/components/sales/
  MonthlyAchievementCard.tsx  … 1枚=当該期間(月/四半期/年)の達成率(件数/保険料)・目標/実績・達成/未達バッジ・見込み。クリックで期間フォーカス
  AchievementCardRow.tsx      … 上記を monthly=12/quarterly=4/annual=1 枚、水平スクロールで横並び。当期ハイライト+オートスクロール+対象年ナビ
```
`salesMetrics.calcAchievement(policies, ownerIds, type, period)` を `periodsOfYear` の各 period で反復適用して枚数分を算出(新規算出関数は不要、既存純関数の反復利用)。

### 実装・影響の対応先(重複回避)
- 実装タスクは **章⑦ タスク6(MonthlyAchievementCard/AchievementCardRow)・タスク8(個人ページで主役配置)・タスク10(チームページで scope=team 配置)・タスク13(テスト: 12/4/1枚描画・当月ハイライト)** に統合済み。
- 影響範囲は **章⑧ 8-1(新規ファイル一覧に両コンポーネント記載)・8-2 の項目13/14(描画コスト・未来月ノイズ対策)** に統合済み。
- 外部依存追加なし。レーンは既存 Tailwind(`flex gap-3 overflow-x-auto snap-x`)で実装。
