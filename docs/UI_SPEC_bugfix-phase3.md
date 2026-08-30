## BUG-B [P0] UI層での読み取り専用化（2026-06-04）

**問題**: 提出済み・確認済み日報に関連する TODO が、store 層ではガードされているが UI 層では変更可能に見えていたため、ユーザが「過去データ改ざんが成立した」と錯覚する可能性があった。

**修正方針**: UI 層で完全読み取り専用化を実装。

### SidePanelCards / TodoCard の読み取り専用化

**コンポーネント**: `src/components/today/SidePanelCards.tsx` / `src/components/today/TodoCard.tsx`

**実装**:
- `SidePanelCards` に `isReadOnly` prop を導入（`report.status === 'submitted' || report.status === 'confirmed'`）
- `TodoCard` に `isReadOnly` を伝搬
  - **チェックボックス**: `disabled=true` / `aria-disabled=true` / `cursor-not-allowed` / `opacity-50` / `title="提出済み日報の TODO は変更できません"`
  - **＋追加ボタン**: `isReadOnly` 時は非表示（`hidden` / `display:none`）
  - **削除ボタン（X）**: `isReadOnly` 時は描画自体しない（条件付きレンダリング）
  - **インライン入力フォーム**: `disabled` でクリック無効化、enter キーも無視
  - **バッジ**: TODO ヘッダに「🔒 読み取り専用」バッジを表示（`isReadOnly` 時のみ）

**テスト** (`src/__tests__/todoCardReadOnly.test.tsx` / 12 件追加):
- `status='submitted'`: チェックボックス disabled / aria-disabled / ハンドラ無効 / バッジ表示 / ＋ボタン非表示 / 削除ボタン非描画
- `status='confirmed'`: 同上
- `status='planning'` / `'in_progress'` (対照群): チェックボックス enabled / ハンドラ実行 / バッジ非表示 / ＋ボタン表示 / 削除ボタン描画

### 二重防壁（store 層）

`src/store/index.ts` の `toggleTodo` / `updateTodo` / `deleteTodo` には、既存のガード（commit 5170401）を温存。
UI 層の disable のみでなく、万が一の API 突破アクセスに対しても no-op で対応。

**品質**:
- TypeScript: 0 error
- Vitest: 178/178 通過 (既存 166 + 新規 12)
- Build: 486.27 KB / gzip 135.16 KB
- Staging commit: `ae0ce12`

---

## BUG-B 残存修正 — Today 画面の期限切れ/提出済み由来 TODO 完全読み取り専用化 (db741db — 2026-06-04)

**背景**: commit ae0ce12 (BUG-B [P0]) は ReportDetail 画面および提出済み/承認済み日報由来の TODO 保護を実装したが、Today 画面特有の「期限切れ TODO 」（dueDate が今日未満）が変更可能なまま残っていた。

**修正方針**: `src/utils/todoReadOnly.ts` を新規作成し per-todo 判定ロジックを一元管理。UI 層と store 層の両方で判定を展開する。

### TODO 読み取り専用判定ルール（OR 結合）

| 会定 | 条件 |
|---|---|
| 提出済み/承認済み日報由来 | `report.status === 'submitted' \|\| report.status === 'confirmed'` |
| 期限切れ | `todo.dueDate !== undefined && todo.dueDate < today` (YYYY-MM-DD 文字列比較) |

どちらか一つでも即座に読み取り専用となる。

### `src/utils/todoReadOnly.ts` (新規)

```typescript
export function isTodoReadOnly(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string, // YYYY-MM-DD。省略時は実行時日付
): boolean

export function getTodoReadOnlyReason(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string,
): string | null  // '提出済み日報の TODO は変更できません' | '期限切れの TODO は変更できません' | null
```

### `SidePanelCards.tsx` の変更 (per-todo 層展開)

- `todayStr = new Date().toISOString().split('T')[0]` をコンポーネント内で一度計算し、各 todo の計算に再利用
- 各 TODO 行で `isTodoReadOnly(todo, report.status, todayStr)` を呼び出し `todoReadOnly` フラグを算出
- `isBtnDisabled = isReadOnly || todoReadOnly` でチェックボックス・削除ボタンを無効化
- `handleToggle(todoId, todoReadOnly)` / `handleDelete(todoId, todoReadOnly)` のシグネチャを履年化（引数追加）

