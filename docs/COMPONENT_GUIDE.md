# コンポーネントガイド

このドキュメントは主要コンポーネントのレスポンシブ挙動・Props・テスト仕様を記載する補足リファレンスです。
詳細な UI 仕様は `UI_SPEC.md` を参照してください。

---

## ReadOnlyTimeline (`src/components/report/ReadOnlyTimeline.tsx`)

**役割**: 確認用画面 (`/reports/:date`) のタイムライン読み取り専用表示。Today ページの `TimelinePanel` と同じビジュアル原則を採用。

### Props

```typescript
interface Props {
  blocks: TimeBlock[];
  customers: Customer[];
  /** 表示するブロックのフィルタ条件: 全 / 予定のみ / 実績のみ */
  variant?: 'all' | 'planned' | 'actual';
}
```

### variant 別レイアウト

| variant | レイアウト | 用途 |
|---|---|---|
| `'all'`（デフォルト） | 「◀ 予定 \| 実績 ▶」2 カラム並列 | 確認用画面 `/reports/:date` |
| `'planned'` | 単一カラム（予定ブロックのみ） | 将来用履歴ビュー等 |
| `'actual'` | 単一カラム（実績ブロックのみ） | 将来用履歴ビュー等 |

### レスポンシブブレークポイント (variant='all')

| 画面幅 | ブレークポイント | レイアウト |
|---|---|---|
| **sm 以上** | `≥640px` (`sm:` prefix) | 横並び 2 列: 時刻軸 40px + 予定 1fr + 1px セパレータ + 実績 1fr |
| **sm 未満** | `<640px` | 縦積み: 予定（上）→ 実績（下）の順 |

> **注意**: 以前は md ブレークポイント (768px) を使用していたが、主上ご指摘により sm (640px) に統一（BUG-A 真の修正 commit 94ed85b）。

### 内部コンポーネント

| コンポーネント | 役割 |
|---|---|
| `ReadOnlyTimelineColumn` | 予定 or 実績の単一カラム描画（`kind: 'planned' \| 'actual'`）|
| `SingleColumnTimeline` | `variant='planned'\|'actual'` 時の後方互換単一カラム |
| `TimeGrid` | 時刻グリッド線 + ラベル（1 時間ごと）|
| `BlockBar` | ブロック矩形（型別カラー、メモ表示、顧客名）|
| `GapBar` | スキマ時間表示（amber 破線縦バー）|

### カラーリング

| カラム | テーマカラー | 背景クラス |
|---|---|---|
| 予定 | indigo | `bg-indigo-50/20` |
| 実績 | emerald | `bg-emerald-50/20` |

### e2e テスト用 data-testid

| testid | 対象要素 |
|---|---|
| `timeline-planned-col` | デスクトップ時の予定カラム div |
| `timeline-actual-col` | デスクトップ時の実績カラム div |

e2e テスト: `e2e/buga-layout.spec.ts` で予定/実績横並び確認テストを実施。

### ヘッダー構成

コンポーネント内部に以下を保持（ReportDetailPage 側の外側ラッパーは不要）:
- 「📅 タイムライン」見出し
- 「🎨 凡例」トグルボタン
- 「◀ 予定（計画したこと）」「実績（実際にやったこと）▶」説明バー（sm 以上のみ表示）

### 改修履歴

| commit | 内容 |
|---|---|
| `94ed85b` (2026-06-06) | BUG-A 真の修正 — Today と同じ 2 カラム並列レイアウトに統一。sm ブレークポイント採用、ヘッダーをコンポーネント内部化 |
| `b4ec6c8` (2026-06-06) | BUG-A 中間対応 — md ブレークポイントで 2 列化（主上ご指摘により 94ed85b で再修正）|
| RPT-2 初期実装 | 縦軸ピクセルタイムライン読み取り専用表示として実装 |

---

## ReportDetailPage 右ペイン構成

`/reports/:date?user=:userId` の右ペイン (`lg:col-span-1`) は以下を縦積みで表示する。

### 構成ツリー

```
右ペイン (lg:col-span-1)
├── TODO セクション (✅ TODO)
├── 振り返りセクション (💭 振り返り)
└── コメントセクション (💬 コメント)
```

### 💬 コメントセクション

**表示パターン: 上長 (manager / executive) のコメント**

```
+───────────────────────────────────────────────+
| [KA] 青系アバター | 氏名          | 日時 |
|                 | コメント本文 ...               |
+───────────────────────────────────────────────+
- アバター: bg-blue-100 text-blue-700
- 「↑ 上長宛」バッジ: なし
```

