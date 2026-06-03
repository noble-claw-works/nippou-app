# データモデル仕様

## 概要

nippou-app は LocalStorage ベースの Zustand Store でデータを管理します。
外部 API 通信は一切ありません。

---

## 認証・セッション

### AuthSession

ログイン中のセッション情報。localStorage に暗号化せず JSON で保存。

```typescript
interface AuthSession {
  userId: string;      // ログイン中のユーザー ID
  email: string;       // ユーザーメール
  loginAt: string;     // ログイン日時（ISO 8601）
  expiresAt: string;   // セッション失効日時（ISO 8601）
}
```

**定数**:
- `AUTH_STORAGE_KEY = 'nippou.auth.v1'` — localStorage キー
- `AUTH_SESSION_TTL_MS = 30 * 60 * 1000` — セッション有効期限（30分無操作で失効）
- `DEFAULT_DEMO_PASSWORD = 'demo'` — 全ユーザー共通デモパスワード

**ヘルパー関数**:
- `loadAuthSession(): AuthSession | null` — localStorage から復元（期限切れなら null）
- `persistAuthSession(s: AuthSession | null)` — localStorage に保存 or 削除

**セッション管理フロー**:
1. ログイン → `AuthSession` 生成、localStorage 保存
2. 操作 → 30秒ごとに失効チェック、`expiresAt` に到達なら自動 logout
3. ユーザー操作 (`click`/`keydown`/`mousemove`/`touchstart`) → `touchSession()` で `expiresAt` を +30分延長
4. ログアウト → localStorage 削除、`authSession = null`

---

## コアエンティティ

### AppState: 認証プロパティ

Zustand store の AppState に以下のプロパティを追加:

```typescript
interface AppState {
  // 既存
  currentRole: Role;      // 'general' | 'manager' | 'executive' | 'admin'
  currentUserId: string;  // ログイン中のユーザー ID

  // AUTH-1: 認証セッション・パスワード管理
  authSession: AuthSession | null;      // ログイン中のセッション（null なら未認証）
  passwords: Record<string, string>;    // userId → password マップ（デモ用、全員デフォルト 'demo'）

  // AUTH: Action
  login(email: string, password: string): { ok: true; user: User } | { ok: false; error: string };
  loginAsUser(userId: string): void;    // デモ・ロール切替用
  logout(): void;
  isAuthenticated(): boolean;            // 失効チェック付き
  touchSession(): void;                  // 最終操作を記録、expiresAt を延長
  changePassword(userId: string, current: string, next: string): { ok: true } | { ok: false; error: string };
}
```

**login() の動作**:
- メールアドレスを大文字小文字無視で検索
- status='active' のユーザーのみ対象
- passwords マップから照合、一致なら `loginAsUser()` を呼び出し
- 失敗なら error メッセージを返す

**loginAsUser() の動作**:
- 指定ユーザーの AuthSession を生成・localStorage に保存
- users[userId].lastLogin を現在日時に更新
- currentRole/currentUserId を自動セット

**changePassword() の動作**:
- current パスワード照合
- next が 4文字以上かつ current と異なるかチェック
- 検証成功なら passwords マップを更新

---

### TimeBlock

タイムラインブロック。予定・実績を兼用します。

```typescript
interface TimeBlock {
  id: string;
  reportId: string;
  type: BlockType;         // 'visit' | 'office' | 'phone' | 'travel' | 'break' | 'meeting' | 'lunch'
  startTime: string;       // HH:MM
  endTime: string;         // HH:MM
  customerId?: string;     // 顧客 ID（任意）
  title: string;           // 活動内容
  memo: string;            // メモ
  isPlanned: boolean;      // 予定列に表示
  isActual: boolean;       // 実績列に表示
  attachments: Attachment[];
  plannedBlockId?: string; // 実績化時のリンク元予定ブロック ID

  // 訪問結果フィールド（visit ブロックのみ使用）
  collected?: boolean;        // 集金済み
  nextAppointment?: string;   // 次回アポイント日 (YYYY-MM-DD)
  proposal?: string;          // 提案内容
  result?: string;            // 対応結果メモ
}
```

**isPlanned / isActual の排他性**:

| isPlanned | isActual | 意味 |
|---|---|---|
| true | false | 純粋な予定ブロック |
| false | true | 実績ブロック（手動追加 or 実績化） |
| true | true | 予定兼実績（将来拡張用、現在未使用） |
| false | false | 無効（作成されない） |

---

### DailyReport

1日1ユーザー1件の日報オブジェクト。

