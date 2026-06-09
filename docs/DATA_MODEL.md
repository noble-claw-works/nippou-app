# データモデル仕様

## 概要

305-hrl-nippou-app は LocalStorage ベースの Zustand Store でデータを管理します。
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

## 保険営業ドメイン Phase 1: 世帯モデル基盤

**コミット**: `6db6e91 feat(household): Phase 1 — 世帯モデル基盤 (Household + Person 2 階層) 導入`

保険営業における「世帯」単位での顧客管理を実現するため、`Customer` を `Household` に発展させ、世帯員を表す `Person` 型を新設した。

### Household 型（旧 Customer の発展形）

`Customer` 型は `Household` の互換エイリアスとして残存しており、既存コードを壊さない。ただし将来的に `Customer` 型は deprecated となる予定。

```typescript
interface Household {
  id: string;
  name: string;              // 例: 「田中家」「ABC商事」
  type: HouseholdType;       // 'individual' | 'corporate' | 'prospect'
  area: string;
  primaryUserId: string;     // 担当者 ID
  headPersonId?: string;     // 世帯主 Person.id (個人世帯のみ意味あり)
  address?: string;
  familyMemo: string;        // 家族構成メモ
  tags: string[];
  memo: string;
  status: HouseholdStatus;   // 'active' | 'inactive'
  lastContactDate?: string;  // YYYY-MM-DD
  nextAppointment?: string;  // YYYY-MM-DD
  isFavorite?: boolean;
}

// 互換エイリアス — 既存コードを壊さない (deprecated 予告)
export type Customer = Household;
```

**既存コードとの互換性**: `CustomerType` / `CustomerStatus` 型は `HouseholdType` / `HouseholdStatus` の型エイリアスとして維持される。

---

### Person 型（世帯員）

```typescript
export type PersonRelation = 'head' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
export type PersonGender = 'M' | 'F' | 'other';

interface Person {
  id: string;
  householdId: string;       // 所属世帯 (Household.id)
  name: string;              // 氏名
  kana?: string;             // 氏名かな
  relation: PersonRelation;  // 続柄
  birthDate?: string;        // YYYY-MM-DD
  gender?: PersonGender;     // 'M' | 'F' | 'other'
  occupation?: string;       // 職業
  smoker?: boolean;          // 喫煙有無
  healthNotes?: string;      // 健康上の備考
  memo: string;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}
```

**PersonRelation の選択肢**:

| 値 | 意味 |
|---|---|
| `head` | 世帯主 |
| `spouse` | 配偶者 |
| `child` | 子 |
| `parent` | 親 |
| `sibling` | 兄弟姉妹 |
| `other` | その他 (法人担当者など) |

---

### Household と Person のリレーション

```
Household (1)
  id: "c1"
  headPersonId: "p_c1_head"  ← 世帯主への参照
      │
      ▼
Person (N)
  { id: "p_c1_head",   householdId: "c1", relation: "head"   }
  { id: "p_c1_spouse", householdId: "c1", relation: "spouse" }
  { id: "p_c1_child1", householdId: "c1", relation: "child"  }
  { id: "p_c1_child2", householdId: "c1", relation: "child"  }
```

**世帯主削除時の自動繰り上げ**: `deletePerson(personId)` で `relation === 'head'` の Person を削除する際、同世帯に他の Person がいれば先頭の Person が自動的に世帯主 (`relation: 'head'`) に繰り上げられる。

---

### LocalStorage 永続化

`persons` 配列は store の初期状態として `PERSONS` seed データから生成される。現時点では `nippou.persons.v1` のような専用キーは持たないが、他のエンティティと同様に将来的な永続化対象となる予定。

---

### Store Actions: Person 操作

| アクション | 説明 |
|---|---|
| `addPerson(householdId, partial)` | 世帯員追加（id / householdId / createdAt / updatedAt は自動付与） |
| `updatePerson(personId, patch)` | 世帯員更新（updatedAt を自動更新） |
| `deletePerson(personId)` | 世帯員削除。世帯主削除時は自動繰り上げ。`{ ok: boolean; error?: string }` を返す |
| `getPersonsByHousehold(householdId)` | 世帯 ID で世帯員一覧を取得 |

---

### Seed データ: PERSONS

c1〜c10 の世帯主および家族 18 件がデフォルト seed として登録される。