**表示パターン: 部下 (general) の上長宛コメント**

```
+───────────────────────────────────────────────+
| [TA] 緑系アバター | 氏名 [↑ 上長宛] | 日時 |
|                 | コメント本文 ...               |
+───────────────────────────────────────────────+
- アバター: bg-green-100 text-green-700
- 「↑ 上長宛」バッジ: text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5
```

**authorRole フォールバックロジック**:
- `comment.authorRole` が設定されている場合: その値で判定
- `comment.authorRole` が未設定 (下位互換) の場合: `commentUser?.role` を使用
- `resolvedRole === 'general'` の場合に緑系アバター + 「↑ 上長宛」バッジ表示

### 改修履歴

| commit | 内容 |
|---|---|
| `40e081e` (2026-06-06) | 部下→上長への能動コメント機能追加 — コメントセクション名「上長コメント」→「コメント」変更、部下投稿時の緑系アバター + 「↑ 上長宛」バッジ実装 |
| `94ed85b` (2026-06-06) | BUG-A 真の修正 — コメントセクションを右ペイン内の通常カードに移動 |

---

## TimelinePanel (`src/components/today/TimelinePanel.tsx`)

**役割**: Today ページの 2 列タイムライン（予定列・実績列）の描画。編集・ドラッグ&ドロップ対応。

詳細は `UI_SPEC.md` の `TimelinePanel` セクションを参照。

### ReadOnlyTimeline との対称性

`ReadOnlyTimeline (variant='all')` は `TimelinePanel` と同じカラム構成・カラーリングを採用しており、Today ページと確認用画面で一貫した UX を提供する。

| 要素 | TimelinePanel (Today) | ReadOnlyTimeline (確認用) |
|---|---|---|
| ブレークポイント | sm (640px) | sm (640px) |
| 予定カラム色 | indigo | indigo |
| 実績カラム色 | emerald | emerald |
| ヘッダーラベル | 「◀ 予定 \| 実績 ▶」 | 「◀ 予定 \| 実績 ▶」 |
| 時刻軸幅 | 36px | 40px |
| 編集可否 | ✅ 編集可（D&D 対応） | ❌ 読み取り専用 |

---

## AdminPage (`src/pages/AdminPage.tsx`)

**役割**: ユーザー・チーム・監査ログの管理画面。`/admin` ルートで表示。

### コンポーネント構造ツリー

```
AdminPage (src/pages/AdminPage.tsx)
├── UsersTab   (src/components/admin/UsersTab.tsx)      — 👥 ユーザータブ
│   ├── UserEditModal (src/components/admin/UserEditModal.tsx)
│   ├── 招待モーダル (内部 Modal)
│   └── ConfirmDialog (無効化確認)
├── TeamsTab   (src/components/admin/TeamsTab.tsx)      — 🏢 チームタブ
│   ├── TeamEditModal (src/components/admin/TeamEditModal.tsx)
│   ├── チーム作成モーダル (内部 Modal)
│   └── ConfirmDialog (チーム削除確認 — チーム名入力確認付き)
└── AuditLogTab (内部コンポーネント)              — 📜 監査ログタブ
```

**分割方針** (`cea9756` より): 旧 `AdminPage` に直書きされていたユーザー/チーム管理 UI をタブ単位のコンポーネントに分割。`AdminPage` はタブ切り替え・構造制御のみに専念。

**権限制御**: `canEdit = currentRole === 'admin'` を子コンポーネントに `props` として渡す。

---

## UsersTab (`src/components/admin/UsersTab.tsx`)

**役割**: ユーザー一覧・検索・招待・編集・無効化。`AdminPage` の 「👥 ユーザー」タブから渡されるスタンドアロンコンポーネント。

### Props

```typescript
interface Props {
  canEdit: boolean; // true: admin ロール / false: executive 読取専用
}
```

### 主要機能
- 検索バー (`pl-9 border border-gray-300 rounded-lg`) で氏名・メールアドレスフィルタリング
- 各ユーザー行に **上長表示** (`getManagersOf` 経由、`(チーム経由)` サフィックス付き)
- `canEdit=true` 時: 「✎ 編集」ボタン → `UserEditModal` / 「無効化」ボタン → `ConfirmDialog`
- `canEdit=false` 時: 編集・無効化ボタンは非表示
- `useAppStore` から `users, teams, addUser, updateUser, deactivateUser, addToast` を取得

