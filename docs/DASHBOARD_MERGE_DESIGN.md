# ダッシュボード統合・ナビ再編 設計書

**プロジェクト**: nippou-app (305)
**御裁可**: 主上御裁可 (C) 統合案（画面内タブで個人/チーム切替）
**設計者**: 青龍 (architect subagent)
**基準ブランチ**: `staging` (最新 pull 済)
**DB変更**: なし（モック / Zustand store のみ）

---

## ① 変更概要

主上御下命 3 点を実現する:

1. **旧「ダッシュボード」(`/dashboard` = 日報管理画面) を「日報管理」へ改名**
   - ルートを `/report-admin` へ変更（ラベルのみ変更ではなくルートも変更）。
   - 理由: `/dashboard` という URL 最上位概念を、新統合ダッシュボードへ明け渡すため。中身が「日報の提出状況/ヒートマップ/一括確認/週次月次サマリ」であり「日報管理」の実態と URL を一致させる。
   - コンポーネント名 `DashboardPage` → `ReportAdminPage` へ rename（ファイルも `ReportAdminPage.tsx`）。

2. **「営業進捗」(`/sales-dashboard`) と「チーム進捗」(`/team-dashboard`) を 1 つの「ダッシュボード」に統合**
   - 新規ラッパページ `DashboardPage.tsx`（＝新しい `/dashboard`）を作成し、**画面内タブ「個人 / チーム」**で切替。
   - タブ本体は既存の `SalesDashboardPage`（個人）と `TeamDashboardPage`（チーム）を**タブ内コンテンツとして再利用**（中身は温存、ヘッダ h1 のみ調整）。
   - タブ状態は URL クエリ `?tab=personal|team` に反映（リロード耐性）。既存の `?year/?pt/?period/?user/?team` クエリは共存。

3. **統合「ダッシュボード」を NAV_ITEMS の最上位に配置**
   - `roles` は全ロール（`general/manager/executive/admin`）。タブ側で個人/チームの出し分けを行う。

### 統合ページ構成の判断（重要）

**採用案: 新規 `DashboardPage`（ラッパ）を作り、既存 2 ページを「タブ内コンポーネント」として内包する。**

- `SalesDashboardPage` / `TeamDashboardPage` は **default 相当の named export をそのまま温存し、新 `DashboardPage` から `<SalesDashboardPage />` / `<TeamDashboardPage />` として描画**する。
- これにより既存の営業12カードレーン・期間切替・目標設定モーダル・チームランキング・未達アラート等の**内部ロジックを一切改変せずに温存**できる（非破壊が最優先）。
- 両ページは既に `useSearchParams` で URL 駆動のため、タブラッパが `?tab` を、各ページが `?year/pt/period/user/team` を各々読む形で衝突しない。
- 各ページ内の `<h1>🎯 営業進捗</h1>` / `<h1>📈 チーム進捗</h1>` はタブ見出しと二重になるため、ラッパ側にタイトルを持たせ、各ページの h1 はタブ配下の**セクション見出し（残置可）**とする。二重感を避けるなら各ページ h1 を残しつつラッパのページタイトルを「📊 ダッシュボード」に統一。→ **実装方針: ラッパに「📊 ダッシュボード」+ タブ、各ページ h1 は視覚的サブ見出しとして残置**（改変最小・非破壊）。

---

## ② NAV_ITEMS 最終形

