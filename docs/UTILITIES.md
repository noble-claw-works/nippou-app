# ユーティリティ関数リファレンス

このドキュメントは `src/utils/` 配下の共有ユーティリティ関数を説明します。
各モジュールの詳細な UI / ストア適用例は `UI_SPEC.md` / `COMPONENT_GUIDE.md` / `DATA_MODEL.md` を参照してください。

---

## orgChart (`src/utils/orgChart.ts`)

**役割**: `User` と `Team` の関係から上長・部下を導出する純粋関数群。
状態を持たず、引数のみから結果を計算する（副作用なし）。

**追加コミット**: `cea9756` (2026-06-06)

### getManagersOf

```typescript
function getManagersOf(userId: string, users: User[], teams: Team[]): User[]
```

**目的**: 指定ユーザーの「上長」一覧を返す。

**ロジック**:
1. `users.find(u => u.id === userId)` でユーザーを取得（未存在なら `[]`）
2. `user.teamIds` に含まれる全チームを走査
3. 各チームの `team.managerIds` を集約（`Set<string>` で重複排除）
4. `userId` 自身を除外
5. `users.filter(u => managerIds.has(u.id))` で `User` オブジェクトに変換して返す

**使用箇所**:
- `src/components/admin/UsersTab.tsx` — ユーザー一覧行の「上長: ○○ (チーム経由)」表示

**例**:

```typescript
// チーム team-1: managerIds=['u2'], memberIds=['u1','u2']
// u1.teamIds = ['team-1']

const managers = getManagersOf('u1', users, teams);
// → [User{id:'u2', name:'田中 部長', ...}]
```

**エッジケース**:
- 対象ユーザーがどのチームにも属していない → `[]`
- 自分自身が managerIds に含まれている場合は除外
- 複数チーム経由で同一ユーザーが上長になる場合も 1 件のみ返す（Set で重複排除）

---

### getSubordinatesOf

```typescript
function getSubordinatesOf(userId: string, users: User[], teams: Team[]): User[]
```

**目的**: 指定ユーザーの「部下」一覧を返す。

**ロジック**:
1. 全チームを走査し `team.managerIds.includes(userId)` のチームを抽出
2. 該当チームの `team.memberIds` を集約（`Set<string>` で重複排除）
3. `userId` 自身を除外
4. `users.filter(u => subordinateIds.has(u.id))` で `User` オブジェクトに変換して返す

**使用箇所**:
- 上長ビューでの権限スコープ制御（閲覧対象日報の絞り込みなど）

**例**:

```typescript
// チーム team-1: managerIds=['u2'], memberIds=['u1','u2','u3']
// チーム team-2: managerIds=['u2'], memberIds=['u2','u4']

const subs = getSubordinatesOf('u2', users, teams);
// → [User{id:'u1'}, User{id:'u3'}, User{id:'u4'}]
// u2 自身は除外、重複なし
```

**エッジケース**:
- 対象ユーザーがどのチームの managerIds にも含まれていない → `[]`
- 自分自身は除外
- 複数チームで同一メンバーが部下になる場合も 1 件のみ返す（Set で重複排除）

---

### テスト

```
src/__tests__/orgChart.test.ts
```

`getManagersOf` / `getSubordinatesOf` の単体テストを含む。

---

## customerAttachment (`src/utils/customerAttachment.ts`)

**役割**: 顧客の付帯情報有無を判定し、削除可否を統合判定する純粋関数群。

**追加コミット**: `8ccb832` (2026-06-04)

### hasCustomerAttachment

```typescript
function hasCustomerAttachment(state: AppState, customerId: string): boolean
```

**目的**: 指定顧客に「付帯情報」があるか判定する。

**付帯情報の定義**:
- `reports[].blocks[].customerId === customerId`
- `reports[].todos[].customerId === customerId`

のいずれかが true であれば「付帯情報あり」。

---

### canDeleteCustomer

```typescript
function canDeleteCustomer(
  state: AppState,
  customerId: string,
  currentRole: Role | undefined,
): boolean
```

**目的**: 指定顧客の削除可否をロールと付帯情報から統合判定する。

**判定テーブル**:

| 顧客の状態 | 削除許可ロール |
|---|---|
| 付帯情報なし | 任意ロール (general / manager / executive / admin) |
| 付帯情報あり | `admin` / `executive` のみ |
| currentRole 未定義 | 常に不可 |

---

## todoReadOnly (`src/utils/todoReadOnly.ts`)

**役割**: Todo の読み取り専用状態を判定する純粋関数群。UI 層と store 層の両方で使用。

**追加コミット**: `db741db` (2026-06-04)

### isTodoReadOnly

```typescript
function isTodoReadOnly(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string, // YYYY-MM-DD。省略時は実行時日付
): boolean
```

**読み取り専用条件（OR 結合）**:

| 条件 | 判定 |
|---|---|
| 提出済み / 承認済み日報由来 | `reportStatus === 'submitted' \|\| 'confirmed'` |
| 期限切れ | `todo.dueDate !== undefined && todo.dueDate < today` |

---

### getTodoReadOnlyReason

```typescript
function getTodoReadOnlyReason(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string,
): string | null
```

**目的**: 読み取り専用の理由を文字列で返す（UI のツールチップ・バッジ表示用）。

| 状態 | 戻り値 |
|---|---|
| 提出済み日報由来 | `'提出済み日報の TODO は変更できません'` |
| 期限切れ | `'期限切れの TODO は変更できません'` |
| 編集可能 | `null` |

---

## calcMiniTimelineSegments (`src/utils/miniTimeline.ts`)

**役割**: 帯形式タイムライン描画用のセグメント計算。SearchPage 一覧カードの視覚化に使用。

詳細は `DATA_MODEL.md` の `MiniTimelineSegment` セクションを参照。

---

## buildTimelineWithGaps / formatGapDuration (`src/utils/timelineGap.ts`)

**役割**: タイムラインのブロック間スキマ時間を可視化するための計算関数。

詳細は `DATA_MODEL.md` の `TimelineGap / TimelineBlockRef / TimelineItem` セクションを参照。

---

## 改修履歴

- **2026-06-06 cea9756**: `src/utils/orgChart.ts` 新規作成 — `getManagersOf` / `getSubordinatesOf` を追加。`src/__tests__/orgChart.test.ts` 追加
- **2026-06-04 db741db**: `src/utils/todoReadOnly.ts` 新規作成 — `isTodoReadOnly` / `getTodoReadOnlyReason` を追加
- **2026-06-04 8ccb832**: `src/utils/customerAttachment.ts` 新規作成 — `hasCustomerAttachment` / `canDeleteCustomer` を追加