| 世帯 | 世帯主 | 家族構成 |
|---|---|---|
| c1 KOORO GILSON | p_c1_head | 世帯主 + 配偶者 + 子 2 名 |
| c2 齋藤 和久 | p_c2_head | 世帯主 + 配偶者 + 子 1 名 |
| c3 暁和化学ゴム (法人) | p_c3_head | 担当者 (relation: other) |
| c4 水野 幸重 | p_c4_head | 世帯主のみ |
| c5 山田工業 (法人) | p_c5_head | 担当者 (relation: other) |
| c6 鈴木 花代 | p_c6_head | 世帯主 + 子 3 名 |
| c7 テクノ精工 (法人) | p_c7_head | 担当者 (relation: other) |
| c8 高橋 誠 | p_c8_head | 世帯主のみ |
| c9 大鉄工業 (法人, inactive) | p_c9_head | 担当者 (relation: other) |
| c10 伊藤 幸子 | p_c10_head | 世帯主のみ |

**法人世帯の扱い**: `type === 'corporate'` の世帯は Person の `relation` に `'other'` を使い、担当者（代表取締役など）を登録する。法人世帯は `Household` として引き続き存続する。

---

## 保険営業ドメイン Phase 2: 商談案件管理

**コミット**: `97cabc9 feat(opportunity): Phase 2 — 商談案件 (Opportunity) 管理 + 日報内ステージ進捗更新 UX`

保険営業の「商談案件」（Opportunity）を Household 単位で管理し、アプローチから証券発行まで 9 ステージのパイプラインを提供する。Today ページのタイムブロックと連動させ、訪問記録を起点にステージを即時更新できる UX を実現した。

### Opportunity 型

```typescript
interface Opportunity {
  id: string;
  householdId: string;              // 対象世帯（Household.id）— 必須
  ownerId: string;                  // 担当者 userId
  title: string;                    // 案件名（例: 「田中家 生命保険 見直し」）
  targetPersonIds: string[];        // 提案対象世帯員 (Person.id[])
  stage: OpportunityStage;          // 9 ステージ（下記参照）
  status: OpportunityStatus;        // 'open' | 'won' | 'partial_won' | 'lost' | 'on_hold'
  productCategories: ProductCategory[];  // 10 カテゴリ
  proposalProducts: ProposalProduct[];   // 提案商品一覧
  totalMonthlyPremium?: number;     // 合計月払額（proposalProducts から自動計算）
  expectedCloseDate?: string;       // 見込みクローズ日 (YYYY-MM-DD)
  actualCloseDate?: string;         // 実際のクローズ日（won/lost 時に自動セット）
  lostReason?: LostReason;          // 失注理由（stage: 'lost' 時に使用）
  lostReasonDetail?: string;        // 失注理由の詳細メモ
  nextAction?: string;              // 次のアクション
  nextActionDate?: string;          // 次アクション期日 (YYYY-MM-DD)
  needsAnalysisDone: boolean;       // ニーズ分析完了フラグ
  illustrationProvided: boolean;    // 設計書提示フラグ
  stageHistory: OpportunityStageHistory[];  // ステージ変更履歴（自動追記）
  tags: string[];                   // タグ
  memo: string;                     // メモ
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
}
```

**Household との関係**: Opportunity は必ず `householdId` で Household に紐付く。Household が削除された場合、関連する Opportunity は孤立する（現フェーズでは世帯削除時に Opportunity の整合性保証はしない）。

---

### OpportunityStage — 9 ステージ

| 値 | ラベル | 絵文字 | 色 | 説明 |
|---|---|---|---|---|
| `approach` | アプローチ | 🌱 | gray | 関係構築・初接触 |
| `fact_finding` | ヒアリング | 🔍 | blue | 家族構成・既契約棚卸 |
| `needs_analysis` | ニーズ分析 | 📊 | indigo | 必要保障額・ニーズの明確化 |
| `proposal` | 設計書提示 | 📄 | purple | 試算・設計書の提出 |
| `negotiation` | 検討中 | 💬 | yellow | 顧客質問対応・比較検討段階 |
| `application` | 申込書記入 | ✍️ | orange | 申込意向確認・書類記入 |
| `underwriting` | 査定中 | 🏥 | pink | 引受審査・健康告知審査 |
| `issued` | 証券発行 | 🎉 | green | 成約・証券発行完了（終端）|
| `lost` | 失注 | ❌ | red | 不成立（終端）|

**ターミナルステージ**: `issued` と `lost` は終端ステージ。これらに遷移すると `status` が自動更新される（詳細は `changeOpportunityStage` 挙動参照）。

---

### OpportunityStatus — 5 種ステータス