### 改修履歴

| commit | 内容 |
|---|---|
| `cea9756` (2026-06-06) | `AdminPage` から分割。上長表示 (`getManagersOf`) + `UserEditModal` 連携を追加 |

---

## TeamsTab (`src/components/admin/TeamsTab.tsx`)

**役割**: チーム一覧・新規作成・編集・削除。`AdminPage` の 「🏢 チーム」タブから渡されるスタンドアロンコンポーネント。

### Props

```typescript
interface Props {
  canEdit: boolean; // true: admin ロール / false: executive 読取専用
}
```

### 主要機能
- 各チーム行にチーム名・説明・上長名・メンバー数・メンバー名一覧を表示
- `canEdit=true` 時: 「✎ 編集」ボタン → `TeamEditModal` / 「削除」ボタン → `ConfirmDialog` (チーム名入力確認付き)
- `canEdit=false` 時: 編集・削除ボタンは非表示
- `useAppStore` から `teams, users, addTeam, updateTeam, deleteTeam, addToast` を取得

### 改修履歴

| commit | 内容 |
|---|---|
| `cea9756` (2026-06-06) | `AdminPage` から分割。`TeamEditModal` 連携を追加 |

---

## UserEditModal (`src/components/admin/UserEditModal.tsx`)

**役割**: ユーザー情報編集モーダル。`UsersTab` から呼び出される。

### Props

```typescript
interface Props {
  user: User | null;            // null 時はモーダル非表示
  teams: Team[];                // 所属チーム選択用
  onClose: () => void;
  onSave: (userId: string, updates: Partial<User>) => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 備考 |
|---|---|---|
| 氏名 | `<input type="text">` （必須） | 先頭文字が `avatarInitials` に自動反映 |
| メールアドレス | `<input type="email">` （必須） | |
| ロール | `<select>` | general / manager / executive / admin |
| 所属チーム | チェックボックス一覧 (max-h-40 スクロール) | 複数チーム選択可 |

- **初期値**: `useEffect` で `user` 変化時に `form` state を初期化
- **保存ボタン**: 氏名またはメール未入力時は `disabled`
- **`Modal` サイズ**: `size="sm"`

### 改修履歴

| commit | 内容 |
|---|---|
| `d13c0f6` (2026-06-06) | 新規作成 — 氏名・メール・ロール・所属チームの編集 UI を実装 |

---

## CustomerCombobox (`src/components/ui/CustomerCombobox.tsx`)

**役割**: 顧客選択用コンボボックス。検索フィルタ・キーボード操作・表示順序制御・ ARIA 対応を一体化した汎用コンポーネント。

**追加コミット**: `11e82a7` (2026-06-08)

### Props

```typescript
interface CustomerComboboxProps {
  value: string | undefined;          // customerId
  onChange: (customerId: string | undefined) => void;
  customers: Customer[];
  placeholder?: string;               // デフォルト: '顧客を検索...'
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;               // 「選択しない」を許容
  autoFocus?: boolean;
  onAddNew?: () => void;              // 「+ 新規顧客を追加」ボタンのハンドラ。未指定時はボタン非表示
}
```

### 使用例

#### 基本（顧客選択必須）

```tsx
<CustomerCombobox
  value={blockForm.customerId}
  onChange={(id) => setBlockForm(f => ({ ...f, customerId: id }))}
  customers={customers}
  required
/>
```

#### allowClear 仙8き（必須でない場合）

```tsx
<CustomerCombobox
  value={selectedCustomerId}
  onChange={setSelectedCustomerId}
  customers={customers}
  allowClear
  placeholder="顧客を選んでください..."
/>
```

#### 新規顧客追加ボタン付き

```tsx
<CustomerCombobox
  value={selectedCustomerId}
  onChange={setSelectedCustomerId}
  customers={customers}
  onAddNew={() => navigate('/customers/new')}