```typescript
interface DailyReport {
  id: string;
  userId: string;
  date: string;              // YYYY-MM-DD
  status: ReportStatus;      // 'planning' | 'in_progress' | 'submitted' | 'confirmed'

  // テーマ
  mainTheme: string;         // 中長期テーマ
  monthlyTheme: string;      // 今月のテーマ
  dailyTheme: string;        // 今日のテーマ

  // コンテンツ
  blocks: TimeBlock[];
  todos: Todo[];
  customerVisits: CustomerVisit[];  // 旧フィールド（将来削除予定）
  gratitude: string[];       // 感謝3件 [0..2]

  // 振り返り
  morningMood: MoodType | null;   // 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy'
  eveningMood: MoodType | null;
  managerSignal: ManagerSignal;   // 'consult' | 'listen' | 'ok' | null
  selfComment: string;

  comments: Comment[];
  attachments: Attachment[];

  // 提出管理
  submitted: boolean;         // 日報提出フラグ
  submittedAt?: string;       // 提出日時（ISO 8601）

  // タイムスタンプ（confirm 関連）
  confirmedAt?: string;       // 上長承認日時
  confirmedBy?: string;       // 承認者 userId
  sentBackAt?: string;        // 差し戻し日時
  sentBackReason?: string;    // 差し戻し理由
  createdAt: string;
  updatedAt: string;
}
```

**`submitted` フラグについて**:

- `submitted=true` になるのは `submitReport(reportId)` 実行時
- `status` は `'in_progress' → 'submitted'` へ遷移し、同時に `submitted=true` + `submittedAt` を付与
- `withdrawReport()` で取り下げ時は `status='submitted' → 'in_progress'` + `submitted=false` に戻す
- つまり `submitted` フラグと `status='submitted'` は常に連動する（いずれでも判定可能）

---

### MiniTimelineSegment (派生型・UI専用)

**分類**: LocalStorage に永続化されない、UI 計算専用の派生型。

**用途**: SearchPage 一覧カードに各日報の時間帯を視覚化する帯形式タイムラインを描画するため、実装コード内で `calcMiniTimelineSegments()` により動的生成される。

```typescript
export interface MiniTimelineSegment {
  startTime: string;
  endTime: string;
  leftPct: number;      // 帯内の左端オフセット (%)
  widthPct: number;     // 帯内の幅 (%)
  /** 表示対象外（範囲クリップで width 0 以下）の場合 true */
  hidden: boolean;
}
```

**生成ロジック** (`calcMiniTimelineSegments<T>(blocks, dayStartMin?, dayEndMin?)` 関数):
- 入力: `blocks` 配列（`{ startTime: string, endTime: string }` を満たす任意型）
- 出力: 同長の `MiniTimelineSegment[]`（入力と 1:1 対応、並び順を維持）
- パラメタ:
  - `dayStartMin` (既定 480) — 1 日の開始分（08:00）
  - `dayEndMin` (既定 1200) — 1 日の終了分（20:00）
- 動作:
  1. 各ブロックの startTime / endTime を分単位に変換
  2. dayStartMin ~ dayEndMin の範囲内でクリップ（範囲外は hidden=true）
  3. leftPct, widthPct を計算 (dayEndMin - dayStartMin が分母)

**表示例**:
- ブロック: 12:00–13:00、dayStartMin=480 (08:00)、dayEndMin=1200 (20:00)
- span = 720分
- leftPct = (720 - 480) / 720 × 100 = 33.33%
- widthPct = (780 - 720) / 720 × 100 = 8.33%

---
### TimelineGap, TimelineBlockRef, TimelineItem (派生型・UI専用)

**分類**: LocalStorage に永続化されない、UI 計算専用の派生型。

**用途**: ReportDetailPage タイムラインでブロック間の「スキマ時間」を可視化するため、実装コード内で `buildTimelineWithGaps()` により動的生成される。

```typescript
/** タイムラインのスキマ時間（gap）を表す要素。ブロック並びを走査して生成。 */
export interface TimelineGap {
  kind: 'gap';
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  durationMin: number; // 分単位の継続時間
}

/** ブロックへの参照ラッパー。TimelineItem 型統合用。 */
export interface TimelineBlockRef<T> {
  kind: 'block';
  block: T;           // TimeBlock など
}

/** タイムライン上の要素。ブロック | スキマ時間のユニオン型。 */
export type TimelineItem<T> = TimelineBlockRef<T> | TimelineGap;
```

**生成ロジック** (`buildTimelineWithGaps` 関数):
```typescript
export function buildTimelineWithGaps<T extends { startTime: string; endTime: string }>(
  blocks: T[],
  minGapMin = 5,  // gap として表示する最小分（既定 5 分）
): TimelineItem<T>[] {
  // 1. blocks を startTime 昇順にソート
  // 2. 隣り合うブロック間の endTime → 次の startTime の差を計算
  // 3. 差が minGapMin 以上なら TimelineGap を挿入
  // 4. ブロック・gap が時刻順に混在した配列を返す
}
```