| 値 | 意味 | 自動遷移条件 |
|---|---|---|
| `open` | 進行中（初期値） | — |
| `won` | 受注（全商品成約） | `stage → 'issued'` |
| `partial_won` | 一部成約 | 手動更新のみ |
| `lost` | 失注 | `stage → 'lost'` |
| `on_hold` | 保留 | 手動更新のみ |

---

### OpportunityStageHistory 型

```typescript
interface OpportunityStageHistory {
  stage: OpportunityStage;       // 遷移後のステージ
  changedAt: string;             // ISO 8601
  changedByUserId: string;       // 操作者 userId
  note?: string;                 // 変更メモ（任意）
}
```

案件作成時に初期ステージのエントリが自動追記される。`changeOpportunityStage()` を呼ぶたびに新エントリが `stageHistory` 末尾に追記される。

---

### ProposalProduct 型

```typescript
interface ProposalProduct {
  id: string;
  productCategory: ProductCategory;   // 10 カテゴリ
  productName: string;                // 商品名（例: 「収入保障保険」）
  insurer: string;                    // 保険会社名
  insuredPersonId: string;            // 被保険者 Person.id
  monthlyPremium: number;             // 月払額（円）
  faceAmount?: number;                // 保険金額（円、任意）
  memo: string;                       // メモ
}
```

---

### LostReason — 10 種

| 値 | ラベル |
|---|---|
| `price` | 保険料が高い |
| `competitor` | 他社に決まった |
| `family_oppose` | 家族の反対 |
| `health_decline` | 健康上の理由で加入不可 |
| `no_need` | 必要性を感じない |
| `timing` | タイミングが合わない |
| `budget` | 予算不足 |
| `undecided` | 検討を保留 |
| `lost_contact` | 連絡が取れなくなった |
| `other` | その他 |

---

### ProductCategory — 10 種

| 値 | ラベル |
|---|---|
| `life` | 生命保険 |
| `medical` | 医療保険 |
| `cancer` | がん保険 |
| `income` | 就業不能保険 |
| `nursing` | 介護保険 |
| `savings` | 学資・貯蓄 |
| `auto` | 自動車保険 |
| `fire` | 火災保険 |
| `liability` | 賠償責任保険 |
| `other` | その他 |

---

### TimeBlock / Todo / Compliment への opportunityId 追加

Phase 2 で以下の型に `opportunityId?: string` フィールドを追加した（いずれも任意フィールド）:

```typescript
interface TimeBlock {
  // ... 既存フィールド
  opportunityId?: string;  // 紐付け案件 (Phase 2 追加)
}

interface Todo {
  // ... 既存フィールド
  opportunityId?: string;  // 紐付け案件 (Phase 2 追加)
}

interface Compliment {
  // ... 既存フィールド
  opportunityId?: string;  // 紐付け案件 (Phase 2 追加)
}
```

**用途**: TimeBlock の `opportunityId` を設定すると、OpportunityDetailPage の「活動履歴」タブでそのブロックが一覧表示される。BlockModal から商談案件を選択した際にセットされる。

---

### Store Actions: Opportunity 操作

| アクション | 説明 |
|---|---|
| `addOpportunity(partial)` | 案件追加。`id` / `stageHistory` (初期エントリ自動追記) / `createdAt` / `updatedAt` / `totalMonthlyPremium` は自動付与 |
| `updateOpportunity(id, patch)` | 案件部分更新（`updatedAt` 自動更新）。提案商品変更時は `totalMonthlyPremium` の再計算も別途 `patch` に含める |
| `deleteOpportunity(id)` | 案件削除 |
| `changeOpportunityStage(id, newStage, note?, userId?)` | ステージ変更（下記詳述） |
| `getOpportunitiesByHousehold(householdId, options?)` | 世帯 ID で案件一覧取得。`options.openOnly=true` で `status === 'open'` のみに絞り込み |
| `getOpportunityById(id)` | ID で案件取得 |

#### `changeOpportunityStage` の挙動

```
changeOpportunityStage(id, newStage, note?, userId?)
```

1. `stageHistory` に `{ stage: newStage, changedAt: now, changedByUserId, note }` を自動追記
2. **`issued` 遷移時**: `status` を `'won'` に自動更新、`actualCloseDate` を当日日付で自動セット（未設定時のみ）
3. **`lost` 遷移時**: `status` を `'lost'` に自動更新、`actualCloseDate` を当日日付で自動セット（未設定時のみ）
4. `updatedAt` を自動更新
5. `localStorage` にも即座に永続化（`nippou.opportunities.v1`）

---

### Seed データ: OPPORTUNITIES

