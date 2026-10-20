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

#### タブ構成（工程H改修後）

| タブキー | ラベル | 内容 | 常時表示 |
|---|---|---|---|
| `overview` | 概要 | 案件基本情報 / 世帯リンク / 対象世帯員 / メモ・タグ | ✓ |
| `products` | 提案商品 | ProposalProduct 一覧 + 追加・編集・削除 (`ProposalProductEditModal`使用) | ✓ |
| `activities` | 活動履歴 | 案件に紐付いた TimeBlock 一覧（日付・時刻・タイプ・メモ） | ✓ |
| `tasks` | ☑️ タスク (N) | 案件に紐付いた Todo 一覧（工程H: 常時タブ表示化） | ✓ |
| `issued_policies` | 📜 保険商品 (N) | 発行済み Policy 一覧（工程H: 常時タブ表示・ラベル改称）| ✓ |

> ⚠️ 工程H以前は `todos` キー・「TODO」ラベルだったが、`tasks` キー・常時タブ表示に変更。`issued_policies` は「契約発行」→「保険商品」に改称し常時表示。

**ステージ変更 (overview タブ)**:
- 「ステージを変更」ボタンで `StageSelector` をインライン展開
- `StageSelector` でステージ選択 → 「ステージを更新」ボタンで `changeOpportunityStage()` 呼び出し
- ~~ステージ変更履歴セクション~~ → 工程H で削除（活動履歴タブと重複のため）

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

---

### 工程G 実装履歴（指示書②③ — 2026-10-14 commit 6a374fe）

- **2026-10-14 6a374fe 指示書②**: PCサイドバー折りたたみ実装。`src/components/layout/Sidebar.tsx`（89行）新規作成、`src/components/layout/AppShell.tsx`（316行）変更。展開(w-56)⇔レール(w-16)トグル。localStorage key `nippou.sidebar.collapsed` で永続化。レール時はナビアイコンに Tooltip 表示。モバイルドロワーは既存流用。
- **2026-10-14 6a374fe 指示書③**: 顧客一覧タブ再編（3タブ→4タブ）＋商談アコーディオン初期折りたたみ。新規: `src/pages/customerListTabs.ts`（29行）・`src/pages/MembersPage.tsx`（185行）・`src/pages/HouseholdDetailPage/PoliciesSection.tsx`（117行）。変更: CustomerListPage / ProductsPage / PoliciesPage / OpportunitiesPage / PersonsPane / PoliciesPane / HouseholdDetailPage / ia-restructure.test.ts。タブ構成: カルテ(旧商品・表示専用) / 世帯(入力集約) / 構成員(新設MembersPage・横断表示専用) / 保険商品(旧契約・表示専用)。保険商品の行編集/削除導線を世帯詳細に移設。後方互換URL: `?tab=products`→カルテ、`?tab=policies`→保険商品。商談一覧アコーディオンを初期折りたたみに変更。DoD: tsc=0, lint=0, test 78files/1312tests 緑, build OK, 全ファイル≤400行。

---

## 工程H UI/UX改修（主上御裁可 2026-10-20 commit beb4e00）

### ① 損保更新5タブ — 即時保存→「編集→保存」ボタン式に統一

**対象タブ**: `RiderTab` / `ConsultTab`（エリアB のみ）/ `PairMtgTab` / `RoadmapTab` / `PolicyCollectTab`

#### 保存方式の変更

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 編集UX | 入力のたびに即時保存 | 「編集」ボタンで編集モード開始 → 「保存」ボタンで確定 |
| 対応履歴への push | `saveRenewalSurvey` 呼び出しのたびに `activityLog` へ push | 保存確定時（`commitRenewalSurvey`）に 1件だけ push（複数項目変更でも集約1件）|

#### store 変更（`src/store/_internal/appstate/renewals.ts`）

- `saveRenewalSurvey(id, patch)`: フォームの一時書き込み用として残存。`activityLog` push は撤廃。
- `commitRenewalSurvey(id, logBody?)`: **新規追加**。保存ボタン押下時にのみ呼び出し、`activityLog` に確定ログを1件 push する。

#### 例外（変更なし）

- **`ConsultTab` エリアA（コンタクト履歴）**: 行追加・削除は引き続き即時保存を維持。

---

### ② HouseholdDetailPage — タスクを中間カラムへ移動、3カラム化

**ファイル**: `src/pages/HouseholdDetailPage.tsx`

#### レイアウト変更

```
【変更前】
  左: 世帯員・商談等メインコンテンツ
  右: 対応履歴（既存）

【変更後（lg以上）】
  左: 世帯員・商談等メインコンテンツ
  中(w-72): タスク（移動）
  右: 対応履歴
```