### store 層二層防御の残存修正

`toggleTodo` / `updateTodo` / `deleteTodo` 内のガードを `isTodoReadOnly` を使う形に更新：

```typescript
// 変更前 (ae0ce12)
if (!report || report.status === 'submitted' || report.status === 'confirmed') return;

// 変更後 (db741db)
const todo = report.todos.find(t => t.id === todoId);
const todayStr = new Date().toISOString().split('T')[0];
if (!todo || isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)) {
  console.warn('[store] toggleTodo blocked: todo is read-only', ...);
  return;
}
```

`toggleTodo` / `updateTodo` / `deleteTodo` の 3 アクション全てに適用。期限切れ TODO への操作を store 層でも封鎖する。

### テスト
- `src/__tests__/todoReadOnly.test.ts` (+新規 23 テスト): `isTodoReadOnly` / `getTodoReadOnlyReason` の全エッジケース
- `src/__tests__/todoCardReadOnly.test.tsx` (+4 テスト): overdue シナリオ追加

**品質**:
- TypeScript: 0 error
- Vitest: 201/201 通過 (既存 178 + 新規 23)
- Staging commit: `db741db`

---

### AdminPage (`src/pages/AdminPage.tsx`)

**役割**: ユーザー・チーム・監査ログの管理画面。`/admin` ルートで表示。

#### アクセス権限マトリクス

| ロール | 閲覧 | 編集 |
|---|---|---|
| admin | ✅ | ✅ |
| executive | ✅ (読取専用、黄色バナー表示) | ❌ |
| manager | ❌ Forbidden | — |
| general | ❌ Forbidden | — |

- **admin** はすべてのタブで作成・編集・削除・招待が可能
- **executive** はすべてのタブを閲覧のみ可能。ページ上部に黄色バナー「経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。」を表示
- **manager / general** はアクセス不可。`<ForbiddenState />` コンポーネントを表示

#### タブ構成

```
AdminPage
├── 👥 ユーザータブ  (UsersTab)
├── 🏢 チームタブ   (TeamsTab)
└── 📜 監査ログタブ (AuditLogTab)
```

タブ切り替え UI: `bg-gray-100 rounded-xl p-1` の pill 形式ボタンセット。選択中: `bg-white shadow font-medium text-gray-900`

---

#### 👥 ユーザータブ (`src/components/admin/UsersTab.tsx`)

**役割**: ユーザー一覧表示・招待・編集・無効化。

**Props**: `{ canEdit: boolean }`

##### ユーザー一覧行

各ユーザー行に以下の情報を表示:
- **アバター**: `w-8 h-8 rounded-full bg-blue-100 text-blue-700`、`avatarInitials` を表示
- **氏名** + メールアドレス + **ロールバッジ** (`bg-gray-100 text-gray-600 rounded-full`)
- **無効ラベル**: `status === 'inactive'` の場合、赤テキスト「無効」を表示
- **所属チーム**: `user.teamIds` が存在する場合、`text-xs text-gray-400` でチーム名をカンマ区切り表示
- **上長表示**: `上長: ○○○ (チーム経由)` または `上長未設定`
  - `getManagersOf(user.id, users, teams)` を使用して取得
  - 複数の上長がいる場合はカンマ区切りで列挙し、`(チーム経由)` サフィックスを付与

##### 操作ボタン（canEdit 時のみ表示）

- **「✎ 編集」ボタン**: `px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50` → `UserEditModal` を開く
- **「無効化」ボタン**: `status === 'active'` のみ表示 → `text-xs text-red-600 border border-red-200` → ConfirmDialog を経由して `deactivateUser()` を呼び出し

##### ユーザー招待モーダル

- 「＋招待」ボタンから開く (`bg-blue-600 text-white`)
- フィールド: **氏名 (必須)** / **メールアドレス (必須)** / **ロール** (セレクト)
- 確定: `addUser({ ..., status: 'invited' })` → `addToast('招待メールを送信しました')`