| 順 | to | icon | label | roles | 備考 |
|----|----|----|----|----|----|
| 1 | `/dashboard` | `BarChart3` | ダッシュボード | general, manager, executive, admin | **新統合。最上位。タブで個人/チーム出し分け** |
| 2 | `/today` | `Home` | Today | general, manager, executive, admin | 変更なし |
| 3 | `/calendar` | `Calendar` | カレンダー | general, manager, executive, admin | 変更なし |
| 4 | `/search` | `Search` | 検索 | general, manager, executive, admin | 変更なし |
| 5 | `/households` | `Users` | 世帯 | general, manager, executive, admin | 変更なし |
| 6 | `/opportunities` | `Handshake` | 商談 | general, manager, executive, admin | 変更なし |
| 7 | `/policies` | `ScrollText` | 契約 | general, manager, executive, admin | 変更なし |
| 8 | `/report-admin` | `ClipboardList` | 日報管理 | manager, executive | **旧 /dashboard を改名。roles 据置** |
| 9 | `/templates` | `FileText` | テンプレート | admin | 変更なし |
| 10 | `/admin` | `ShieldCheck` | 管理 | admin, executive | 変更なし |
| 11 | `/settings` | `Settings` | 設定 | general, manager, executive, admin | 変更なし |

**削除される NAV 項目**: `/sales-dashboard`（営業進捗）と `/team-dashboard`（チーム進捗）の 2 行は NAV から除去（`/dashboard` タブへ吸収）。ルート自体は後方互換で残置（下記③参照）。

**icon 変更点**:
- 新 `/dashboard` は `BarChart3`（旧 /dashboard が使っていた汎用グラフアイコンを流用、統合の顔として自然）。
- `日報管理` (`/report-admin`) は `ClipboardList`（`lucide-react`）を新規 import。日報チェック業務の意味に合致。旧 `BarChart3` は `/dashboard` へ譲る。
- `Target`（旧 営業進捗）/ `TrendingUp`（旧 チーム進捗）の import は NAV から消えるが、他所で未使用なら import 削除。→ **要 grep 確認（下記⑥）**。

**Today 位置**: 主上御下命は「ダッシュボードを最上位」。Today を 2 番手に降格。既存の manager/executive の初期導線（TodayPage → /dashboard リダイレクト）との整合は③④で調整。

---

## ③ ルート変更マッピング（旧 → 新）と張り替え対象リンク一覧

### ルート定義（`src/App.tsx`）

| 旧ルート | 新ルート | element | 措置 |
|----|----|----|----|
| `/dashboard` → `<DashboardPage/>`(日報管理) | `/report-admin` → `<ReportAdminPage/>` | rename | 日報管理へ退避 |
| （新規） | `/dashboard` → `<DashboardPage/>`(統合ラッパ) | 新規追加 | 統合ダッシュボード |
| `/sales-dashboard` → `<SalesDashboardPage/>` | `/sales-dashboard` （後方互換で残置 or `/dashboard?tab=personal` へリダイレクト） | 残置推奨 | 内部リンク互換 |
| `/team-dashboard` → `<TeamDashboardPage/>` | `/team-dashboard` （後方互換で残置 or `/dashboard?tab=team` へリダイレクト） | 残置推奨 | 内部リンク互換 |

**後方互換の判断**:
- `/sales-dashboard` / `/team-dashboard` は**ルートとして残置**する（`<Route>` は維持）。理由: `UnderTargetAlert` / `MemberRankingTable` が `navigate('/sales-dashboard?user=...')` でドリルダウンしており、これらは「個人の営業進捗を対象者指定で開く」用途。統合後は `/dashboard?tab=personal&user=...` へ張り替えるのが理想だが、**確実な非破壊のため両輪**とする:
  - (a) 内部リンクは `/dashboard?tab=personal&...` へ張り替え（下記）。
  - (b) 旧 `/sales-dashboard` / `/team-dashboard` ルートは `<Navigate>` で `/dashboard?tab=...` へリダイレクト（`?year/pt/period/user` クエリを引き継ぐ小コンポーネント）。ブックマーク/外部リンク保護。

### 張り替え対象リンク一覧（grep 全数確認済）