- `lg` 未満（スマホ・タブレット）では従来通り `lg:hidden` でタスクカラムを非表示。
- 対応履歴は右カラムに引き続き表示。タスクは `w-72` の中間カラムとして `border-l` 区切りで配置。

---

### ③ HouseholdDetailPage/PoliciesSection — ラベル改称

**ファイル**: `src/pages/HouseholdDetailPage/PoliciesSection.tsx`

| 変更前 | 変更後 |
|---|---|
| 📜 契約 有効N件 | 📜 保険商品 有効N件 |

---

### ④ OpportunityDetailPage — タブ常時表示・ラベル改称・OverviewTab整理

**ファイル**: `src/pages/OpportunityDetailPage.tsx`

#### タブ常時表示

- `tasks` タブ（☑️ タスク）と `issued_policies` タブ（📜 保険商品）を世帯詳細と同様に**常時タブバーに表示**。
- 従来は条件付き表示（issued_policies は受注後のみ等）だったが、タブ自体は常時表示しコンテンツで空状態を案内する。

#### ラベル改称

| タブキー | 変更前 | 変更後 |
|---|---|---|
| `issued_policies` | 📜 契約発行 | 📜 保険商品 (N) |

#### IssuedPoliciesTab 表示仕様

- `HouseholdDetailPage/PoliciesSection.tsx` 準拠の表示形式に統一（PolicyStatusBadge + 商品名 + 保険会社 + 月払）。

#### OverviewTab 変更

- **ステージ変更履歴セクション削除**: 活動履歴タブと内容が重複するため、`OverviewTab` 内のステージ変更履歴セクションを削除。

---

### 工程H 実装履歴（2026-10-20 commit beb4e00）

- **2026-10-20 beb4e00**: UI/UX改修（主上御裁可「編集→保存の保存ボタン式にして、かつ履歴に残す」）— ①損保更新5タブ（RiderTab/ConsultTab-エリアB/PairMtgTab/RoadmapTab/PolicyCollectTab）を即時保存→「編集→保存」ボタン式に統一。renewalSlice の `saveRenewalSurvey` から `activityLog` push を撤廃し、新アクション `commitRenewalSurvey`（保存確定時のみ1件 push）を `src/store/_internal/appstate/renewals.ts` に追加。ConsultTabエリアA（コンタクト履歴）の行追加/削除は即時保存を維持。②HouseholdDetailPage タスクを対応履歴の左（w-72中間カラム）に移動・3カラム化（lg未満は lg:hidden で非表示）。③HouseholdDetailPage/PoliciesSection.tsx「📜 契約 有効N件」→「📜 保険商品 有効N件」改称。④OpportunityDetailPage tasks/issued_policies を常時タブ表示・issued_policies ラベルを「保険商品」改称・IssuedPoliciesTab を世帯PoliciesSection準拠表示に統一・OverviewTabのステージ変更履歴セクション削除（活動履歴と重複のため）。

### 工程H 追補（2026-10-20 commit e4664a4）

> **設計ポリシー確立**: 履歴・タスクを伴う詳細ページは一貫して「詳細＋タスク＋履歴」の3列構造（左本文／中タスクaside w-72／右履歴aside w-80）を採用する。社員詳細は独自詳細ビュー無しのため対象外。