/>
```

### 表示順序ロジック

| 状態 | 表示順序 |
|---|---|
| query 空 | お気に入り (score +1000) > 最近接触 30 日以内 (score +200〜+500) > active (score +100) > その他 |
| query あり | `searchCustomers()` スコア順（詳細は `docs/UTILITIES.md` 参照）|

### ARIA 仕様

| 属性 | 値 |
|---|---|
| `role="combobox"` | input 要素に付与 |
| `aria-expanded` | ドロップダウン開閉状態 |
| `aria-controls` | listbox 要素の `id`（`useId()` で生成）|
| `aria-activedescendant` | フォーカス中の item `id` |
| `aria-autocomplete` | `"list"` |
| `role="listbox"` | ul 要素に付与 |
| `role="option"` + `aria-selected` | 各 li 要素 |

### 旧 `<select>` ベース実装からの移行ノート

`11e82a7` にて以下 3 箇所の `<select>` を `<CustomerCombobox>` に置換した:

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `src/components/today/BlockModal.tsx` | `<select>` + `option` 列挙 | `<CustomerCombobox value=... onChange=... customers=...>` |
| `src/components/today/ComplimentsCard.tsx` | `<select>` | `<CustomerCombobox>` |
| `src/pages/TodayPage.tsx` | `<select>` | `<CustomerCombobox>` |

旧実装では `customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)` 形式だったが、新実装では `CustomerCombobox` をインポートしてデータと value/onChange を渡すだけでよい。

### 改修履歴

| commit | 内容 |
|---|---|
| `11e82a7` (2026-06-08) | 新規作成 — 検索フィルタ / キーボード / 表示順序 / ARIA 実装。BlockModal / ComplimentsCard / TodayPage の `<select>` 置換完了 |

---

## PersonEditModal (`src/components/household/PersonEditModal.tsx`) — Phase 1

**役割**: 世帯員（Person）の追加・編集モーダル。HouseholdDetailPage から呼び出される。

**追加コミット**: `6db6e91` (2026-06-09)

### Props

```typescript
interface Props {
  householdId: string;       // 所属世帯 ID
  person?: Person | null;    // null または未指定の場合は新規追加モード
  household: Household;      // 世帯主付け替えのため
  onClose: () => void;
  onSaved?: () => void;      // 保存完了コールバック（オプション）
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 氏名 | `<input type="text">` | ✅ | |
| かな | `<input type="text">` | — | |
| 続柄 | `<select>` | ✅ | head / spouse / child / parent / sibling / other |
| 生年月日 | `<input type="date">` | — | YYYY-MM-DD；年齢を自動計算して隣に表示 |
| 性別 | ラジオボタン | — | M / F / other |
| 職業 | `<input type="text">` | — | |
| 喫煙 | `<input type="checkbox">` | — | |
| 健康情報 | `<textarea>` | — | |
| メモ | `<textarea>` | — | |
| 世帯主に設定 | `<input type="checkbox">` | — | 続柄が `head` 以外の場合のみ表示 |

### バリデーション

- 氏名未入力: 保存ボタン `disabled`
- 続柄未選択: 保存ボタン `disabled`

### 世帯主付け替えロジック

「この世帯員を世帯主に設定する」チェックボックスをオンにして保存すると:

1. 対象 Person の `relation` を `'head'` に変更
2. `Household.headPersonId` を対象 Person の id に更新
3. 旧世帯主（元の `relation: 'head'` だった Person）の `relation` を `'other'` に自動降格

### 使用例

```tsx
// 新規追加
<PersonEditModal
  householdId="c1"
  household={household}
  onClose={() => setModal(false)}
  onSaved={() => refetch()}
/>

// 既存 Person 編集
<PersonEditModal
  householdId="c1"
  person={selectedPerson}
  household={household}
  onClose={() => setModal(false)}
/>
```

### 改修履歴

| commit | 内容 |
|---|---|
| `6db6e91` (2026-06-09) | Phase 1 新規作成 — 続柄 / 生年月日 / 性別 / 喫煙 / 健康情報フォーム実装。世帯主付け替え機能追加 |

---

## HouseholdsPage (`src/pages/HouseholdsPage.tsx`) — Phase 1

**役割**: 世帯一覧表示ページ。旧 CustomersPage の保険営業ドメイン対応版。`/households` ルートで表示。

**追加コミット**: `6db6e91` (2026-06-09)

### 概要

- 既存 CUS-1 のソート・フィルタ・件数表示を継承
- 各世帯に「👨‍👩‍👧 N 名」世帯員数バッジを追加表示
- `persons` state から `householdId` でフィルタして人数を算出
- 法人世帯（`type === 'corporate'`）は `familyMemo` フィールドが空でも「法人」バッジで識別

### 改修履歴

| commit | 内容 |
|---|---|
| `6db6e91` (2026-06-09) | Phase 1 新規作成 — 世帯一覧 + 世帯員数バッジ。旧 CustomersPage を継承 |

---

## HouseholdDetailPage (`src/pages/HouseholdDetailPage.tsx`) — Phase 1

**役割**: 世帯詳細表示。基本情報 + 世帯員セクション + 対応履歴。`/households/:customerId` ルートで表示。

**追加コミット**: `6db6e91` (2026-06-09)

### 概要

- 旧 CustomerDetailPage を世帯モデル対応に拡張
- 「👨‍👩‍👧 世帯員」セクションを新設: Person カード一覧 + PersonEditModal 連携
- 対応履歴セクション（`#history`）は旧 CustomerDetailPage と同等

### コンポーネント構造

```
HouseholdDetailPage
├── ヘッダー (世帯名 / タイプバッジ / エリア / 担当者)
├── 世帯基本情報カード (familyMemo / tags / 世帯主 Person 名)
├── 👨‍👩‍👧 世帯員セクション
│   ├── Person カード × N
│   │   └── 「✎ 編集」「✕ 削除」ボタン
│   └── 「＋ 世帯員を追加」ボタン
└── 📅 対応履歴セクション (id="history")
```

### 改修履歴

| commit | 内容 |
|---|---|
| `6db6e91` (2026-06-09) | Phase 1 新規作成 — 世帯員セクション追加。PersonEditModal 連携。世帯主バッジ・喫煙バッジ・続柄バッジカラー実装 |

---

## ## TeamEditModal (`src/components/admin/TeamEditModal.tsx`)

**役割**: チーム情報編集モーダル。`TeamsTab` から呼び出される。

### Props

```typescript
interface Props {
  team: Team | null;            // null 時はモーダル非表示
  users: User[];                // メンバー・上長選択用
  onClose: () => void;
  onSave: (teamId: string, updates: Partial<Team>) => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 備考 |
|---|---|---|
| チーム名 | `<input type="text">` （必須） | |
| 説明 | `<input type="text">` | |
| メンバー | チェックボックス一覧 (max-h-44) | `status ∈ { active, invited }` のユーザーのみ |
| 上長 | チェックボックス一覧 (max-h-36) | **メンバーのみ選択可**。メンバーなし時はプレースホルダーメッセージを表示 |

**連動ルール**:
- メンバーのチェックを外すと、同ユーザーは `managerIds` からも自動除外される
- 上長は必ず `memberIds` に含まれているユーザーのみ選択可能

### 改修履歴

| commit | 内容 |
|---|---|
| `d13c0f6` (2026-06-06) | 新規作成 — チーム名・説明・メンバー・上長指定の編集 UI を実装 |

---

## Phase 2: 商談案件関連コンポーネント (97cabc9 2026-06-09)

---

## StageBadge (`src/components/opportunity/StageBadge.tsx`)

**役割**: 商談案件のステージを色・絵文字付きのバッジとして表示する。

### Props

```typescript
interface Props {
  stage: OpportunityStage;
  size?: 'sm' | 'md' | 'lg';   // デフォルト: 'md'
  showEmoji?: boolean;         // デフォルト: true
}
```

### ステージ別色・絵文字対応表 (STAGE_META)

| ステージ | ラベル | 絵文字 | Tailwind色クラス |
|---|---|---|---|
| `approach` | アプローチ | 🌱 | `bg-gray-100 text-gray-700` |
| `fact_finding` | ヒアリング | 🔍 | `bg-blue-100 text-blue-700` |
| `needs_analysis` | ニーズ分析 | 📊 | `bg-indigo-100 text-indigo-700` |
| `proposal` | 設計書提示 | 📄 | `bg-purple-100 text-purple-700` |
| `negotiation` | 検討中 | 💬 | `bg-yellow-100 text-yellow-700` |
| `application` | 申込書記入 | ✍️ | `bg-orange-100 text-orange-700` |
| `underwriting` | 査定中 | 🏥 | `bg-pink-100 text-pink-700` |
| `issued` | 証券発行 | 🎉 | `bg-green-100 text-green-700` |
| `lost` | 失注 | ❌ | `bg-red-100 text-red-600` |

### サイズ別 CSS

| size | CSS クラス |
|---|---|
| `sm` | `text-xs px-1.5 py-0.5` |
| `md` | `text-sm px-2 py-0.5` |
| `lg` | `text-base px-3 py-1` |

### 使用例

```tsx
// 標準表示
<StageBadge stage="proposal" />

// 小さめ、絵文字なし
<StageBadge stage="issued" size="sm" showEmoji={false} />

// 大きめ
<StageBadge stage="lost" size="lg" />
```

---

## StageSelector (`src/components/opportunity/StageSelector.tsx`)

**役割**: 商談案件のステージを変更するインライン UI。`changeOpportunityStage()` を内部で呼び出す。

### Props

```typescript
interface Props {
  opportunity: Opportunity;  // 変更対象の案件
  onClose?: () => void;      // キャンセル・保存後に呼ばれる
  compact?: boolean;         // true 時はパディング・ボーダーなしのコンパクト表示
}
```

### 主要振る舞い

- 選択ダウンで全 9 ステージを表示（絵文字 + ラベル）
- `stage === 'lost'` 選択時は LostReason セレクトボックス（必須）+ 詳細ブランク（任意）を追加展開
- `stage === 'issued'` または `stage === 'lost'` 時は変更メモ入力欄を非表示（終端ステージはメモ不要）
- 「ステージを更新」ボタン:
  - 変更なし: `disabled` + ラベル「変更なし」
  - 失注遷移: `bg-red-500`
  - 受注遷移: `bg-green-500`
  - その他: `bg-blue-500`

### 使用例

```tsx
// OpportunityDetailPage 内でインライン展開
{editingStage && (
  <StageSelector
    opportunity={opp}
    onClose={() => setEditingStage(false)}
  />
)}

// BlockModal 内でコンパクト表示
<StageSelector
  opportunity={selectedOpportunity}
  compact={true}
  onClose={() => setShowStageSelector(false)}
/>
```

---

## OpportunityCombobox (`src/components/opportunity/OpportunityCombobox.tsx`)

**役割**: 商談案件を検索・選択するコンボボックス。BlockModal 内で使用。

### Props

```typescript
interface Props {
  householdId?: string;         // 指定時はその世帯の案件のみ表示
  value?: string;               // 選択中の Opportunity.id
  onChange: (id: string | undefined) => void;
  onCreateNew?: (householdId: string) => void;  // 新規作成コールバック
  placeholder?: string;
}
```

### 主要振る舞い

- `householdId` が指定された場合、その世帯の商談案件のみを表示
- マウスアウトまたは Escape でドロップダウンを閉じる
- 「新規案件を作成」オプション: `onCreateNew` が指定された場合は `QuickOpportunityModal` へ。
- ステージとカテゴリををサブテキストで表示

### 使用例

```tsx
// BlockModal 内
<OpportunityCombobox
  householdId={state.block.customerId}
  value={state.block.opportunityId}
  onChange={opportunityId => {
    onChange(s => ({ ...s, block: { ...s.block, opportunityId } }));
    setShowStageSelector(false);
  }}
/>
```

---

## QuickOpportunityModal (`src/components/opportunity/QuickOpportunityModal.tsx`)

**役割**: 簡易な商談案件作成モーダル。`OpportunityCombobox` および `OpportunitiesPage` から呼び出される。

### Props

```typescript
interface Props {
  householdId: string;                     // 作成先世帯
  householdName: string;                   // モーダルヘッダーに表示
  onCreated: (opportunityId: string) => void;  // 作成後に呼ばれる
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 |
|---|---|---|
| 案件名 | テキスト入力 | ✅ |
| 初期ステージ | セレクトボックス | — (approach – negotiation の 4 ステージのみ) |
| 検討カテゴリ | チェックボックス (10 種) | — |
| メモ | テキストエリア | — |

### 主要振る舞い

- 案件名必須バリデーション（空文字列で保存不可）
- 保存: `addOpportunity()` を呼び出し、作成された案件の ID を `onCreated` で返す
- `status: 'open'` / `needsAnalysisDone: false` / `illustrationProvided: false` は自動設定

### 使用例

```tsx
// OpportunitiesPage から
<QuickOpportunityModal
  householdId="c1"
  householdName="KOORO GILSON"
  onCreated={(id) => navigate(`/opportunities/${id}`)}
  onClose={() => setShowQuickAdd(false)}
/>
```

---

## ProposalProductEditModal (`src/components/opportunity/ProposalProductEditModal.tsx`)

**役割**: `ProposalProduct`（提案商品）の追加・編集モーダル。`OpportunityDetailPage` の「提案商品」タブから呼び出される。

### Props

```typescript
interface Props {
  product?: ProposalProduct | null;  // null/undefined = 新規追加モード
  persons: Person[];                  // 被保険者選択用世帯員一覧
  onSave: (product: ProposalProduct) => void;
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 商品カテゴリ | セレクトボックス | ✅ | 10 カテゴリ |
| 商品名 | テキスト | ✅ | |
| 保険会社 | テキスト | ✅ | |
| 被保険者 | セレクト（`persons` から） | ✅ | |
| 月払額 | 数値 | ✅ | 円 |
| 保険金額 | 数値 | — | 円 |
| メモ | テキスト | — | |

### 主要振る舞い

- 新規追加時は `uid()` で新規 ID を生成
- 編集時は既存 `product.id` を維持
- 保存後、`totalMonthlyPremium` の再計算は 呼び元 (`OpportunityDetailPage`) で実施

### 使用例

```tsx
// 新規追加
<ProposalProductEditModal
  product={null}
  persons={getPersonsByHousehold(opp.householdId)}
  onSave={(p) => handleSaveProduct(p)}
  onClose={() => setEditProduct(undefined)}
/>

// 編集
<ProposalProductEditModal
  product={existingProduct}
  persons={persons}
  onSave={(p) => handleSaveProduct(p)}
  onClose={() => setEditProduct(undefined)}
/>
```

---

## Phase 3: 保険契約関連コンポーネント (97cf2b1 2026-06-09)

---

## PolicyStatusBadge (`src/components/policy/PolicyStatusBadge.tsx`)

**役割**: 保険契約のステータスを色・絵文字付きのバッジとして表示する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  status: PolicyStatus;
  size?: 'sm' | 'md' | 'lg';  // デフォルト: 'md'
}
```

### ステータス別色・絵文字対応表 (STATUS_META)

| ステータス | ラベル | 絵文字 | Tailwind 色クラス |
|---|---|---|---|
| `inforce` | 有効中 | ✅ | `bg-green-100 text-green-800 border-green-200` |
| `pending` | 申込中 | ⏳ | `bg-yellow-100 text-yellow-800 border-yellow-200` |
| `lapsed` | 失効 | ⚠️ | `bg-orange-100 text-orange-800 border-orange-200` |
| `surrendered` | 解約 | ❌ | `bg-red-100 text-red-700 border-red-200` |
| `matured` | 満期 | 🎉 | `bg-blue-100 text-blue-800 border-blue-200` |
| `paid_up` | 払済 | 💰 | `bg-purple-100 text-purple-800 border-purple-200` |
| `reduced` | 減額 | 📉 | `bg-gray-100 text-gray-700 border-gray-200` |

### サイズ別 CSS

| size | CSS クラス |
|---|---|
| `sm` | `text-[10px] px-1.5 py-0.5` |
| `md` | `text-xs px-2 py-0.5` |
| `lg` | `text-sm px-3 py-1` |

### 使用例

```tsx
// 標準表示
<PolicyStatusBadge status="inforce" />

// 小さめ
<PolicyStatusBadge status="pending" size="sm" />

// 大め
<PolicyStatusBadge status="surrendered" size="lg" />
```

---

## CoverageMatrix (`src/components/policy/CoverageMatrix.tsx`)

**役割**: 世帯内の全世帯員 × 保障種別の 2 次元マトリクスを表示する。保障漏れを赤バッジで警告する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  householdId: string;   // 表示対象世帯の ID
  compact?: boolean;     // true 時は主要 6 種のみ表示（デフォルト: false）
}
```

### 列構成

| モード | 表示列 | 用途 |
|---|---|---|
| `compact=false`（デフォルト） | 全 12 種 | PoliciesPage や大画面表示 |
| `compact=true` | 死亡 / 入院 / がん / 就業不能 / 介護 / 貯蓄（6 種） | HouseholdDetailPage の小画面 |

### 主要振る舞い

- `getCoverageMatrix(householdId)` Store アクションでデータ取得
- 行 = 世帯員（Person）、列 = 保障種別（CoverageType）
- **保障あり**: 保険金額を非円展示（例: `3000万`）
- **保障なし**: `-` を表示（`text-gray-300`）
- **世帯主に死亡保障なし**: テーブル上部に赤警告バナー表示 (`⚠️ 世帯主 「<名前>」 に死亡保障がありません`)
- **世帯員データなし**: 「世帯員データがありません」空状態表示

### 使用例

```tsx
// HouseholdDetailPage 内（コンパクトモード）
<CoverageMatrix householdId={household.id} compact={true} />

// 大画面（フル表示）
<CoverageMatrix householdId={household.id} />
```

---

## PolicyEditModal (`src/components/policy/PolicyEditModal.tsx`)

**役割**: 保険契約の新規追加・編集モーダル。`PoliciesPage` および `PolicyDetailPage` から呼び出される。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  householdId: string;  // 所属世帯 ID
  policy?: Policy;      // 未指定の場合は新規追加モード
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 商品カテゴリ | `<select>` | ✅ | 10 カテゴリ |
| 商品名 | テキスト | ✅ | |
| 保険会社 | テキスト | ✅ | |
| 契約者 | `<select>`（`persons` から） | ✅ | `Person.name` 一覧 |
| 被保険者 | チェックボックス一覧 | ✅ | 複数選択可 |
| ステータス | `<select>` | ✅ | 7 種 |
| 契約日 | `<input type="date">` | ✅ | YYYY-MM-DD |
| 満期日 | `<input type="date">` | — | |
| 月払保険料 | 数値 | ✅ | 円 |
| 払込方法 | `<select>` | ✅ | monthly / semi_annual / annual / lump_sum |
| 証券番号 | テキスト | — | |
| 解約返戻金あり | チェックボックス | — | |
| メモ | `<textarea>` | — | |

### 使用例

```tsx
// 新規追加
<PolicyEditModal
  householdId="c1"
  onClose={() => setShowAdd(false)}
/>

// 編集
<PolicyEditModal
  householdId="c1"
  policy={existingPolicy}
  onClose={() => setShowEdit(false)}
/>
```

---

## CoverageEditModal (`src/components/policy/CoverageEditModal.tsx`)

**役割**: Coverage（保障内容）の追加・編集モーダル。`PolicyDetailPage` の「保障内容」タブから呼び出される。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  policyId: string;          // 所属 Policy.id
  insuredPersonIds: string[]; // 被保険者候補一覧（Policy.insuredPersonIds）
  householdId: string;        // 世帯 ID（persons 取得用）
  coverage?: Coverage;        // 未指定の場合は新規追加モード
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 保障種別 | `<select>` | ✅ | 12 種の `CoverageType` |
| ラベル | テキスト | ✅ | 表示名（例: 「死亡保険金」） |
| 被保険者 | `<select>` | ✅ | `insuredPersonIds` + `householdId` の全世帯員から選択 |
| 主契約/特約 | チェックボックス | — | `isMain` |
| 保険金額 | 数値 | — | 円（`faceAmount`） |
| 沼ぎ払・日額 | 数値 | — | 円/日/回（`unitAmount` + `unit`） |
| 特約名 | テキスト | — | `riderName` |
| 保険期間（年） | 数値 | — | `termYears` |
| メモ | `<textarea>` | — | |

### 使用例

```tsx
// 新規追加
<CoverageEditModal
  policyId={policy.id}
  insuredPersonIds={policy.insuredPersonIds}
  householdId={policy.householdId}
  onClose={() => setShowAddCoverage(false)}
/>

// 編集
<CoverageEditModal
  policyId={policy.id}
  insuredPersonIds={policy.insuredPersonIds}
  householdId={policy.householdId}
  coverage={editingCoverage}
  onClose={() => setEditCoverageId(null)}
/>
```

---

## QuickPolicyIssueModal (`src/components/policy/QuickPolicyIssueModal.tsx`)

**役割**: `issuePoliciesFromOpportunity` を UI から呼び出すための 2 ステップモーダル。「確認」 → 「完了」の UI フローを提供する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  opportunity: Opportunity;                   // 発行元 Opportunity
  onClose: () => void;
  onIssued?: (policyIds: string[]) => void;   // 発行完了コールバック
}
```

### 2 ステップフロー

| ステップ | 内容 |
|---|---|
| `confirm` | `ProposalProducts` 一覧表示 + 「発行する」ボタン |
| `done` | 発行完了時: 発行済み Policy ID 一覧 + 「契約を確認」リンク |

### 主要振る舞い

- `ProposalProducts` がゼロの場合は「提案商品がありません」エラー toast を表示し終了
- `issuePoliciesFromOpportunity(opportunity.id, currentUserId)` を呼び出し、`Policy[]` を取得
- 発行後: Opportunity の `stage` が `issued`、`status` が `won` に自動遷移（store 内部）
- 発行成功: 「○件の契約を発行しました (ステータス: 申込中)」 toast 表示

### 使用例

```tsx
// OpportunityDetailPage 内
{showIssueModal && (
  <QuickPolicyIssueModal
    opportunity={opportunity}
    onClose={() => setShowIssueModal(false)}
    onIssued={(policyIds) => navigate(`/policies/${policyIds[0]}`)}
  />
)}
```