---

#### ✎ ユーザー編集モーダル (`src/components/admin/UserEditModal.tsx`)

**Props**: `{ user: User | null, teams: Team[], onClose, onSave }`

**編集可能フィールド**:

| フィールド | 入力形式 | 備考 |
|---|---|---|
| 氏名 | テキスト入力（必須） | 先頭文字が `avatarInitials` に自動反映 |
| メールアドレス | email 入力（必須） | |
| ロール | セレクトボックス | general / manager / executive / admin |
| 所属チーム | チェックボックス一覧 (最大高さ h-40 スクロール) | 複数チーム選択可 |

- **保存ボタン**: 氏名・メール未入力時は `disabled`
- **確定**: `onSave(user.id, updates)` → `updateUser()` + `addToast('ユーザー情報を更新しました')`

---

#### 🏢 チームタブ (`src/components/admin/TeamsTab.tsx`)

**役割**: チーム一覧表示・新規作成・編集・削除。

**Props**: `{ canEdit: boolean }`

##### チーム一覧行

各チーム行に以下の情報を表示:
- **チーム名**: `🏢 {team.name}`（font-medium）
- **説明文**: 存在する場合 `text-xs text-gray-500` で表示
- **上長 + メンバー数サマリー**: `上長: ○○○ · メンバー: N名`
- **メンバー名一覧**: `members.join(', ')` を `text-xs text-gray-400` で表示

##### 操作ボタン（canEdit 時のみ表示）

- **「✎ 編集」ボタン**: `text-blue-600 border border-blue-200` → `TeamEditModal` を開く
- **「削除」ボタン**: `text-red-600 border border-red-200` → ConfirmDialog (チーム名入力確認あり) → `deleteTeam()`

##### チーム新規作成モーダル

- 「＋新規作成」ボタンから開く
- フィールド: **チーム名 (必須)** / **説明**
- 確定: `addTeam({ name, description, managerIds: [], memberIds: [] })` → `addToast('チームを作成しました')`

---

#### ✎ チーム編集モーダル (`src/components/admin/TeamEditModal.tsx`)

**Props**: `{ team: Team | null, users: User[], onClose, onSave }`

**編集可能フィールド**:

| フィールド | 入力形式 | 備考 |
|---|---|---|
| チーム名 | テキスト入力（必須） | |
| 説明 | テキスト入力 | |
| メンバー | チェックボックス一覧 (最大高さ h-44) | `status === 'active' \| 'invited'` のユーザーのみ表示 |
| 上長 | チェックボックス一覧 (最大高さ h-36) | **メンバーから選択**。メンバー未選択時は「先にメンバーを追加してください」を表示 |

**連動ルール**:
- メンバーのチェックを外すと、同ユーザーは上長からも自動的に除外される
- 上長はメンバーに含まれているユーザーのみ選択可能

- **保存ボタン**: チーム名未入力時は `disabled`
- **確定**: `onSave(team.id, { name, description, memberIds, managerIds })` → `updateTeam()` + `addToast('チーム情報を更新しました')`

---

#### 📜 監査ログタブ (AuditLogTab — AdminPage 内部コンポーネント)

- `auditLogs` を `createdAt` 降順でソートして表示
- 各行: ユーザーアバター + 氏名 + アクション + 結果バッジ（成功: `bg-green-100 text-green-700` / 失敗: `bg-red-100 text-red-700`）+ 日時 + IP アドレス

---

### OpportunitiesPage (`src/pages/OpportunitiesPage.tsx`) — Phase 2

**役割**: 商談案件（Opportunity）一覧表示。`/opportunities` ルート。

#### 主要機能

- **案件一覧テーブル**: 装餁 / 案件名 / ステージ / 対象世帯員 / 検討カテゴリ / 合計月払 / 次アクション / 期日
- **フィルター**: ステージ / 担当者 / 進行中のみ表示 (openOnly) / カテゴリ
- **ソート**: ステージ順 / 見込みクローズ日近順 / 合計月払鞏順 / 更新時刻降順（各列ヘッダクリックで昇降切り替え）
- **新規作成**: 「+ 新規案件」ボタン → `QuickOpportunityModal` を開く