- **2026-10-20 e4664a4 ①**: **OpportunityDetailPage 3列化** — 商談詳細ページを「左：本文（可変幅）／中：タスクaside w-72／右：活動履歴aside w-80」の3列構造に変更。`lg:flex lg:gap-4` でラップ、lg未満は縦積み。
- **2026-10-20 e4664a4 ②**: **OpportunityDetailPage タブ統合** — 「概要」と「提案商品」タブを統合し、別タブだった「タスク」「提案商品」タブを廃止。タスクは中央asideへ、提案商品は概要タブ内に組み込み。
- **2026-10-20 e4664a4 ③**: **商談一覧 展開タスク行インデント** — `TaskListPreview.tsx` の展開タスク行に `pl-[148px]` を付与し、保険商品名カラムと縦揃えのインデント表示を実現。
- **2026-10-20 e4664a4 ④**: **HouseholdDetailPage / HouseholdTaskSection 担当者名表示** — 世帯タスクセクションに担当者名を表示（既定値は世帯担当者）。`HouseholdTaskSection.tsx` に `assigneeName` props を追加し、未指定時は世帯の `picName` を fallback 表示。
- **2026-10-20 e4664a4 ⑤**: **HouseholdDetailPage 中央タスク列に商談タスクも表示** — 世帯詳細中央のタスク列（w-72）に世帯タスクだけでなく商談タスクも集約表示。`HouseholdDetailPage.tsx` で各商談の tasks を flatten して `HouseholdTaskSection` に渡す。
- **2026-10-20 e4664a4 ⑥**: **RenewalListPage フィルタ機能追加** — 損保更新一覧にフィルタUIを追加。期間フィルタ（60日以内／期限切れ／全て）＋属性フィルタ（状況／種目／担当者）の組み合わせで絞り込み可能。フィルタ状態は `useState` で管理しクライアントサイドでフィルタリング。
- **2026-10-20 e4664a4 ⑦**: **ConsultTab 重複ブロック削除** — `RenewalDetailPage/ConsultTab.tsx` に存在した「接触記録（時系列）」セクションの重複ブロックを削除。1箇所のみ表示に統一。
- **2026-10-20 e4664a4 ⑧**: **RenewalDetailPage 3列化** — 損保更新詳細ページを「左：本文（可変幅）／中：タスクaside w-72／右：対応履歴列 w-80」の3列構造に変更。「タスク」タブを廃止し中央列へ移動。lg未満は `lg:hidden` で中央・右列を折り畳み。
- **2026-10-20 e4664a4 ⑨**: **PolicyCollectTab 状態選択 ラジオボタン化** — 証券回収タブの状態選択UIを「編集時はラジオボタン選択・非編集時はラベル表示」に変更。既存の「編集→保存」ボタン式フローは維持。`PolicyCollectTab.tsx` の `isEditing` フラグで表示を切り替え。

### 工程H 追補②（2026-10-20 commit 94aed33）

- **2026-10-20 94aed33 ①**: **タスク追加フォーム — 担当者 select 追加** — `TasksTab.tsx`（商談詳細）と `HouseholdTaskSection.tsx`（世帯詳細）のタスク追加フォームおよびインライン編集フォームに担当者選択 `<select>` を追加。`users` props を受け取り `ownerId` を選択可能にした。未選択時は商談/世帯の `ownerId`（`primaryUserId`）を自動セット。
- **2026-10-20 94aed33 ②**: **商談一覧 タスク行 — スペーサー方式インデント整列** — `TaskListPreview.tsx` の展開タスク行インデントを `pl-[148px]` 固定値から **スペーサー div（`w-12 shrink-0` = 48px）＋`px-4` 内側余白** の構成に変更。親テーブルの契約者列幅（`pl-8+px-4 = 48px`）と案件名列の開始位置を正確に揃える。完了件数行・完了トグルボタンも同一スペーサー方式に統一。
- **2026-10-20 94aed33 ③**: **「商品付帯タスク」を TasksTab → ProductsTab（提案商品カード）内へ移動** — `TasksTab.tsx` から `scope=product` タスクの「商品付帯タスク」セクションを削除。`ProductsTab.tsx` 内の各提案商品カードへ移動し、`scope === "product" && productId === pp.id` で絞り込み表示。チェックボックス toggle は `onToggleTask` prop 経由で `toggleOppTaskDone` を呼び出す。優先度バッジ（高/中/低）と期日も表示。
- **2026-10-20 94aed33 ④**: **世帯詳細「商談タスク」 — クリックで商談詳細へ遷移** — `HouseholdDetailPage.tsx` の中央タスク列の商談タスクブロックで、商談見出し（`<div>`）を `<button>` に変更し `navigate(\`/opportunities/${o.id}\`)` を設定。タスク行（`<div>`）にも `onClick` で同じ商談詳細へ遷移するよう変更。スタイルは `text-blue-500 hover:text-blue-700 cursor-pointer`（見出し）/ `hover:bg-gray-50 cursor-pointer`（タスク行）。


### 工程H 追補③（2026-10-20 commit 8186ad7 / UI改修 第2バッチ）

