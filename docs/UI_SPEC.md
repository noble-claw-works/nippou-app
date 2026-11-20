# UIコンポーネント仕様 — 目次

305-hrl-nippou-app の UI 仕様は以下のドキュメントに分冊されています。

**更新**: 2026-08-25（IA再編・メニュー5項目集約・ダッシュボード全幅化・日報レイアウト統合）

## 分冊一覧

| ファイル | トピック | 説明 |
|---|---|---|
| **UI_SPEC.md** (この目次) | 概要・ナビゲーション・関連資料 | 全体構成、メニュー体系、IA改修方針 |
| **UI_SPEC_pages.md** | ページ構成（全13ページ） | LoginPage・AppShell・SettingsPage・CalendarPage・Households・Customers・Dashboard・Today・ReportDetail・TimelinePanel・SearchPage・AdminPage・UsersTab・TeamsTab 等の詳細仕様 |
| **UI_SPEC_existing-pages.md** | 既存ページ詳細・コンポーネント（CustomerDetailPage他） | CustomerDetailPage のタイムライン刷新、コメント機能の双方向化、DashboardPage の 4 セクション詳細 |
| **UI_SPEC_design-a11y.md** | デザインガイド・アクセシビリティ | デザイントークン（色・スペーシング・タイポグラフィ）、a11y チェックリスト |
| **UI_SPEC_bugfix-phase3.md** | BUG-B 修正・Phase 3・改修履歴 | BUG-B の UI 読み取り専用化、保険契約管理 UI (Phase 3)、2026年改修履歴 |

## 概要

305-hrl-nippou-app の UI は以下の構成に分割されています。

## 関連ドキュメント

- `docs/USER_GUIDE.md`: ロール別ユースケース (general / manager / executive / admin の典型シナリオ・画面×ロール権限マトリクス)
- `docs/SECURITY.md`: 権限制御の二層防御パターン
- `docs/DATA_MODEL.md`: User/Team/Role のデータ構造
- `docs/STATUS_FLOW.md`: 日報ステータス遷移

---

## ナビゲーション構造（IA再編・2026-08-25）

### メニュー9項目→5項目への集約

**旧構成（9項目）**:
- ダッシュボード / 営業実績 / Calendar / Today / 世帯 / 契約 / 商談一覧 / 検索 / 設定

**新構成（5項目）**: `src/components/layout/AppShell.tsx` NAV_ITEMS 定義・2026-08-25

| # | メニュー項目 | 新URL | 旧URL | 主なコンテンツ / タブ | 表示ロール |
|---|---|---|---|---|---|
| ① | **ダッシュボード** | `/dashboard` | `/dashboard` | 営業実績タブ（月次/四半期/年間）/ Personal / Team（manager以上）/ 目標設定 | 全ロール |
| ② | **商談一覧** | `/opportunities` | `/opportunities` | 商談一覧・フィルター / 案件詳細（タスク・活動履歴・提案商品）/ 新規作成 | 全ロール |
| ③ | **顧客一覧** | `/customers` | `/households`; `/policies` | 顧客一覧（検索）/ 世帯別ビュー↔商品別ビュー切替 / 世帯詳細 / 契約詳細 / 世帯まとめ入力 | 全ロール |
| ④ | **日報** | `/nippou` | `/today`; `/calendar`; `/search` | 日報タブ（当日・過去日付）/ カレンダータブ / **日報一覧タブ**（ロール別可視） | 全ロール |
| ⑤ | **設定** | `/settings` | `/settings` | パスワード変更 / アカウント設定 | 全ロール |
| — | **日報管理** | `/report-admin` | `/report-admin` | 提出状況確認 / 一括承認 / 監査 | manager / executive / admin |
| — | **管理** | `/admin` | `/admin` | ユーザー管理 / チーム管理 / 監査ログ / タスク初期値マスタ | admin / executive（読取） |
| — | **テンプレート** | `/templates` | `/templates` | 日報テンプレート管理（CRU） | admin |

### IA改修の詳細（2026-08-25）

**IA-1 営業実績ダッシュボード統合**: 旧「営業実績」単独メニュー → ダッシュボードの「営業実績」タブに統合。SalesPerfPage / SalesDashboardPage を `DashboardWithPerfPage` でラップ。

**IA-2 カレンダー統合**: 旧「Calendar」単独メニュー → 日報ページの「カレンダー」タブ。CalendarPage を `NippouPage` 配下タブとして移設。

**IA-3 世帯・契約統合**: 旧「世帯」「契約」単独メニュー → 「顧客一覧」ページに統合。`CustomerListPage` が HouseholdsTab / PoliciesTab を内包。ビュー切替ボタン（「世帯別」↔「商品別」）で表示形式を切り替え。

**IA-4 検索ヘッダ移動**: 旧「検索」単独メニュー → AppShell ヘッダの検索窓（form + input）に移設。`setHeaderQuery()` で検索キーワードをstore に保存し、各ページ（顧客一覧など）で参照。旧 `/search` URL はリダイレクト。

**IA-5 全幅化**: ダッシュボード（SalesDashboardPage / TeamDashboardPage）の `max-w-4xl` を除去し、画面全幅でレイアウト表示（`DESIGN_GUIDE.md` §5 参照）。

### ナビゲーション権限・表示制御（store + UI 二層）

```tsx
// AppShell.tsx NAV_ITEMS フィルタリング
const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(currentRole));
// 結果: general → ①②③④⑤ のみ / manager → ①②③④⑤+日報管理 / executive → 全て / admin → 全て
```

**旧URLリダイレクト規則**: `src/App.tsx` Route 層で対応
- `/customers` → `/customers` （同じ）
- `/search` → `/customers?mode=search` または ヘッダ検索へガイド
- `/calendar` → `/nippou?tab=calendar`
- `/today` → `/nippou` （デフォルト日報タブ）
- `/sales-perf` → `/dashboard?tab=perf` または `/dashboard` 配下のDashboardWithPerfPage
- `/households` → `/customers?tab=households` または `/customers` デフォルト
- `/policies` → `/customers?tab=policies`

---

## 関連ドキュメント（外部リンク）

- `docs/DATA_MODEL.md`: User/Team/Role/Household/Person/Opportunity/Policy のデータ構造
- `docs/COMPONENT_GUIDE.md`: コンポーネント実装ガイド（ReadOnlyTimeline / PersonEditModal / StageBadge 等）
- `docs/STATUS_FLOW.md`: 日報ステータス遷移フロー