#### テーブル列

| 列 | 表示内容 |
|---|---|
| 世帯 | `Household.name` (リンククリックで世帯詳細へ) |
| 案件名 | `Opportunity.title` |
| ステージ | `StageBadge` (絵文字 + ラベル + 色バッジ) |
| 対象世帯員 | `targetPersonIds` から名前リスト (N 名）|
| 検討カテゴリ | `productCategories` ラベル一覧 |
| 合計月払 | `totalMonthlyPremium` 円表示（未設定時は —）|
| 次アクション | `nextAction` テキスト |
| 期日 | `nextActionDate` (YYYY/MM/DD) |

#### ロール別表示制御

| ロール | 表示範囲 |
|---|---|
| `general` | 自分担当 (`ownerId === currentUserId`) のみ |
| `manager` | 全て（デモ简略化）|
| `executive` / `admin` | 全社全て |

---

### OpportunityDetailPage (`src/pages/OpportunityDetailPage.tsx`) — Phase 2

**役割**: 商談案件詳細表示。`/opportunities/:id` ルート。

#### ヘッダー

- 案件名 + StageBadge + ステータスバッジ + 担当者
- 「← 一覧に戻る」リンク
- 「受注」ボタン (`stage: 'issued'`へ変更、ステージが終端でない時に表示)
- 「失注」ボタン (`stage: 'lost'`へ変更、ステージが終端でない時に表示)
- 「削除」ボタン

#### 4 タブ構成

| タブ | こと | 内容 |
|---|---|---|
| `overview` | 概要 | 案件基本情報 / 世帯リンク / 対象世帯員 / ステージ履歴 / メモ・タグ |
| `products` | 提案商品 | ProposalProduct 一覧 + 追加・編集・削除 (`ProposalProductEditModal`使用) |
| `activities` | 活動履歴 | 案件に紐付いた TimeBlock 一覧（日付・時刻・タイプ・メモ） |
| `todos` | TODO | 案件に紐付いた Todo 一覧（日付・テキスト・ステータス） |

**ステージ変更 (overview タブ)**:
- 「ステージを変更」ボタンで `StageSelector` をインライン展開
- `StageSelector` でステージ選択 → 「ステージを更新」ボタンで `changeOpportunityStage()` 呼び出し

---

### BlockModal 次世帯選択 → 商談案件連動 (Phase 2 最重要機能)

**追加フィールド**: `BlockModal` 内に「商談案件 (任意)」ラベルで `OpportunityCombobox` を追加。

**操作フロー**:

```
1. BlockModal で世帯（顧客）を選択
   ↳ 世帯選択後、同世帯の商談案件のみを OpportunityCombobox に表示

2. OpportunityCombobox で案件を選択 (く または新規モーダル)
   ↳ TimeBlock.opportunityId にセット

3. 案件選択時、「→ ステージを変更する（現在: {stage}）」ボタンが表示される
   ↳ クリックで StageSelector がインライン展開

4. StageSelector でステージ選択 → 「ステージを更新」で即時変更
   ↳ changeOpportunityStage() の呼び出し、stageHistory に自動追記

5. ブロック保存で TimeBlock.opportunityId が小報に永続化される
```

**詳細**:
- 顧客選択欄は `CustomerCombobox`、商談案件選択欄は `OpportunityCombobox` を使用
- 世帯を変更すると `opportunityId` は自動リセット
- このフローにより「訪問記録 → ステージ進捗」が 1 ツの UI 操作で完結する（日報内ステージ進捗更新 UX）

---

### HouseholdDetailPage 商談タブ (Phase 2)

**追加タブ**: `HouseholdDetailPage` のタブに **💼 商談 (N 件)** を追加。

**表示内容**:
- `getOpportunitiesByHousehold(householdId)` で当該世帯の全案件を取得
- 案件カード列: 案件名 / StageBadge / 合計月払 / 次アクション / 期日
- 各カードの「詳細 →」ボタンで `/opportunities/:id` へ遷移
- 「+ 新規案件」ボタンで `QuickOpportunityModal` を開く

---

### サイドバー (AppShell) 商談メニュー追加 (Phase 2)

**追加エントリ**: `{ to: '/opportunities', icon: Handshake, label: '商談', roles: ['general','manager','executive','admin'] }`

全ロールで表示される（general は自分担当案件のみ必要なためページ内権限で制御）。

---

## Phase 3: 保険契約管理 UI

### PoliciesPage (`src/pages/PoliciesPage.tsx`) — Phase 3

**役割**: 保険契約（Policy）一覧表示。`/policies` ルートで表示。

**追加コミット**: `97cf2b1` (2026-06-09)

#### ページ構成

```
PoliciesPage
├── ヘッダー（有効中 N 件 / 月払合計 ¥X）+ 「+ 契約追加」ボタン
├── フィルターバー（ステータス / カテゴリ / 担当者 / ウキをテキスト検索）
└── 契約テーブル（ソート対応: 契約日 / 月払额 / 満期日）
```

#### テーブル列一覧

| 列 | 内容 | ソート対応 |
|---|---|---|
| 世帯 | `Household.name` | — |
| 契約者 | `Person.name` (contractorPersonId より解決) | — |
| 商品名 | `Policy.productName` | — |
| 保険会社 | `Policy.insurer` | — |
| カテゴリ | `Policy.productCategory` (ラベル変換) | — |
| ステータス | `PolicyStatusBadge` | — |
| 月払 | `Policy.monthlyPremium` (コンマ区切り) | ✓ |
| 契約日 | `Policy.startDate` (YYYY-MM-DD) | ✓ |
| 満期日 | `Policy.maturityDate` (未設定の場合は —) | — |
| 次回更新 | `Policy.renewalDate` (未設定の場合は —) | — |

#### フィルター

- **ステータスフィルター**: `inforce` / `pending` / `lapsed` / `surrendered` / `matured` / `paid_up` / `reduced` から選択
- **カテゴリフィルター**: 10 種の `ProductCategory` から選択
- **担当者フィルター**: ユーザー一覧から選択
- **テキスト検索**: 商品名 / 保険会社 / 証券番号 / 世帯名で絞り込み

#### ロール別表示

| ロール | 表示内容 |
|---|---|
| `general` | 自分 (`ownerId === currentUserId`) の契約のみ |
| `manager` | 自分 + 同じチームの契約 |
| `executive` / `admin` | 全社契約 |

---

### PolicyDetailPage (`src/pages/PolicyDetailPage.tsx`) — Phase 3

**役割**: 契約詳細表示。`/policies/:id` ルートで表示。

**追加コミット**: `97cf2b1` (2026-06-09)

#### 4 タブ構成

| タブ | 内容 |
|---|---|
| **基本情報** | 保険会社 / 商品名 / カテゴリ / 契約者 Person / 払込方法 / 契約日 / 満期日 / 月払 / 証券番号 / 発行元 Opportunity リンク |
| **保障内容** | `Coverage` 一覧（主契約・特約区分）+ `CoverageEditModal` で追加/編集 |
| **ステータス履歴** | `PolicyStatusHistory` タイムライン（変更日時・操作者・メモ）|
| **関連活動** | 世帯 (`householdId`) に紐付く TimeBlock 一覧 |

#### アクションボタン

- **「払済」ボタン**: `changePolicyStatus(id, 'paid_up')` — `inforce` 時のみ表示
- **「解約」ボタン**: `changePolicyStatus(id, 'surrendered')` — `inforce` 時のみ表示
- **「満期」ボタン**: `changePolicyStatus(id, 'matured')` — `inforce` 時のみ表示
- **「証券番号を入力」** (pending 時): `activatePolicy()` 呼び出しダイアログ
- **編集ボタン**: `PolicyEditModal` を開く（権限: admin or 担当者本人）

#### 発行元 Opportunity リンク

`sourceOpportunityId` が設定されている場合、基本情報タブに **「📋 発行元商談案件」** リンクを表示。クリックで `/opportunities/:sourceOpportunityId` に遷移。

---

### HouseholdDetailPage 契約・保障マトリクス拡張 (Phase 3)

**拡張コミット**: `97cf2b1` (2026-06-09)

#### 追加セクション

```
HouseholdDetailPage
├── ヘッダー (月払統計追加)
│   │  「月払合計: ¥XX,XXX / 年換算: ¥XXX,XXX」
│   └── 有効中 (inforce) 契約の `monthlyPremium` 合計により自動計算
├── 👨‍👩‍👧 世帯員セクション (既存 Phase 1)
├── 📜 契約 (N 件) セクション [新規]
│   ├── 契約カード一覧 (PolicyStatusBadge + 商品名 + 保険会社 + 月払)
│   ├── 各カードの「詳細 →」ボタン → `/policies/:id` に遷移
│   └── 「+ 契約発行」ボタン → `QuickPolicyIssueModal` を開く
└── 🛡️ 保障マトリクスセクション [新規]
    └── `CoverageMatrix` コンポーネント (compact=true モード)
```

#### 月払統計ヘッダー

- **表示条件**: `inforce` 契約が 1 件以上ある場合に表示
- **月払合計**: `policies.filter(p => p.householdId === id && p.status === 'inforce').reduce((s, p) => s + p.monthlyPremium, 0)`
- **年換算**: 月払合計 × 12

---

### OpportunityDetailPage 契約発行拡張 (Phase 3)

**拡張コミット**: `97cf2b1` (2026-06-09)

既存の `OpportunityDetailPage` (フェーズ 2) に以下の拡張を追加。

#### 「🎉 契約発行（受注）」ボタン

- **表示条件**: `opportunity.stage !== 'issued'` かつ `opportunity.status !== 'won'` の場合に表示
- **クリック**: `QuickPolicyIssueModal` を開く
- **スタイル**: `bg-green-600 text-white hover:bg-green-700`

#### 「📜 契約発行」タブ

4 タブ構成に「📜 契約発行」タブを追加。

| タブ内容 |
|---|
| 発行完了時: 発行済み Policy カード一覧 (PolicyStatusBadge + 商品名 + 保険会社 + 月払) |
| 未発行時: `QuickPolicyIssueModal` への導入アニメーション (`ProposalProducts` 一覧を表示し「契約発行」ボタン) |

---

### DashboardPage 契約パネル追加 (Phase 3)

**拡張コミット**: `97cf2b1` (2026-06-09)

**表示ロール**: `executive` / `admin` のみ

#### 追加パネル一覧

| パネル名 | 内容 |
|---|---|
| 契約ステータス分布 | PolicyStatus 別の卑円グラフ（inforce / pending / lapsed / surrendered / matured / paid_up / reduced）|
| 保険会社別契約数 | 保険会社名別の契約件数横棒グラフ |

---

### サイドバー (AppShell) 契約メニュー追加 (Phase 3)

**追加エントリ**: `{ to: '/policies', icon: ScrollText, label: '契約', roles: ['general','manager','executive','admin'] }`

全ロールで表示される（general は自分担当契約のみページ内権限で制御）。

---

## 改修履歴

- **2026-06-09 97cf2b1**: Phase 3 保険契約管理 — `PoliciesPage` (テーブル一覧・フィルター・ロール別表示制御) / `PolicyDetailPage` (4 タブ: 基本情報・保障内容・ステータス履歴・関連活動) 新設。OpportunityDetailPage 拡張— 「🎉 契約発行（受注）」ボタン + 「📜 契約発行」タブ追加。HouseholdDetailPage 拡張— 「📜 契約 (N 件)」セクション + 「🛡️ 保障マトリクス」セクション + 月払統計ヘッダー追加。DashboardPage 拡張— 「契約ステータス分布」「保険会社別契約数」パネル (executive/admin のみ)。AppShell に 📜 契約メニュー追加
- **2026-06-09 97cabc9**: Phase 2 商談案件管理 — `OpportunitiesPage` (テーブル一覧・フィルター・ロール別表示制御) / `OpportunityDetailPage` (4 タブ: 概要・提案商品・活動履歴・ TODO) 新設。BlockModal 拡張 — 世帯→商談案件→StageSelector 展開フロー。HouseholdDetailPage に 💼 商談タブ (N 件) 追加。サイドバーに 🤝 商談メニュー追加。StageBadge ステージ色対応表定義
- **2026-06-09 6db6e91**: Phase 1 世帯モデル基盤 — `HouseholdsPage` 新設（世帯一覧 + 世帯員数バッジ）、`HouseholdDetailPage` 新設（世帯員セクション + PersonEditModal + 世帯主付け替え）、サイドバー「顧客」→「世帯」ラベル変更、`/customers` → `/households` リダイレクト対応
- **2026-06-08 11e82a7**: 顧客選択 UI を `<select>` から `CustomerCombobox` へ移行 (BlockModal / ComplimentsCard / TodayPage) — 検索フィルタ・スコアリング・キーボード操作・ ARIA 対応。表示順序: お気に入り > 最近接触 30 日以内 > active > その他
- **2026-06-08 335394c**: プロジェクト名称を 305-hrl-nippou-app に統一 (index.html / AppShell / LoginPage 等 UI 表記 + docs 冒頭自称表現)
- **2026-06-06 a5eb23c**: E-9 ロール切替永続化 — AppShell ヘッダーロール切替メニューで選択したロールを `nippou.currentRole.v1` / `nippou.currentUserId.v1` に localStorage 保存。リロード後もロール維持。ログイン時は切替記録をクリアしログインユーザー本来のロールを適用
- **2026-06-06 d13c0f6 / cea9756**: ユーザー管理画面拡張 — `UsersTab` / `TeamsTab` / `UserEditModal` / `TeamEditModal` を追加。ユーザー一覧に上長表示 (getManagersOf)。チーム編集にメンバー・上長指定 UI を追加。`executive` ロールの読取専用アクセスと黄色バナーを実装。`AdminPage` をタブ別サブコンポーネントに分割
- **2026-06-06 40e081e**: 部下→上長への能動コメント機能追加 — コメントセクション名を「上長コメント」→「コメント」に変更、部下 (general) が自身日報に上長宛コメントを能動投稿可能に。緑系アバター + 「↑ 上長宛」バッジで視覚区別。authorRole フィールドを ManagerComment に追加
- **2026-06-06 94ed85b**: BUG-A 真の修正 — `ReadOnlyTimeline` (确認用画面) を Today `TimelinePanel` と同一の「◀ 予定 | 実績 ▶」 2 カラム並列レイアウトに統一。sm ブレークポイント（≥640px）で横並び 2 列（時刻軸 40px + 予定 1fr + 1px セパレータ + 実績 1fr）、sm 未満で予定→実績縦積み。`variant='planned'|'actual'` は単一カラムで後方互換維持。ReportDetailPage 外側 `bg-white rounded-xl p-4 + <h2>` ラッパー撤去。`data-testid="timeline-planned-col"` / `"timeline-actual-col"` 追加。e2e `buga-layout.spec.ts` 拡張
- **2026-06-04 db741db**: BUG-B 残存修正 — Today 画面の期限切れ/提出済み由来 TODO を完全読み取り専用化。`src/utils/todoReadOnly.ts` を新規作成し `isTodoReadOnly` / `getTodoReadOnlyReason` を一元管理。SidePanelCards で per-todo 期限切れ判定を追加し UI 層を拡張。store 層 `toggleTodo` / `updateTodo` / `deleteTodo` も期限切れ TODO を二層防御でガード
- **2026-06-04 ae0ce12**: BUG-B [P0] submitted/confirmed 日報の TODO を UI 層で完全読み取り専用化 — チェックボックス disabled / ＋ボタン非表示 / 削除ボタン非描画 / 🔒 読み取り専用バッジ表示。store 層の既存ガードを二重防壁として温存
- **2026-06-03 319e32c**: AUTH-1/AUTH-2/AUTH-3/AUTH-4/AUTH-5 認証機能追加 — ログインガード・セッション失効・パスワード変更
- **2026-06-03 573fe49**: CAL-1/CUS-1 鳳凰殿 P2 改修 — カレンダー視認性・顧客一覧件数表示+ソート
- **2026-06-03 da74db3**: CUS-2 顧客対応履歴一覧刷新 — CustomerDetailPage 履歴セクション 1行=1ブロック表示、CustomersPage 履歴バッジ・履歴ボタン追加
- **2026-06-03 c059b47**: 鳳凰殿 UX ジャーニー改善 6件を反映
  - **NAV-1**: ReportDetailPage に日報前後ナビゲーション追加 (上長ビュー時は未確認循環値も)
  - **MGR-1**: TodayPage で上長ロール自動 redirect を `/dashboard` へ
  - **MGR-2**: Dashboard 未確認カードリンク先を `/search?status=submitted&auto=1` に変更、SearchPage で初期検索自動実行
  - **EMP-1**: TodayPage ヘッダー日付左右に前・翌日ナビボタン追加
  - **EMP-2**: Dashboard ヒートマップセル button 化、hover 状態改善、user param 付与
  - **LIST-1**: SearchPage 検索結果で author.name を先頭強調表示（上長以上のみ）
- **2026-06-04 90a69fe**: E-7 NotFoundPage と catch-all ルートを実装 — 未定義 URL で 404 ページを表示
- **2026-06-04 139386b**: E-8 顧客削除後の過去日報で「不明」表示に統一 — ReadOnlyTimeline / SidePanelCards / SearchPage の顧客名フォールバックを ID 表示から「不明」へ変更
- **2026-06-04 694684f**: 主上ご下命 6 件 (CUS-3/MGR-3/MGR-4/MGR-5/MGR-6/DEAD-1) を反映
  - **CUS-3**: CustomerDetailPage 顧客対応履歴をタイムライン型カードレイアウトに刷新 (垂直軸ドット + 種別欄側 + 2列グリッド訪問結果)
  - **MGR-3**: SearchPage 一覧カードにミニタイムライン追加 (08:00〜20:00 を 100% 正規化した帯形式)
  - **MGR-4**: ReportDetailPage 上長コメントを担当者 (general) も返信可能に (canCommentAsAuthor 手柄)
  - **MGR-5**: Dashboard に「✍ 自分の日報を書く」ボタン追加, TodayPage は `?self=1` で上長迂回不可をバイパス
  - **MGR-6**: executive が manager の日報を確認可能 (撤変了、既存実装で要件充足)
  - **DEAD-1**: NotificationsPage handleClick を導入, SettingsPage の、通知・表示・スナップ select を controlled 化
- **2026-06-06 0450936**: E-8 真の原因修正 — Zustand store 非永続化を根本解決。`src/store/deletedCustomers.ts` 新規作成・`deleteCustomer` 時に `persistDeletedCustomerId` で ID を localStorage に保存。store 初期化時に seed data からフィルタアウト。`resetAll` 時に localStorage クリア。`e2e/e8-deletedCustomer.spec.ts` 3テスト追加 (SPA nav / リロード永続化 / URL 直接アクセス)
- **2026-06-06 e54993b**: P0/P1 本体実装 — CustomersPage.tsx に per-customer 削除権限制御 (canDeleteCustomer + hasCustomerAttachment 適用、disabled + title ツールチップ、編集モーダル危険ゾーンも同様)、LoginPage.tsx に localStorage 永続化・ロックバナー・カウントダウン・ボタン disabled を実装。store/index.ts deleteCustomer に二層防御追加。`e2e/customer-delete-role.spec.ts` 5テスト + `e2e/login-lockout.spec.ts` 4テスト追加
- **2026-06-04 8ccb832**: 保安司 P0 — `src/utils/customerAttachment.ts` (付帯情報判定ユーティリティ) と単体テストを新規作成（UI/Store への組み込みは e54993b で完成）
- **2026-06-04 f2cd145**: 保安司 P1 — ログインロックアウトのユーティリティとテストを新規作成（LoginPage.tsx への組み込みは e54993b で完成）
- **2026-06-03 以前**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