c1〜c10 世帯に分散した 11 件がデフォルト seed として登録される。全 9 ステージ（approach / fact_finding / needs_analysis / proposal / negotiation / application / underwriting / issued / lost）を網羅。

| 案件 ID | 世帯 | ステージ | ステータス | 説明 |
|---|---|---|---|---|
| opp1 | c1 KOORO GILSON | proposal | open | 生命保険 + 医療保険 見直し |
| opp2 | c2 齋藤 和久 | negotiation | open | 医療保険 新規 |
| opp3 | c4 水野 幸重 | application | open | 自動車保険 更新 |
| opp4 | c6 鈴木 花代 | approach | open | 生命保険 見直し（初回） |
| opp5 | c8 高橋 誠 | fact_finding | open | 自動車保険 新規 |
| opp6 | c10 伊藤 幸子 | needs_analysis | open | 医療保険 + がん保険 |
| opp7 | c1 KOORO GILSON | issued | won | 自動車保険 受注済み |
| opp8 | c2 齋藤 和久 | lost | lost | 生命保険 失注（他社に決定）|
| opp9 | c3 暁和化学ゴム | underwriting | open | 法人 工場火災保険 |
| opp10 | c6 鈴木 花代 | fact_finding | open | 学資保険 検討 |
| opp11 | c4 水野 幸重 | approach | open | 生命保険 初回アプローチ |

---

### LocalStorage: `nippou.opportunities.v1`

`opportunities` 配列は **localStorage に即座に永続化** される（他エンティティとは異なり専用キーで管理）。

```typescript
// 読み込み: store 初期化時
const raw = window.localStorage.getItem('nippou.opportunities.v1');
if (raw) return JSON.parse(raw) as Opportunity[];
// else フォールバック: OPPORTUNITIES seed データ

// 書き込み: addOpportunity / updateOpportunity / deleteOpportunity / changeOpportunityStage 時
window.localStorage.setItem('nippou.opportunities.v1', JSON.stringify(updated));
```

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
  submittedAt?: string;       // 提出日時（ISO 8601）

  // タイムスタンプ（confirm 関連）
  confirmedAt?: string;       // 上長承認日時
  confirmedBy?: string;       // 承認者 userId
  createdAt: string;
  updatedAt: string;
}
```

**status による状態管理**: `status` enum が状態の唯一の真実 (single source of truth)。「提出済みか否か」は `status === 'submitted' || status === 'confirmed'` で判定する。`submitted` boolean フラグは廃止済み。

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

### User

ユーザーエンティティ。各ロールの利用シナリオは `docs/USER_GUIDE.md` を参照。

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;              // 'general' | 'manager' | 'executive' | 'admin'
  status: 'active' | 'invited' | 'inactive';
  avatarInitials: string;  // アバター表示用イニシャル
  teamIds: string[];       // 所属チーム ID の配列
  lastLogin?: string;      // ISO 8601
}
```

---

### Team

チームエンティティ。メンバー・上長管理の中心エンティティ。チーム編成管理の機能詳細は `docs/USER_GUIDE.md` 「admin シナリオ」を参照。

```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];  // チームメンバーの userId 配列
  managerIds: string[]; // チーム内の上長 userId 配列（memberIds のサブセット）
}
```

---

### 組織図構造（User ・ Team の関係）

**概要**: `Team.managerIds` / `Team.memberIds` / `User.teamIds` の 3 フィールドを組み合わせることで、上長・部下の関係を導出する。

```
User
  teamIds: ['team-1', 'team-2']

  ↑ このユーザーの上長 = team-1 または team-2 の managerIds に含まれるユーザー

Team (team-1)
  memberIds: ['u1', 'u2', 'u3']
  managerIds: ['u2']  ← u2 が team-1 の上長
```

**上長判定ロジック** (`getManagersOf`):
1. 対象ユーザーの `user.teamIds` に含まれる全チームを取得
2. 各チームの `team.managerIds` を集約（自身を除外・重複除山）
3. 対応する `User` オブジェクトを返す

**部下判定ロジック** (`getSubordinatesOf`):
1. `team.managerIds` に `userId` が含まれる全チームを検索
2. 各チームの `team.memberIds` を集約（自身を除外・重複除山）
3. 対応する `User` オブジェクトを返す

**制約**:
- 1 ユーザーが複数チームに所属できる（`user.teamIds` は配列）
- 上長は必ず `memberIds` に含まれている必要がある（`managerIds ⊆ memberIds`）
- 異なるチーム経由で同一の上長が複数回登場しても重複は `Set` で自動除山