| # | ファイル:行 | 旧参照 | 新参照 | 種別 |
|----|----|----|----|----|
| 1 | `src/App.tsx:85` | `<Route path="/dashboard" element={<DashboardPage/>}>` (日報管理) | `<Route path="/report-admin" element={<ReportAdminPage/>}>` | ルート改名 |
| 2 | `src/App.tsx:103` | `<Route path="/sales-dashboard" .../>` | 残置 + 併せて `/dashboard` 新規Route追加 | ルート追加 |
| 3 | `src/App.tsx:104` | `<Route path="/team-dashboard" .../>` | 残置（リダイレクトは任意） | — |
| 4 | `src/App.tsx` import | `import { DashboardPage } from './pages/DashboardPage'` | `ReportAdminPage` import + 新 `DashboardPage` import | import 整理 |
| 5 | `src/pages/TodayPage.tsx:46` | `navigate('/dashboard', { replace: true })` | `navigate('/report-admin', { replace: true })` | **要張替（最重要）** |
| 6 | `src/pages/TodayPage.tsx:42` コメント | `// ... 原則 /dashboard へ ...` | `// ... 原則 /report-admin へ ...` | コメント整合 |
| 7 | `src/components/sales/UnderTargetAlert.tsx:57` | `navigate(`/sales-dashboard?user=${u.id}&pt=${periodType}&period=${period}`)` | `navigate(`/dashboard?tab=personal&user=${u.id}&pt=${periodType}&period=${period}`)` | 張替 |
| 8 | `src/components/sales/MemberRankingTable.tsx:86` | `navigate(`/sales-dashboard?user=${row.user.id}&pt=${periodType}&period=${period}`)` | `navigate(`/dashboard?tab=personal&user=${row.user.id}&pt=${periodType}&period=${period}`)` | 張替 |
| 9 | `src/components/layout/AppShell.tsx:18,22,23` | NAV 3 行 | 上記② の最終形へ再編 | NAV再編 |

**TodayPage リダイレクト（#5）は本設計の最重要ポイント**: manager/executive がログイン直後に飛ばされる先。旧「日報管理画面」(`/dashboard`) が意図。改名後は `/report-admin` に張り替えないと、**新統合ダッシュボード（=個人営業タブ）に飛ばされ、上長の初期導線が壊れる**。→ 必ず `/report-admin` へ。

---

## ④ タブ / 権限設計

### タブ表示ロジック（`DashboardPage` ラッパ）

| ロール | 個人タブ | チームタブ | デフォルトタブ | 備考 |
|----|----|----|----|----|
| general | ✅ 表示 | ❌ 非表示 | personal | チームタブは描画しない。`?tab=team` 直打ちでも personal にフォールバック |
| manager | ✅ 表示 | ✅ 表示 | personal | 両タブ。チームは自チームのみ（既存 TeamDashboardPage の visibleTeams 準拠） |
| executive | ✅ 表示 | ✅ 表示 | personal | 両タブ。全チーム閲覧（既存準拠） |
| admin | ✅ 表示 | ✅ 表示 | personal | 個人タブは getScopeUsers で general/manager 対象者選択可（既存 SalesDashboardPage 準拠）。チームは全チーム |

- **タブ出し分けの唯一の基準**: `currentRole === 'general'` かどうか。general のみチームタブを隠す。
- **admin の営業ダッシュ閲覧可否は既存 `getScopeUsers` に準拠**（admin は general/manager を対象者に選べる。改変しない）。
- 各タブの内部権限（general本人固定 / manager対象者切替 / チームは general禁止）は**既存ページのロジックがそのまま担保**する。ラッパは「general にチームタブを見せない」だけを追加で守る。二重防御: general が `?tab=team` を直打ちしても、(a) ラッパがタブを描画しない＆personalへ正規化、(b) 既存 `TeamDashboardPage` 内の `if (currentRole === 'general') return <ForbiddenState/>` が最終防壁として残る。

### URL 状態

- `?tab=personal` / `?tab=team`。未指定・不正値・general の team 指定 → `personal` に正規化。
- ロール切替（AppShell の handleRoleChange）は `/today` へ遷移するため、タブ state はページ離脱でリセットされ問題なし。
- タブ切替時、既存の `?year/pt/period/user/team` は保持（`setSearchParams` で `tab` のみ更新）。個人↔チームで意味の異なる `user`/`team` クエリは各ページが自分の分だけ読むため衝突しない。