- **2026-10-20 8186ad7 Ⓐ**: **タスク優先度（高/中/低）UI の全画面廃止** — 実運用で刻々変動し無意味・都度変更が手間との顧客フィードバックにより、タスク関連画面の優先度 `<select>` 入力欄と優先度バッジ表示をすべて撤去。対象: `TaskRow.tsx`・`TasksTab.tsx`・`ProductsTab.tsx`・`HouseholdTaskSection.tsx`・`TaskListPreview.tsx`・`RenewalDetailPage/TasksSection.tsx`（`PRIORITY_LABEL`/`PRIORITY_CLASS`/`PRIORITY_COLOR` 定数・`Priority` 型参照を UI から除去）。型 `Task.priority` 自体は後方互換のため存置し、新規作成時は内部的に `"medium"` を既定セット。TodoCard（個人TODO）・admin（タスクテンプレート）・SettingsPage の優先度は別機能のため対象外（存置）。
- **2026-10-20 8186ad7 Ⓑ**: **商談一覧の世帯別表示を廃止しフラット化** — 多くは1世帯=1商談のため世帯グルーピングは無意味との指摘により、`OpportunitiesPage.tsx` を全面書換。世帯別/商品別の表示切替UI・世帯アコーディオンのネスト構造を削除し、`OpportunityTableHeader`+`OpportunityTableRow` を流用した「1商談=1行」のフラットテーブル（商談＋商品表示）に変更。ステージタブ・カテゴリフィルタ・進行中フィルタ・`useOpportunitiesFilter` フックは維持。
- **2026-10-20 8186ad7 Ⓒ**: **コンサル入力 コンタクト履歴を「編集ボタンでモード切替」化** — `RenewalDetailPage/ConsultTab.tsx` エリアA。既定は表示のみ（`ContactReadView`）、「編集」ボタンで編集モード（`ContactEditor`：input/select/行追加・削除）へ切替、「保存」で `onSurveyChange` を呼び表示モードへ復帰、「キャンセル」でドラフト破棄。※「編集不可」ではなく編集ボタンでのモード切替が顧客指示。
- **2026-10-20 8186ad7 Ⓓ**: **FC日 重複注記ブロック削除** — `ConsultTab.tsx` エリアA（コンタクト履歴直下）の「ファーストコンタクト日(自動判定): 〇〇 / 満期まで(FC基点): N日」薄グレー注記枠を削除。ヘッダー表示およびエリアBの FC日入力・FC基点日数表示は存置（重複解消のみ）。


### 工程H 追補④（2026-10-20 commit 587b060 / UI改修 第3バッチ）

- **2026-10-20 587b060 ①**: **商談一覧を テーブル表示 → カード表示に変更** — 顧客フィードバックにより `OpportunitiesPage.tsx` の `<table>` を廃止し `flex flex-col gap-3` のカードリストへ全面置換。新規 `src/pages/opportunities/OpportunityCard.tsx` を作成。各カードに 案件名/商品カテゴリ・ステージバッジ・明細N件・月払(¥N/月)・次アクション(青バナー)・期日(`effectiveExpectedCloseDate`)を表示。顧客要望の3項目を明示表示: **担当者名**(`users.find(u=>u.id===opp.ownerId)?.name`)・**FC日**(`opp.milestones?.firstConsultDate` を案件共通のFC日として採用)・**ステージ**(ステージバッジ)。展開タスクは `TaskListPreview` をカード下部にインライン表示し `e.stopPropagation()` で詳細遷移と分離。ステージタブ(7)・カテゴリ/進行中フィルタ・`/opportunities/:id` 遷移導線は維持。`TaskListPreview.tsx` はテーブル列前提の `pl-*` 固定インデントを削除しカード内インライン対応。※`OpportunityTableRow.tsx`/`OpportunityTableHeader.tsx` は参照ゼロになったが削除は未実施(後続判断)。
- **2026-10-20 587b060 ②**: **提案商品カードの縦長解消（内部2列化）** — `OpportunityDetailPage/ProductsTab.tsx` の各提案商品カード内部を `grid grid-cols-1 md:grid-cols-2 gap-4` で2列化。左列=保険会社名/被保険者/月払/メモ/反映方法(`ReflectionControl`)、右列=商品付帯タスク一覧(`scope==="product" && productId===pp.id`)。md未満は1列縦積みにフォールバック。編集/削除アイコン・合計月払フッタの位置は不変。


### 工程H 追補⑤（2026-10-20 commit batch4 / コンタクト履歴に時刻追加）

- **2026-10-20 ①**: **コンタクト履歴(実入力)に時刻(時間)を追加** — 顧客要望「時間も欲しい」により、`src/types/renewal.ts` の `RenewalContactRecord` に `time?: string`(形式 "HH:mm"、省略可)を追加(オプショナルのため既存データ後方互換)。`RenewalDetailPage/ContactEditor.tsx`(編集モード)の各行に日付 `<input type="date">` の直後へ `<input type="time">`(sm:w-32, aria-label「接触時刻」)を追加、空文字は undefined として保存。`RenewalDetailPage/ConsultTab.tsx` の `ContactReadView`(表示モード)は `c.time` がある場合のみ日付の後に時刻を表示(未設定の既存データは日付のみ)。FC日自動判定 `deriveFirstContactDate` は変更なし(date のみ使用、time は無視)。第2バッチの「編集ボタンでモード切替」方式は維持。