**関連ユーティリティ**: `src/utils/orgChart.ts` — `getManagersOf` / `getSubordinatesOf`（詳細は `UTILITIES.md` を参照）

---

### Customer → Household

> **Phase 1 変更**: `Customer` 型は `Household` の互換エイリアスとなりました（deprecated 予告）。新規コードは `Household` 型を直接使用してください。将来のフェーズで `Customer` 型のエクスポートは削除予定。詳細は「保険営業ドメイン Phase 1: 世帯モデル基盤」セクションを参照。

```typescript
// deprecated — 新規コードでは Household 型を使用すること
export type Customer = Household;
```

**互換性**: `CustomerType` = `HouseholdType`、`CustomerStatus` = `HouseholdStatus` として型エイリアスが定義されているため、既存の `Customer` 型を利用したコードはそのまま動作する。

---

### 削除済み顧客の参照ポリシー (E-8)

`deleteCustomer(customerId)` を実行すると顧客レコードはストアから即座に削除されるが、過去の `DailyReport.blocks` 内の `TimeBlock.customerId` はそのまま残る。

> **真の原因修正 (e54993b + 0450936)**: `139386b` は UI 層の `'不明'` フォールバックを実装したが、Zustand store が非永続化なためページリロード/URL直接アクセスで削除した顧客が seed data から復元される根本問題が残っていた。`e54993b`/`0450936` で `src/store/deletedCustomers.ts` を新規作成し、`deleteCustomer` 時に削除済み顧客 ID を localStorage に永続化。store 初期化時に seed data からフィルタアウトする。

**削除済み顧客 ID の永続化 (`src/store/deletedCustomers.ts`)**:
```typescript
export const DELETED_CUSTOMERS_STORAGE_KEY = 'nippou.deletedCustomerIds.v1';

loadDeletedCustomerIds(): Set<string>    // localStorage から削除済み ID を読み込む
saveDeletedCustomerIds(ids: Set<string>) // 削除済み ID を localStorage に保存
persistDeletedCustomerId(id: string)     // 1 件追加して保存
```

**store 初期化時の処理**:
```typescript
const _deletedCustomerIds = loadDeletedCustomerIds();
const _initialCustomers = _deletedCustomerIds.size > 0
  ? CUSTOMERS.filter(c => !_deletedCustomerIds.has(c.id))
  : CUSTOMERS;
```

**deleteCustomer アクション**:
- `persistDeletedCustomerId(customerId)` で削除前に ID を localStorage に保存
- `set(s => ({ customers: s.customers.filter(c => c.id !== customerId) }))` でストアから削除

**resetAll アクション**:
- `localStorage.removeItem('nippou.deletedCustomerIds.v1')` で削除済み ID をクリア

**UI 層フォールバック** (既存、`139386b`):

| 箇所 | 表示ルール |
|---|---|
| `ReadOnlyTimeline` 内 BlockBar 顧客名 | `customers.find(c => c.id === block.customerId)?.name ?? '不明'` |
| `SidePanelCards` CustomerSummaryCard | `customer?.name ?? '不明'` |
| `SearchPage` 訪問顧客名リスト | `customers.find(c => c.id === b.customerId)?.name ?? '不明'` |

**設計方針**:
- `customerId` は日報ブロックに残る（履歴保全のため）
- ページリロード後も `nippou.deletedCustomerIds.v1` の永続化により削除状態を維持
- UI 層で `customers` リストに顧客が見つからない場合は `'不明'` を表示（二重フォールバック）
- 削除前に `deactivateCustomer(customerId)` （ステータスを `inactive` に変更）を使うことを推奨する

**`deleteCustomer` vs `deactivateCustomer`**:

| 操作 | 顧客レコード | 過去日報の表示 | リロード後の状態 | 推奨用途 |
|---|---|---|---|---|
| `deleteCustomer` | **完全削除** + localStorage に ID 保存 | `'不明'` が表示される | 削除状態を維持 | 誤登録・テストデータの消去 |
| `deactivateCustomer` | 残る（status=inactive） | 顧客名を正常表示 | 非アクティブ維持 | 取引終了・長期休眠 |

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

上長からのコメント・フィードバック、および部下から上長への能動コメント。