### タブ UI

- ラッパ上部に「📊 ダッシュボード」タイトル + セグメント型タブ（既存 UI トーンに合わせ `bg-blue-50 text-blue-700` アクティブ / `text-gray-600` 非アクティブ、`rounded-lg`）。
- モバイル対応: タブは横並びで十分（項目 2 個）。

---

## ⑤ 実装タスク分解（coder 向け・順序付き）

> 前提: `ui-design-standards` 準拠。既存の型・命名・Tailwind トーンに厳密準拠。DB/型変更なし。

1. **旧 DashboardPage を ReportAdminPage へ rename**
   - `git mv src/pages/DashboardPage.tsx src/pages/ReportAdminPage.tsx`
   - コンポーネント名 `DashboardPage` → `ReportAdminPage`（export/関数名）。
   - 内部 h1 の絵文字/文言は「📋 日報管理」へ（現状「📊 ダッシュボード」）。※ 機能・権限ガード（manager/executive/admin）は**一切改変しない**。

2. **新 DashboardPage ラッパを新規作成** (`src/pages/DashboardPage.tsx`)
   - `useSearchParams` で `tab` 読み書き。
   - `currentRole` を store から取得し、general はチームタブ非表示。
   - `?tab` 正規化（不正/未指定/general-team → personal）。
   - タブ UI + `{tab==='personal' ? <SalesDashboardPage/> : <TeamDashboardPage/>}`。
   - タイトル「📊 ダッシュボード」。

3. **SalesDashboardPage / TeamDashboardPage の h1 調整（最小）**
   - ラッパ配下で二重見出しにならぬよう、各 h1 をサブ見出しトーンへ（任意・非破壊。文言/絵文字は据置でも可）。内部ロジックは触らない。

4. **App.tsx ルート改修**
   - import: `DashboardPage`(新ラッパ) + `ReportAdminPage` を追加/差替。
   - `/dashboard` → 新 `<DashboardPage/>`。
   - `/report-admin` → `<ReportAdminPage/>` 追加。
   - `/sales-dashboard` `/team-dashboard` は Route 残置（後方互換）。任意で `<Navigate to="/dashboard?tab=...">` リダイレクト化してもよいが、まずは残置で非破壊優先。

5. **AppShell NAV_ITEMS 再編**（②の表の通り）
   - `/dashboard` を先頭・全ロール・`BarChart3`。
   - `/report-admin` 追加・`ClipboardList`・roles=[manager,executive]。
   - `/sales-dashboard` `/team-dashboard` の 2 行を NAV から削除。
   - lucide import 整理: `ClipboardList` 追加。`Target`/`TrendingUp` は未使用なら削除（要 grep）。

6. **内部リンク張替**
   - `TodayPage.tsx:46` `navigate('/dashboard')` → `navigate('/report-admin')`（+ L42 コメント）。
   - `UnderTargetAlert.tsx:57` → `/dashboard?tab=personal&user=...`。
   - `MemberRankingTable.tsx:86` → `/dashboard?tab=personal&user=...`。

7. **検証**
   - `npm run typecheck`（or `tsc --noEmit`） / `npm run lint` / `npm test`。
   - 手動: 各ロールで NAV 表示・タブ出し分け・リロード（`?tab` 保持）・旧リンク互換・上長ログイン初期導線（→ /report-admin）を確認。

8. **doc_keeper 連携**: 仕様書（`docs/` の画面仕様・ルート表）を同サイクルで更新。

---

## ⑥ 影響範囲・リスク・壊れリンク検査結果

### 壊れリンク全数検査（grep 実施済）

`/dashboard` `/sales-dashboard` `/team-dashboard` の全参照（src 配下、tests/docs 含む）:

- `src/App.tsx:85,103,104` — ルート定義（③で対応）
- `src/pages/TodayPage.tsx:46` — **manager/executive 初期リダイレクト（最重要・要張替 → /report-admin）**
- `src/components/sales/UnderTargetAlert.tsx:57` — ドリルダウン（→ /dashboard?tab=personal）
- `src/components/sales/MemberRankingTable.tsx:86` — ドリルダウン（→ /dashboard?tab=personal）
- `src/components/layout/AppShell.tsx:18,22,23` — NAV（再編）
- **テストファイル (`src/__tests__/*`)・docs 内に `/dashboard`系の直接参照なし**（grep で 0 件確認）→ テスト張替不要。

### リスク

| リスク | 深刻度 | 緩和策 |
|----|----|----|
| TodayPage リダイレクト先の張替漏れ | **高** | 上長がログイン直後に日報管理でなく統合ダッシュボードへ飛ぶ違和感。#5 を必ず `/report-admin` に。 |
| general が `?tab=team` 直打ち | 中 | ラッパで正規化 + 既存 TeamDashboardPage の ForbiddenState 二重防御。 |
| 旧 `/sales-dashboard` ブックマーク切れ | 低 | Route 残置（後方互換）で保護。 |
| 二重見出し（ラッパ + 各ページ h1） | 低 | UI トーンで吸収（サブ見出し化）。機能影響なし。 |
| lucide 未使用 import 残 (`Target`/`TrendingUp`) | 低 | lint 検出。削除。 |
| `?tab` と各ページ既存クエリの衝突 | 低 | キー名が重複しない（`tab` vs `year/pt/period/user/team`）。各々が自分の分のみ read/write。 |

### 非破壊の担保

- 営業12カードレーン・期間切替・目標設定モーダル・チームサマリ・ランキング・未達アラート・ファネル・日報管理（ヒートマップ/一括確認/提出率/週次月次サマリ/契約統計）は**すべて既存コンポーネントをそのまま再利用**し、内部ロジック無改変。
- 権限ガードは各既存ページに温存＋ラッパで general チームタブ非表示を追加するのみ。

---

## 付録: 統合ダッシュボード ラッパ疑似コード（実装ガイド）

```tsx
// src/pages/DashboardPage.tsx (新規ラッパ)
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { SalesDashboardPage } from './SalesDashboardPage';
import { TeamDashboardPage } from './TeamDashboardPage';

type Tab = 'personal' | 'team';

export function DashboardPage() {
  const currentRole = useAppStore(s => s.currentRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const canSeeTeam = currentRole !== 'general';

  const raw = searchParams.get('tab');
  const tab: Tab = (raw === 'team' && canSeeTeam) ? 'team' : 'personal';

  const setTab = (t: Tab) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', t); return n; });

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-bold text-gray-900">📊 ダッシュボード</h1>
      </div>
      {canSeeTeam && (
        <div className="inline-flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('personal')}
            className={`px-3 py-1.5 text-sm rounded-md ${tab==='personal'?'bg-white text-blue-700 font-medium shadow-sm':'text-gray-600'}`}>個人</button>
          <button onClick={() => setTab('team')}
            className={`px-3 py-1.5 text-sm rounded-md ${tab==='team'?'bg-white text-blue-700 font-medium shadow-sm':'text-gray-600'}`}>チーム</button>
        </div>
      )}
      {tab === 'personal' ? <SalesDashboardPage /> : <TeamDashboardPage />}
    </div>
  );
}
```

> 注: 内包する SalesDashboardPage / TeamDashboardPage は各々 `max-w-4xl mx-auto px-4 py-4` を持つため、二重パディングを避けるならラッパ側 wrapper を薄くする（`px-4 py-4` をラッパに寄せ子側を素にする）微調整を coder が UI 確認しつつ実施。非破壊優先で、まずは動作担保→UI 微調整の順。