**フォーマット** (`formatGapDuration` 関数):
```typescript
export function formatGapDuration(mins: number): string {
  // 60分未満: "30分"
  // 60分以上: "1時間" or "1時間30分"
}
```

**表示例**:
- 09:00–09:30 (block) → 09:30–10:00 (gap: 30分) → 10:00–11:00 (block)

---

### Customer

顧客マスタ。

```typescript
interface Customer {
  id: string;
  name: string;
  type: CustomerType;        // 'individual' | 'corporate' | 'prospect'
  area: string;
  primaryUserId: string;
  tags: string[];
  memo: string;
  status: CustomerStatus;    // 'active' | 'inactive'
  lastContactDate?: string;
  nextAppointment?: string;
  isFavorite?: boolean;
}
```

---

### Todo

日報に紐づくタスク。ステータス・優先度・期限を管理。

```typescript
interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;           // 後方互換性（status='done' と等価）
  status: 'todo' | 'doing' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;             // YYYY-MM-DD
  rolledOver: boolean;          // 前日から持ち越し
}
```

**ステータス機能** (P1-2 3段巡回実装):
- `todo`: タスク未開始（☐）
- `doing`: 進行中（◐）
- `done`: 完了（☑️）
- UI 上では、ステータスアイコンをクリックで **`todo → doing → done → todo` と巡回**（3段階循環）
- 同期: `completed = (status === 'done')` を常に維持

**優先度表示**:
- `high`（🔥 赤）
- `medium`（⭐ 黄）
- `low`（💧 青）

**期限管理**:
- `dueDate` が設定される場合、UI に `〜MM/DD` 形式で表示
- 期限超過時は赤文字で警告

---

### ManagerComment

上長からのコメント・フィードバック。

```typescript
interface ManagerCommentReply {
  userId: string;           // 返答者 ID
  choice: 'yes' | 'no';     // 'yes'（了承）| 'no'（要相談）
  repliedAt: string;        // 返答日時（ISO 8601）
}

interface ManagerComment {
  id: string;
  dayKey: string;           // YYYY-MM-DD（日報を特定）
  authorUserId: string;     // 上長 ID
  body: string;             // コメント本文
  createdAt: string;        // ISO 8601
  replies: ManagerCommentReply[];  // 部下からの返答群
}
```

**機能フロー**:
1. 上長が `dayKey` 指定の日報に対し、`addManagerComment(dayKey, userId, body)` でコメント追加
2. 部下は `replyToManagerComment(commentId, userId, choice)` で ✅YES / ❌NO 返答
3. 返答後は返答者ステータス + 日時が表示され、ボタンは非活性化

---

### Compliment

顧客からのお褒め・要望の言葉を記録。

```typescript
interface Compliment {
  id: string;
  dayKey: string;           // YYYY-MM-DD
  customerId?: string;      // 顧客 ID（任意、関連付けない場合は未設定）
  customerName?: string;    // 顧客名（自由記述、プルダウンまたは手入力）
  type: 'praise' | 'request'; // 'praise'（お褒め）| 'request'（要望）
  body: string;             // 本文
  createdAt: string;        // ISO 8601
}
```

**ユースケース**:
- 訪問や電話対応で受けたお褒めの言葉を記録
- 顧客からの改善要望・リクエストを記録
- 日報提出後に記録・編集可能（提出後は読取専用）

---

## ステータス遷移

### 遷移図

```
planning ──[予定を確定する]──→ in_progress ──[提出する]──→ submitted
                                    ↑                        ↓
                                    └──[取り下げ / 差し戻し]──┘
                                                              ↓ 上長承認
                                                          confirmed
```

### 入力制限

| 操作 | planning | in_progress | submitted | confirmed |
|---|---|---|---|---|
| 予定ブロック 追加/編集/削除 | ✅ | ✅ | ❌ | ❌ |
| 実績ブロック 追加/編集/削除 | ❌ | ✅ | ❌ | ❌ |
| テーマ/感謝/振り返り編集 | ✅ | ✅ | ❌ | ❌ |
| 実績化ボタン | ❌ | ✅ | ❌ | ❌ |
| 上長コメント表示 | ❌ | ❌ | ✅ | ✅ |
| 上長コメント返答 | ❌ | ❌ | ✅ | ✅ |
| お褒め記録（追加・削除）| ✅ | ✅ | ❌ | ❌ |
| 取り下げ | — | — | ✅（未承認時のみ） | ❌ |

### Store アクション

| アクション | 遷移 | 条件 |
|---|---|---|
| `confirmPlanning(reportId)` | `planning → in_progress` | `planning` 時のみ有効 |
| `submitReport(reportId)` | `in_progress → submitted` + `submitted=true` | `in_progress` 時のみ有効 |
| `withdrawReport(reportId)` | `submitted → in_progress` + `submitted=false` | `submitted` 時のみ有効（本人取り下げ・上長差し戻し共通） |
| `confirmReport(reportId)` | `submitted → confirmed` | `submitted` 時のみ有効（上長操作） |