```typescript
interface ManagerCommentReply {
  userId: string;           // 返答者 ID
  choice: 'yes' | 'no';     // 'yes'（了承）| 'no'（要相談）
  repliedAt: string;        // 返答日時（ISO 8601）
}

interface ManagerComment {
  id: string;
  dayKey: string;           // YYYY-MM-DD（日報を特定）
  authorUserId: string;     // 投稿者 ID（上長または部下）
  /** 表示用ロール — 上長コメント: 'manager'|'executive', 部下コメント: 'general' (optional for backward compat) */
  authorRole?: 'manager' | 'executive' | 'general';
  body: string;             // コメント本文
  createdAt: string;        // ISO 8601
  replies: ManagerCommentReply[];  // 部下からの返答群
}
```

**`authorRole` について**:
- `addManagerComment(dayKey, userId, body, authorRole?)` 呼び出し時に `currentRole` を渡す
- 設定されない場合 (下位互換) は `commentUser?.role` でフォールバック
- `resolvedRole === 'general'` の場合、UI が緑系アバター + 「↑ 上長宛」バッジを表示

**機能フロー**:
1. 上長が `dayKey` 指定の日報に対し、`addManagerComment(dayKey, userId, body, authorRole)` でコメント追加
2. 部下 (general) が自身の日報に対して能動的に上長宛コメントを投稿可能
3. 部下は `replyToManagerComment(commentId, userId, choice)` で ✅YES / ❌NO 返答
4. 返答後は返答者ステータス + 日時が表示され、ボタンは非活性化

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
| `submitReport(reportId)` | `in_progress → submitted` | `in_progress` 時のみ有効 |
| `withdrawReport(reportId)` | `submitted → in_progress` | `submitted` 時のみ有効（本人取り下げ・上長差し戻し共通） |
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

### 顧客 / 世帯操作

| アクション | 説明 |
|---|---|
| `addCustomer(customer)` | 世帯追加（`addHousehold` エイリアス） |
| `updateCustomer(customerId, updates)` | 世帯更新（`updateHousehold` エイリアス） |
| `deleteCustomer(customerId)` | 世帯完全削除 (CUS-3: 管理者/役員のみ実行可)。付帯情報あり + admin/executive 以外は no-op (保安司 P0 二層防御) |
| `deactivateCustomer(customerId)` | 世帯無効化 (status: active → inactive) |

### Person 操作

| アクション | 説明 |
|---|---|
| `addPerson(householdId, partial)` | 世帯員追加（id / householdId / createdAt / updatedAt は自動付与） |
| `updatePerson(personId, patch)` | 世帯員更新（updatedAt を自動更新） |
| `deletePerson(personId)` | 世帯員削除。世帯主削除時は次の Person を自動繰り上げ。`{ ok: boolean; error?: string }` 返却 |
| `getPersonsByHousehold(householdId)` | 世帯 ID で世帯員一覧を取得 |

### ManagerComment 操作

| アクション | 説明 |
|---|---|
| `addManagerComment(dayKey, authorUserId, body, authorRole?)` | コメント追加 (上長・部下共用) |
| `replyToManagerComment(commentId, userId, choice)` | コメントへの返答（yes/no） |
| `deleteManagerComment(commentId)` | コメント削除（自分の投稿のみ） |

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

- **LocalStorage**: Zustand の persist middleware は未使用。**ただし以下のデータはカスタム実装で localStorage に永続化する**（詳細は「localStorage キー一覧」参照）
- **外部 API**: なし
- **セキュリティ**: ユーザー入力は React JSX 経由。`dangerouslySetInnerHTML` 不使用

### localStorage キー一覧

| キー | 型 | 記載場所 | 説明 |
|---|---|---|---|
| `nippou.auth.v1` | JSON (AuthSession) | AUTH-1/AUTH-2 | 認証セッション情報。ログイン済ユーザー情報 + 履行期限 |
| `nippou_login_fails` | 数値文字列 | P1 (e54993b 2026-06-06) | ログイン失敗回数。`LoginPage` `useState` 初期値で `parseInt` 読み込み、`Number.isNaN` なら 0 にフォールバック |
| `nippou_login_lock_until` | Unixミリ秒文字列 | P1 (e54993b 2026-06-06) | ロック解除時刻 (ms)。5回失敗時に `Date.now() + 30分` を保存。`Date.now() > lockUntil` で自動解除 |
| `nippou.deletedCustomerIds.v1` | JSON (string[]) | E-8 (e54993b/0450936 2026-06-06) | 削除済み顧客 ID の配列。`deleteCustomer` 時に追加。store 初期化時に seed data をフィルタアウト。`resetAll` 時にクリア |
| `nippou.currentRole.v1` | 文字列 (Role) | E-9 (a5eb23c 2026-06-06) | ロール切替の現在選択ロール。`setRole` 時に保存。`login`/`logout`/`resetAll` 時にクリア |
| `nippou.currentUserId.v1` | 文字列 (userId) | E-9 (a5eb23c 2026-06-06) | ロール切替の現在選択ユーザー ID。`setRole` 時に同時保存。`login`/`logout`/`resetAll` 時にクリア |
| `nippou.persons.v1` | JSON (Person[]) | Phase 1 (6db6e91 2026-06-09) | 世帯員データ。将来的に永続化対象となる予定（現時点は seed データから初期化） |
| `nippou.opportunities.v1` | JSON (Opportunity[]) | Phase 2 (97cabc9 2026-06-09) | 商談案件データ。`addOpportunity` / `updateOpportunity` / `deleteOpportunity` / `changeOpportunityStage` 時に即座保存。store 初期化時に読み込み、なければ seed データでフォールバック |

