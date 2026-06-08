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

## TeamEditModal (`src/components/admin/TeamEditModal.tsx`)

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