---

## Store Actions（主要）

### TimeBlock 操作

| アクション | 説明 |
|---|---|
| `addBlock(reportId, block)` | ブロック追加（id は自動採番） |
| `updateBlock(reportId, blockId, updates)` | 部分更新（訪問結果フィールドも含む） |
| `deleteBlock(reportId, blockId)` | ブロック削除 |

### 訪問結果の保存方法

```typescript
// BlockModal から保存する際は updateBlock に差分のみ渡す
updateBlock(report.id, block.id, {
  collected: true,
  nextAppointment: '2025-07-15',
  proposal: '保険商品Aの提案',
  result: 'ポジティブな反応。資料送付を約束',
});
```

### Todo 操作

| アクション | 説明 |
|---|---|
| `addTodo(reportId, text, priority?)` | TODO 追加（デフォルト priority='medium'） |
| `updateTodo(reportId, todoId, updates)` | 部分更新（status/priority/dueDate など） |
| `toggleTodo(reportId, todoId)` | completed フラグ反転（status も自動更新） |
| `deleteTodo(reportId, todoId)` | 削除 |

### 日報提出管理

| アクション | 説明 |
|---|---|
| `submitReport(reportId)` | 提出 (status: in_progress → submitted) |
| `withdrawReport(reportId)` | 取り下げ (status: submitted → in_progress) |
| `confirmReport(reportId)` | 確認 (status: submitted → confirmed) |
| `bulkConfirmReports(reportIds[])` | 一括確認（submittedReports のみ対象、成功件数を返し） |

### 顧客操作

| アクション | 説明 |
|---|---|
| `addCustomer(customer)` | 顧客追加 |
| `updateCustomer(customerId, updates)` | 顧客更新 |
| `deleteCustomer(customerId)` | 顧客完全削除 (CUS-3: 管理者/控糠者のみ実行可) |
| `deactivateCustomer(customerId)` | 顧客無効化 (status: active → inactive) |

### ManagerComment 操作

| アクション | 説明 |
|---|---|
| `addManagerComment(dayKey, authorUserId, body)` | コメント追加 |
| `replyToManagerComment(commentId, userId, choice)` | コメントへの返答（yes/no） |
| `deleteManagerComment(commentId)` | コメント削除（上長のみ） |

### Compliment 操作

| アクション | 説明 |
|---|---|
| `addCompliment(dayKey, customerId?, customerName?, type, body)` | お褒め・要望記録 |
| `deleteCompliment(complimentId)` | 削除 |

---

## データフロー

```
ユーザー操作
  └→ TodayPage (handler + ステータスガード)
       └→ useAppStore (Zustand action)
            └→ set() で reports 配列を immutable 更新
                 └→ useAppStore セレクターで直接購読（ポーリング廃止済み）
```

---

## ストレージ

- **LocalStorage**: Zustand の persist middleware は未使用（現在はメモリのみ）
- **外部 API**: なし
- **セキュリティ**: ユーザー入力は React JSX 経由。`dangerouslySetInnerHTML` 不使用

---

## 訪問結果の活用フロー

```
1. タイムラインで visit ブロックを作成（または実績化）
2. BlockModal で訪問結果フィールドを入力
   - 集金済みチェック
   - 次回 AP 日付
   - 提案内容
   - 対応結果メモ
3. 保存 → TimeBlock.collected / nextAppointment / proposal / result に格納
4. タイムライン上でバッジ表示（✓集金済 / AP:MM-DD）
5. サイドパネル「顧客対応サマリー」で一覧表示
```

---

## 旧 CustomerVisit テーブルとの関係

`DailyReport.customerVisits` は旧設計の名残です。
現在は `TimeBlock` 上の訪問結果フィールドで代替されています。
将来的に `customerVisits` は削除予定です。

---

## 改修履歴

- **2026-06-03 319e32c**: AUTH-1/AUTH-2/AUTH-3/AUTH-4/AUTH-5 認証機能追加 — ログインガード・セッション失効・パスワード変更
- **2026-06-03 573fe49**: CAL-1/CUS-1 鳳凰殿 P2 改修 — カレンダー視認性・顧客一覧件数表示+ソート
- **2026-06-03**: ManagerComment/Compliment 型追加、Todo 拡張（status/priority/dueDate）、DailyReport に submitted フラグと mainTheme を追加、上長コメント・お褒め記録機能に対応
- **2026-06-03 b623958**: 提出ヘッダー追加 / YES/NO 返答UI改善 / TODO 3段巡回実装 / 備考常時表示（memo truthy のみ）