**localStorage 書き込みタイミング (`nippou_login_fails` / `nippou_login_lock_until`)**:
- **読み込み**: `LoginPage` `useState` lazy initializer で読み込み（マウント時に一度だけ）
- **失敗時**: `failCount + 1` を同期。`failCount >= 5` でロックタイムスタンプも保存
- **成功時**: `localStorage.removeItem` で両キーを削除・リセット

**localStorage 書き込みタイミング (`nippou.deletedCustomerIds.v1`)**:
- **読み込み**: store モジュール初期化時 (`loadDeletedCustomerIds()`)
- **削除時**: `deleteCustomer(id)` 内で `persistDeletedCustomerId(id)` が追加・保存
- **リセット時**: `resetAll()` 内で `localStorage.removeItem('nippou.deletedCustomerIds.v1')`

---

### ロール切替の永続化 (E-9)

`setRole(role)` を実行すると選択ロールが localStorage に保存され、ページリロード後も選択したロールが維持される。

> **修正経緯 (a5eb23c)**: デモモードのヘッダーロール切替メニューで切り替えたロールがページリロード後に初期値に戻るバグが発生していた。鸞鳳殳検証で発覚。localStorage 永続化により修正。

**永続化ヘルパー関数 (`src/store/auth.ts`)**:
```typescript
export const ROLE_SWITCH_STORAGE_KEY = 'nippou.currentRole.v1';
export const USER_SWITCH_STORAGE_KEY = 'nippou.currentUserId.v1';

loadRoleSwitch(): { role: Role; userId: string } | null  // localStorage から復元
persisteRoleSwitch(role: Role | null, userId: string | null)  // 保存 or 削除
```

**store 初期化時の優先順位**:
```typescript
// E-9: ロール切替が永続化されていればそちら優先、なければ auth ユーザーのロール
currentRole: _initialRoleSwitch?.role ?? _initialUser?.role ?? 'general',
currentUserId: _initialRoleSwitch?.userId ?? _initialUser?.id ?? 'u1',
```

| 優先順位 | ソース | 条件 |
|---|---|---|
| 1 | localStorage 切替記録 (`nippou.currentRole.v1`) | 存在する場合 |
| 2 | auth セッションのロール (`_initialUser?.role`) | 切替記録がない場合 |
| 3 | デフォルト (`'general'`) | auth 情報がない場合 |

**setRole アクションの挙動**:
```typescript
setRole: (role) => {
  const roleUserMap: Record<Role, string> = {
    general: 'u1', manager: 'u4', executive: 'u5', admin: 'u6',
  };
  const userId = roleUserMap[role];
  persistRoleSwitch(role, userId);  // E-9: localStorage に保存
  set({ currentRole: role, currentUserId: userId });
},
```

**クリア契機**:
| 濃作 | 底数 |
|---|---|
| `login(email, password)` / `loginAsUser(userId)` | ログイン時はログインユーザー本来のロールを優先するため切替記録を削除 |
| `logout()` | ログアウト時に切替記録を削除 |
| `resetAll()` | リセット時に切替記録を削除 |

**E-8 (`nippou.deletedCustomerIds.v1`) とのパターン共有**:
- 同様に store 機能に専用ヘルパー (`auth.ts`) で永続化を封尻化
- 初期化時にデータを読み込み、store 初期値として注入
- `resetAll` 時に一括クリア

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

- **2026-06-06 a5eb23c**: E-9 ロール切替永続化バグ修正 — `src/store/auth.ts` に `ROLE_SWITCH_STORAGE_KEY` / `USER_SWITCH_STORAGE_KEY` / `loadRoleSwitch` / `persistRoleSwitch` を追加。store 初期化時に `loadRoleSwitch` を優先、`setRole` で `persistRoleSwitch` 呢出、`login`/`logout`/`resetAll` でクリア。localStorage キー一覧に `nippou.currentRole.v1` / `nippou.currentUserId.v1` を追加
- **2026-06-06 d13c0f6 / cea9756**: ユーザー管理画面拡張 — `User` / `Team` エンティティ定義と組織図構造説明を追加。`Team.managerIds` / `Team.memberIds` / `User.teamIds` による上長・部下判定ログンを明文化
- **2026-06-06 40e081e**: 部下→上長への能動コメント機能追加 — `ManagerComment` 型に `authorRole?: 'manager' | 'executive' | 'general'` フィールド追加。`addManagerComment` シグネチャに `authorRole?` 引数追加
- **2026-06-03 319e32c**: AUTH-1/AUTH-2/AUTH-3/AUTH-4/AUTH-5 認証機能追加 — ログインガード・セッション失効・パスワード変更
- **2026-06-03 573fe49**: CAL-1/CUS-1 鳳凰殿 P2 改修 — カレンダー視認性・顧客一覧件数表示+ソート
- **2026-06-03**: ManagerComment/Compliment 型追加、Todo 拡張（status/priority/dueDate）、DailyReport に submitted フラグと mainTheme を追加、上長コメント・お褒め記録機能に対応
- **2026-06-06 0450936**: E-8 真の原因修正 — `src/store/deletedCustomers.ts` 新規作成。`nippou.deletedCustomerIds.v1` localStorage キーを追加。`deleteCustomer` 時に ID を永続化し store 初期化時に seed data からフィルタアウト。`resetAll` 時にクリア
- **2026-06-06 e54993b**: P0/P1 本体実装 — `nippou_login_fails`/`nippou_login_lock_until` の LoginPage への組み込み完成。`deleteCustomer` に二層防御 (付帯情報 + role チェック) 追加。前回 d8aae47 の汚染 docs を訂正
- **2026-06-04 90a69fe/139386b**: E-7 NotFoundPage 実装 / E-8 削除済み顧客参照ポリシー追加 — TimeBlock.customerId の参照先不在時は `'不明'` と表示する UI ルールを策定（根本修正は e54993b/0450936）
- **2026-06-03 b623958**: 提出ヘッダー追加 / YES/NO 返答UI改善 / TODO 3段巡回実装 / 備考常時表示（memo truthy のみ）
- **2026-06-04 f2cd145**: 保安司 P1 — ログインロックアウトのユーティリティとテストを新規作成（LoginPage.tsx への組み込みは e54993b で完成）
- **2026-06-04 8ccb832**: 保安司 P0 — `hasCustomerAttachment` / `canDeleteCustomer` ユーティリティを新規作成（UI/Store への組み込みは e54993b で完成）
- **2026-06-09 97cabc9**: Phase 2 商談案件管理 — `Opportunity` 型新設（9 ステージ + 5 ステータス）。`OpportunityStageHistory` / `ProposalProduct` 型新設。`LostReason` 10 種 / `ProductCategory` 10 種 追加。`TimeBlock` / `Todo` / `Compliment` に `opportunityId?` 追加。Store に `opportunities` State + 6 アクション（`addOpportunity` / `updateOpportunity` / `deleteOpportunity` / `changeOpportunityStage` / `getOpportunitiesByHousehold` / `getOpportunityById`）追加。Seed: OPPORTUNITIES 11 件 (全 9 ステージ網羅)。`nippou.opportunities.v1` localStorage 永続化追加。`/opportunities` + `/opportunities/:id` ルート追加
- **2026-06-09 6db6e91**: Phase 1 世帯モデル基盤 — `Household` 型新設（旧 `Customer` の発展形、`headPersonId` / `address` / `familyMemo` 追加）。`Customer` を `Household` の互換エイリアスに降格（deprecated 予告）。`Person` 型新設（世帯員・続柄・生年月日・健康情報）。Store に `persons` State + 4 アクション追加。Seed: PERSONS 18 件 (c1-c10 世帯主 + 家族)。`/households` ルート追加 + `/customers` リダイレクト対応
- **2026-06-06 3c16dbd**: submitted フラグ廃止 + デッドフィールド sentBackAt/sentBackReason 削除 — `DailyReport.submitted: boolean` を型から削除し `status` enum による一元判定に移行。`sentBackAt` / `sentBackReason` フィールドを削除（src 全体で参照なし）。仕様書 (DATA_MODEL.md / STATUS_FLOW.md) を同コミットに追従
