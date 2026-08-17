# ADR-TASK-MASTER — 汎用タスク＋タスク初期値マスタ

- ステータス: Proposed（青龍レビュー待ち・実装未着手）
- 起草日: 2026-08-17
- 決裁: 主上めめんが 2026-08-17（確定要件 / 14:07 世帯スコープ追加決裁）
- 対象: 305 nippou-app（保険営業支援フルCRUDモック）/ branch `feature/sales-perf`
- 前提ADR: ADR-B4 v2 §B4-7（現行の固定4タスク＝証券回収/ポリシーレビュー/意向シート/署名）

---

## 1. 背景・目的

### 1.1 現状（固定4タスク方式）

現行の案件タスクは、案件の状態フィールドから**導出ビュー**として固定的に生成されている。

- 永続データは2型に分散:
  - `Opportunity.contractTasks: ContractTasks`（案件単位）= 証券回収 `policyCollected` / ポリシーレビュー `policyReviewed`（各 boolean + 日付）
  - `Opportunity.insuredTasks: InsuredTaskState[]`（被保険者単位）= 意向シート `intentSheetDone` / 署名 `signatureDone`（各 boolean + 日付）
- `src/utils/oppTasks.ts` の `getOppTaskRows(opp, persons)` が、この2型から**常に4種の `OppTaskRow[]`**（証券回収・ポリシーレビュー・意向シート×被保険者・署名×被保険者）を導出。
- UI（`OpportunityDetailPage.tsx` の「☑️ タスク」タブ）は `OppTaskRow[]` を表示し、チェックで `togglePolicyCollect / togglePolicyReview / toggleIntentSheet / toggleSignature` を呼び `updateOpportunity` する。

### 1.2 問題点

1. **タスク種別が4種にハードコード**。営業現場で発生する多様なフォロー（更新案内・給付金請求・住所変更・アフターフォロー等）を追加できない。
2. **商品カテゴリごとの違いを表現できない**。生保系（life/medical/cancer/income/nursing/savings）と損保系（auto/fire/liability）で必要タスクが異なるのに、一律4種。
3. **自由入力タスクが作れない**。担当・期限・優先度・繰越といった運用属性を持てない。
4. **タスク定義が管理者から編集不能**。マスタ化されておらずコード変更でしか増減できない。

### 1.3 目的

固定4タスクを廃し、**(A) 世帯・案件・商品に紐づく汎用タスク（自由追加/編集/削除可・運用属性付き）** と **(B) タスク初期値マスタ（世帯既定＋案件既定＋商品カテゴリ別・トリガー定義付き・管理者編集可）** の2本立てに再設計する。マスタからトリガー（世帯作成/案件作成/商品追加/ステージ到達）に応じて既定タスクを自動生成し、以後はユーザーが自由に運用できるようにする。

**付与単位は3スコープ**（主上決裁 2026-08-17 14:07）: **世帯（household）／案件（opportunity）／商品（product）**。旧「被保険者スコープ」は廃止し、意向シート/署名は案件スコープの既定タスクへ集約する。

---

## 2. データモデル設計

### 2.1 新 `Task` 型（永続・案件配下）

導出ビュー（`OppTaskRow`）を廃し、**実体を持つ永続タスク**にする。`Opportunity.tasks: Task[]` として保持。

```ts
/** タスク付与スコープ（3スコープ・主上決裁 2026-08-17 14:07） */
export type TaskScope = "household" | "opportunity" | "product";

/** タスク優先度 */
export type TaskPriority = "high" | "medium" | "low";

/**
 * 汎用タスク（永続）。世帯／案件／商品のいずれかに紐づき0..n個。
 * 自動生成（マスタ由来）と手動追加が同一型で共存する。
 */
export interface Task {
  id: string;
  title: string;            // タスク名（自由入力可）
  done: boolean;            // 完了フラグ
  doneDate?: string;        // 完了日 (YYYY-MM-DD)
  dueDate?: string;         // 期限 (YYYY-MM-DD)
  ownerId?: string;         // 担当 User.id（既定=案件 ownerId / 世帯 primaryUserId）
  memo?: string;            // メモ
  priority: TaskPriority;   // 優先度（既定 'medium'）
  rolledOver: boolean;      // 繰越フラグ（期限超過を翌日以降へ繰り越した印）
  scope: TaskScope;         // 'household'（世帯全体）| 'opportunity'（案件全体）| 'product'（特定商品付帯）
  householdId?: string;     // scope='household' のとき対象 Household.id
  productId?: string;       // scope='product' のとき対象 ProposalProduct.id
  sourceMasterId?: string;  // 生成元 TaskTemplate.id。手動追加は undefined（=null相当）
  createdAt: string;
}
```

補足:
- **付与単位は3スコープ**（household/opportunity/product・主上決裁 2026-08-17 14:07）。**被保険者スコープは廃止**（確定要件1）。旧「意向シート/署名（被保険者単位）」は **案件スコープの既定タスク**に集約する（1案件1件。被保険者ごとの分割は行わない）。
- **格納場所**: `scope='household'` の Task は `Household.tasks: Task[]` に、`scope='opportunity'` / `'product'` の Task は `Opportunity.tasks: Task[]` に格納する（product は案件配下の商品に付帯するため案件側で保持し `productId` で紐づける）。
- `householdId` は `scope==='household'` のとき、`productId` は `scope==='product'` のときのみ有効。商品削除時の扱いは §5.4 参照。
- `sourceMasterId` は**冪等化キー**。同一マスタ定義から重複生成しないための照合に使う（§3.3）。

### 2.2 `TaskTemplate` 型（タスク初期値マスタ・永続・管理者編集可）

「どのタスクを・どのスコープに・どの商品カテゴリで・どのトリガーで自動生成するか」を1レコードで定義。

```ts
/** 自動登録トリガー種別 */
export type TaskTriggerType =
  | "household_created"     // 世帯作成時（世帯既定タスク・主上決裁 2026-08-17 14:07）
  | "opportunity_created"   // 案件作成時（案件既定タスク）
  | "product_added"         // 商品追加時（その商品カテゴリの既定タスク）
  | "stage_reached";        // ステージ到達時（例: issued 到達で「証券回収」）

/**
 * タスク初期値マスタ。1レコード=「このトリガーで、このタイトルのタスクを、
 * このスコープ／商品カテゴリ条件のもとに生成する」定義。
 */
export interface TaskTemplate {
  id: string;
  title: string;                 // 生成されるタスクのタイトル
  scope: TaskScope;              // 生成タスクの scope
  trigger: TaskTriggerType;      // 発火トリガー
  /**
   * 商品カテゴリ条件（**product スコープにのみ適用**・主上決裁 2026-08-17 14:07）。
   * - null/空配列 = 全カテゴリ対象
   * - 値あり = そのカテゴリの商品のみ対象（生保系・損保系の出し分け）
   * - **household / opportunity スコープのマスタは null 固定**（世帯既定・案件既定は全社共通。商品カテゴリ別粒度は product のみ）
   */
  productCategories: ProductCategory[] | null;
  /** trigger='stage_reached' のとき、到達を判定するステージ */
  triggerStage?: OpportunityStage;
  /** 既定の期限オフセット（トリガー基準日から N 日後。未設定なら期限なし） */
  defaultDueOffsetDays?: number;
  defaultPriority: TaskPriority; // 生成タスクの既定優先度
  defaultMemo?: string;          // 生成タスクの既定メモ
  order: number;                 // 表示順・生成順
  isActive: boolean;             // 無効化した定義は生成に使わない（履歴タスクは残す）
  createdAt: string;
  updatedAt: string;
}
```

設計判断:
- **粒度は「商品カテゴリ別」を `productCategories` で表現**（確定要件3）。生保系セットは `['life','medical',...]`、損保系は `['auto','fire','liability']`、全社共通は `null`。カテゴリ別に別セットを組みたい場合は複数レコードに分けて登録する。
- **スコープ別のカテゴリ粒度（主上決裁 2026-08-17 14:07）**: 商品カテゴリ別粒度は **product スコープにのみ適用**する。**household スコープは全社共通の世帯既定（`productCategories=null` 固定）**でよい。opportunity スコープも全社共通案件既定（`null`）が基本。
- **1マスタ=1タスク定義**（セットではなく単票）。「セット」は同一 `trigger`＋`productCategories` を共有する複数レコードの束として表現する。UI 上はトリガー×スコープ×カテゴリでグルーピング表示する（§4.4）。
- スコープとトリガーの対応（基本）: `household`↔`household_created` / `opportunity`↔`opportunity_created`・`stage_reached` / `product`↔`product_added`（バリデーションで整合を促すが型上は強制しない）。

### 2.3 `Opportunity` / `Household` への変更

```ts
export interface Household {
  // ... 既存フィールド（primaryUserId 等）...
  tasks: Task[];              // ★NEW 世帯スコープの汎用タスク（scope='household'）。必須配列（空=[]）
}

export interface Opportunity {
  // ... 既存フィールド ...
  tasks: Task[];              // ★NEW 案件・商品スコープの汎用タスク（scope='opportunity'|'product'）。必須配列（空=[]）

  // ── 撤去（§2.4）──
  // contractTasks?: ContractTasks;        ← 削除
  // insuredTasks?: InsuredTaskState[];    ← 削除
}
```

設計判断: **世帯タスクは `Household.tasks`、案件/商品タスクは `Opportunity.tasks` に分けて持つ**（世帯は案件を持たない段階でもタスクを持てるべきなので、案件配下に寄せない）。UI で世帯詳細に世帯タスクを、案件詳細に案件/商品タスクを表示する（§4.1）。

### 2.4 旧 `ContractTasks` / `InsuredTaskState` の扱い — **撤去**（互換ブリッジは設けない）

**設計判断: 撤去（clean cut）。互換ブリッジは作らない。**

理由:
- 確定要件5により**データ移行不要**（モックのため seed を新モデルで作り直す）。永続データの移行責務がないので、互換レイヤを維持するコストが利益を上回る。
- `Opportunity.contractTasks` / `insuredTasks`、`OppTaskRow`、`getOppTaskRows` および関連 toggle 群（`togglePolicyCollect` 等）を撤去し、`Task[]` に一本化する。
- **重要な非互換ではない点（後述 §5.2）**: salesPerf の `policyCollected` は `Opportunity.contractTasks` を参照しておらず、CSV 由来の別データ経路（`raw.policy_collected`）から来る。したがって `ContractTasks` 撤去は salesPerf 指標に影響しない。

**唯一の要検討ブリッジ**: 「証券回収」タスクの完了状態を、案件パイプライン上の表示や将来の salesPerf 連携に使う可能性。現状は連携していない（§5.2）ため**ブリッジ不要**と判断するが、[要確認]項目として §7 に残す。

---

## 3. 自動生成エンジン設計

新規: `src/utils/taskGenerator.ts`（純関数群）。副作用なしで「生成すべき `Task[]`」を返し、呼び出し側（store）が既存 `tasks` へマージする。

### 3.1 トリガー別 生成仕様

| トリガー | 発火点 | 参照マスタ条件 | 生成内容 |
|---|---|---|---|
| `household_created` | 世帯新規作成時（store の世帯追加） | `trigger='household_created'`（`productCategories=null` 固定） | scope='household'・`householdId`=当該世帯 の Task をマスタ order 順に生成 |
| `opportunity_created` | 案件新規作成時（store `addOpportunity`） | `trigger='opportunity_created'` かつ `productCategories=null`（全社共通案件既定） | scope='opportunity' の Task をマスタ order 順に生成 |
| `product_added` | 商品追加時（`ProposalProduct` push 時） | `trigger='product_added'` かつ `productCategories` にその商品の `productCategory` を含む | scope='product'・`productId`=当該商品 の Task を生成 |
| `stage_reached` | ステージ変更時（`updateOpportunity` で stage が前進） | `trigger='stage_reached'` かつ `triggerStage===新ステージ`（カテゴリ条件があれば案件 `productCategories` と交差） | scope='opportunity' の Task を生成（例: `issued` 到達で「証券回収」） |

### 3.2 商品カテゴリ → 生保/損保セットのマッピング

`ProductCategory`（`src/types/index.ts` 実在値）を2系統に分類する。マスタの `productCategories` にこれらを列挙して出し分ける。

```ts
export const LIFE_CATEGORIES: ProductCategory[] =
  ["life", "medical", "cancer", "income", "nursing", "savings"];
export const NONLIFE_CATEGORIES: ProductCategory[] =
  ["auto", "fire", "liability"];
// "other" はどちらにも属さない（全社共通セットのみ適用 or 明示登録）
```

生成時のマッチング: マスタ `productCategories===null` → 無条件対象。値あり → 対象商品/案件のカテゴリが配列に含まれれば対象。

### 3.3 重複生成防止（冪等化）

- 生成候補ごとに **`sourceMasterId`（＝ `TaskTemplate.id`）** を刻む。
- `household_created` は対象世帯の `Household.tasks` 内で `sourceMasterId` 単位で冪等判定。
- `product_added` は `(sourceMasterId, productId)` の組で冪等判定（同一商品に同一マスタ由来タスクが既にあれば生成しない）。
- `opportunity_created` / `stage_reached` は `Opportunity.tasks` 内の `sourceMasterId` 単位で冪等判定（案件内に同一マスタ由来タスクが既にあれば生成しない）。
- これにより「商品を追加→削除→再追加」や「ステージを行き来」しても二重生成しない。
- 例外: **ユーザーが手動削除したマスタ由来タスクを再生成しない**ため、削除済み `sourceMasterId` の記録が要る。設計判断として、モックでは「同一 case で既存タスク（done/未doneを問わず）があれば再生成しない」ルールで足りるが、削除後の再発火は要検討 → §7 [要確認2]。

### 3.4 生成関数シグネチャ（案）

```ts
export function generateTasksOnHouseholdCreated(
  household: Household, masters: TaskTemplate[], today: string,
): Task[];  // 既存 household.tasks で冪等化。ownerId=household.primaryUserId

export function generateTasksOnOpportunityCreated(
  opp: Opportunity, masters: TaskTemplate[], today: string,
): Task[];

export function generateTasksOnProductAdded(
  opp: Opportunity, product: ProposalProduct, masters: TaskTemplate[], today: string,
): Task[];

export function generateTasksOnStageReached(
  opp: Opportunity, newStage: OpportunityStage, masters: TaskTemplate[], today: string,
): Task[];
```

各関数は「既存タスク（household.tasks / opp.tasks）を見て冪等化した上で、追加すべき Task のみ」を返す。`dueDate = today + defaultDueOffsetDays`、`ownerId = opp.ownerId`（世帯は `household.primaryUserId`）、`priority = master.defaultPriority` を初期値に。

---

## 4. UI への影響

### 4.1 案件詳細・世帯詳細のタスク表示

**案件詳細（OpportunityDetailPage「☑️ タスク」タブ）**:
- 表示を **案件タスク（scope='opportunity'）** と **商品別タスク（scope='product'・商品ごとにグルーピング）** の2区画に再構成。

**世帯詳細（HouseholdDetail / 顧客詳細）**:
- **世帯タスク（scope='household'）の区画を新設**。`Household.tasks` を表示し、下記と同一の行 UI（チェック/担当/期限/優先度/繰越/メモ/編集・削除）と自由追加を提供する。
- 各タスク行: チェック（done）/ タイトル / 担当 / 期限 / 優先度バッジ / 繰越印 / メモ / 編集・削除ボタン。
- **自由追加**: 「＋タスク追加」ボタン→ 案件詳細ではスコープ（案件 or 商品選択）、世帯詳細では scope='household' 固定で、タイトル・担当・期限・優先度を入力するインライン行 or モーダル。`sourceMasterId=undefined` で追加。
- **編集/削除**: 手動・自動生成いずれも編集/削除可（自動生成タスクも運用上不要なら消せる）。

### 4.2 done/total カウントの再定義

- 現行タブ見出し `☑️ タスク (${doneTaskCount}/${taskRows.length})` は維持。
- 新定義: `total = opp.tasks.length`、`done = opp.tasks.filter(t => t.done).length`。
- 導出ビューではなく実体配列を数える形に変わるだけで、見え方は互換。

### 4.3 store アクションの置換

`updateContractTasks` / `updateInsuredTask` を撤去し、`Task` CRUD に置換:

タスクは世帯（Household.tasks）と案件（Opportunity.tasks）の2場所に分かれるため、スコープに応じて対象エンティティを切り替える CRUD を用意する:

```ts
// 案件/商品スコープ（Opportunity.tasks）
addOppTask(oppId: string, task: Omit<Task, 'id'|'createdAt'>): void;
updateOppTask(oppId: string, taskId: string, patch: Partial<Task>): void;
removeOppTask(oppId: string, taskId: string): void;
toggleOppTaskDone(oppId: string, taskId: string, done: boolean, today?: string): void;
// 世帯スコープ（Household.tasks）
addHouseholdTask(householdId: string, task: Omit<Task, 'id'|'createdAt'>): void;
updateHouseholdTask(householdId: string, taskId: string, patch: Partial<Task>): void;
removeHouseholdTask(householdId: string, taskId: string): void;
toggleHouseholdTaskDone(householdId: string, taskId: string, done: boolean, today?: string): void;
```

（実装判断: 共通内部ヘルパで Task 操作を抽出し、上記は対象配列を差し替えるラッパーとするのが DRY。）`toggleTaskDone` 系は done=true で `doneDate` を today に、false で保持 or クリア（現行 toggle と同じ日付保持挙動を踏襲）。永続化キーは既存の `nippou.opportunities.v1` / 世帯の永続化キー（households ストア）を使う。

### 4.4 マスタ編集画面（管理者）

**設置場所の設計判断: AdminPage に新タブ「タスク初期値」を追加**（`TemplatesPage` は日報テンプレート専用で意味が異なるため混在させない。AdminPage は既に users/teams/audit のタブ構成を持ち、`canEdit`（管理者権限）ゲートがある）。

- 一覧: **スコープ×トリガー×商品カテゴリ**でグルーピング表示（世帯既定 / 全社共通案件既定 / 生保系（商品）/ 損保系（商品）/ ステージ到達 …）。
- 行編集: title / scope（household|opportunity|product）/ trigger / productCategories（**product スコープのみ選択可、household/opportunity は null 固定でUI上非表示）** / triggerStage / defaultDueOffsetDays / defaultPriority / defaultMemo / order / isActive。
- CRUD store アクション: `addTaskTemplate` / `updateTaskTemplate` / `removeTaskTemplate`（`nippou.taskTemplates.v1` に永続化。既存 master と同パターン）。
- 権限: 閲覧は全ロール可、編集は `canEdit`（管理者）のみ（AdminPage 既存ゲート踏襲）。

---

## 5. 既存機能への影響と非互換

### 5.1 撤去/置換対象（コード実在確認済み）

| 対象 | ファイル | 措置 |
|---|---|---|
| `getOppTaskRows` / `OppTaskRow` / toggle群 | `src/utils/oppTasks.ts`, `src/types/index.ts` | **撤去**（`Task[]` + `taskGenerator.ts` に置換） |
| `ContractTasks` / `InsuredTaskState` 型 | `src/types/index.ts` | **撤去** |
| `Opportunity.contractTasks` / `insuredTasks` | `src/types/index.ts` | **撤去**、`tasks: Task[]` 追加 |
| `Household` へ `tasks: Task[]` 追加 | `src/types/index.ts` | **追加**（scope='household' タスクの格納先） |
| 世帯タスク自動生成の配線 | `src/store/index.ts`（世帯追加アクション） | **追加**（household_created トリガー・世帯 Task CRUD） |
| `updateContractTasks` / `updateInsuredTask` | `src/store/index.ts`（~L2005-2060） | **撤去**、Task CRUD に置換 |
| タスクタブ描画・`handleTaskToggle` | `src/pages/OpportunityDetailPage.tsx`（L188-, L643-） | 新 Task モデルで再実装 |
| HouseholdBatchEntry のタスク UI | `src/pages/HouseholdBatchEntryPage.tsx`（L363-402, 643-760） | **要改修**（下記 §5.3） |
| `syncInsuredTasks` / `householdBatchEntry.ts` の contractTasks/insuredTasks | `src/utils/householdBatchEntry.ts` | insuredTasks 生成ロジック撤去、Task 初期生成に置換 |

### 5.2 salesPerf 連携への影響 — **影響なし**（grep 実査で確認）

`policyCollected` の参照箇所を全数調査した結果:

- **salesPerf の `policyCollected` は `Opportunity.contractTasks` を参照していない**。
  `src/features/salesPerf/lib/contractNormalize.ts:173` が `policyCollected: raw.policy_collected ?? false`、すなわち**取り込んだ SalesContract（CSV/import）の生フィールド `policy_collected`** から来ている。
  `src/features/salesPerf/lib/salesPerfMetrics.ts:320` の `funnelMetrics` はこの `SalesContract.policyCollected` を数えているだけで、案件 `contractTasks` とは無関係。
- したがって **`ContractTasks` 撤去は salesPerf 指標（ファネルの証券回収数）に一切影響しない**。両者は独立したデータ経路。
- `Opportunity.contractTasks.policyCollected` を参照している非テストコードは `src/utils/oppTasks.ts`（撤去対象）と `HouseholdBatchEntryPage.tsx` / `householdBatchEntry.ts`（§5.3で改修）と `store`（撤去対象）のみ。salesPerf ライブラリからの参照はゼロ。

**結論**: salesPerf への影響は無し。ただし将来「証券回収タスク完了を salesPerf に流したい」要望が出たら別途連携が要る → §7 [要確認1]。

### 5.3 HouseholdBatchEntry（世帯一括入力）への影響 — **要改修**

`HouseholdBatchEntryPage.tsx` は下書き（draft）段階で `contractTasks` / `insuredTasks`（`syncInsuredTasks`）を編集する UI を持つ。新モデルでは:
- 一括入力段階のタスク UI は簡素化し、`Task[]` の初期セット（案件作成トリガーのマスタ生成結果）を確定時に付与する方針に置換。
- `householdBatchEntry.ts` の `contractTasks: undefined` / `insuredTasks: undefined` 初期化箇所、`syncInsuredTasks` は撤去。
- 影響テスト: `householdBatchEntryB2b.test.ts`（L350/426/438 で contractTasks 参照）は新モデルへ書き換え。

### 5.4 商品削除時の product スコープタスク

`ProposalProduct` 削除時、その `productId` を持つ `scope='product'` タスクの扱い（連動削除 or 孤児化して残す）を決める必要がある。設計提案: **連動削除**（商品が消えたら付帯タスクも消す）。ただし done 済みタスクは履歴として残す案もある → §7 [要確認3]。

### 5.5 影響テスト（要書き換え・実在確認済み）

- `src/__tests__/oppTasksAndProposals.test.ts`（policyCollected/getOppTaskRows 前提。全面書き換え）
- `src/__tests__/contractPipelineModel.test.ts`（L280/308-313 で contractTasks boolean 検証）
- `src/__tests__/householdBatchEntryB2b.test.ts`（contractTasks 参照）
- salesPerf 配下テスト（`salesPerfMetrics.*.test.ts` 等）は `SalesContract.policyCollected` 前提で **本改修の影響を受けない**（触らない）。

---

## 6. 段階実装計画（T1〜T5・5タスク）

| # | タスク | 内容 | 主な成果物 | 依存 |
|---|---|---|---|---|
| **T1** | 型・マスタ定義 | `Task`（scope=household/opportunity/product・householdId?/productId?）/`TaskScope`/`TaskPriority`/`TaskTemplate`/`TaskTriggerType`（household_created 含む）追加、`Opportunity.tasks`・`Household.tasks` 追加、旧 `ContractTasks`/`InsuredTaskState`/`OppTaskRow` 撤去、LIFE/NONLIFE カテゴリ定数 | `src/types/index.ts`、カテゴリ定数 | — |
| **T2** | 自動生成エンジン | `src/utils/taskGenerator.ts`（**4トリガー**生成関数＋冪等化）、store の **世帯追加**/`addOpportunity`/商品追加/ステージ変更フックに配線、**世帯・案件 Task CRUD** store アクション | `taskGenerator.ts`、`store/index.ts` | T1 |
| **T3** | 案件/世帯詳細 UI | OpportunityDetailPage タスクタブ再実装（案件/商品別2区画）・**世帯詳細に世帯タスク区画新設**・自由追加/編集/削除・done/total 再定義、HouseholdBatchEntry 改修 | `OpportunityDetailPage.tsx`、世帯詳細ページ、`HouseholdBatchEntryPage.tsx` | T1,T2 |
| **T4** | マスタ編集画面 | AdminPage に「タスク初期値」タブ新設（一覧＋CRUD、権限ゲート）、`nippou.taskTemplates.v1` 永続化 | `AdminPage.tsx`、新 `TaskTemplatesTab` | T1,T2 |
| **T5** | seed 再作成＋テスト | 新モデルで seed 再構築（**世帯既定**＋全社共通案件既定＋生保/損保セット（商品）＋stage_reached 例）、影響テスト書き換え、Vitest/tsc/E2E グリーン化 | `src/data/seed.ts`、`__tests__/*` | T1〜T4 |

推奨実装体制: T1（型）は architect レビュー後 coder(sonnet)、T2/T3/T5 は coder(sonnet)、T4 は designer/coder(sonnet)、各完了で tester(sonnet)＋doc_keeper(haiku)。

---

## 7. 未決事項 / リスク（[要確認]）

- **[要確認1] 証券回収タスク → salesPerf 連携**: 現状 salesPerf の `policyCollected` は CSV import 由来で案件タスクと独立（§5.2）。新「証券回収」タスクの完了を将来 salesPerf ファネルに反映させたいか？ 反映不要なら本ADRのまま（連携なし）で確定。
- **[要確認2] 手動削除タスクの再生成抑止**: ユーザーが自動生成タスクを削除した後、同じトリガーが再発火したら再生成すべきか、抑止すべきか。抑止するなら「削除済み sourceMasterId」記録が要る。モック割り切りで「案件内に同一 sourceMasterId のタスクが1つでもあれば再生成しない／削除後は再生成する」のどちらを既定にするか。
- **[要確認3] 商品削除時の product タスク**: 連動削除 or 履歴保持。done 済みだけ残す折衷案の要否。
- **[要確認4] 「意向シート/署名」の被保険者粒度廃止の妥当性**: 確定要件1で被保険者スコープ廃止・案件スコープへ集約と決裁済み。旧UIで被保険者ごとにチェックしていた運用が案件1件集約で困らないか、朱雀UX検証で確認したい。
- **[要確認5] マスタ「セット」概念のUI表現**: 1マスタ=1タスク単票のため、「生保系初期セット5件」を管理者が編集する際の一括操作（セット複製・カテゴリ一括付替）UIをT4に含めるか、単票CRUDで足りるか。
- **[要確認6] 世帯タスクの表示場所**: 世帯タスク（scope='household'）は世帯詳細/顧客詳細に区画を新設する想定だが、日報・タスク一覧など横断ビューで世帯/案件/商品タスクを統合表示する需要があるか（あれば収集クエリの設計が追加で必要）。
- **リスク**: `getOppTaskRows`/`contractTasks`/`insuredTasks` は seed・複数テスト・HouseholdBatchEntry に広く根を張っている。T1撤去で tsc が大量にエラーを吐くため、T1〜T5 は**一気通貫の1ブランチ**で進め、途中の staging デプロイは T5 グリーン後に行う（半端な状態を朱雀に出さない）。
- **リスク**: モックゆえ localStorage 永続。`Opportunity.tasks` 追加で既存 `nippou.opportunities.v1` の旧データは形が合わない。モックなので**seed 再作成前提**（データ移行不要）だが、開発中に旧 localStorage が残ると壊れるため、キーを `nippou.opportunities.v2` に上げるか初回マイグレーションで捨てる方針を T5 で決める。

---

## 8. 決定（Summary）

- 付与単位は **3スコープ（世帯 household / 案件 opportunity / 商品 product・主上決裁 2026-08-17 14:07）**。
- 固定4タスク（contractTasks/insuredTasks/OppTaskRow/getOppTaskRows）を**撤去**し、永続 `Task[]`（世帯は `Household.tasks`、案件/商品は `Opportunity.tasks`／運用属性付き／自由CRUD）へ一本化する。
- **`TaskTemplate` マスタ**（世帯既定＋全社共通案件既定＋商品カテゴリ別（productのみ）・トリガー enum 付き・管理者編集可）を新設し、`taskGenerator.ts` が**4トリガー（世帯作成/案件作成/商品追加/ステージ到達）**で `sourceMasterId` により冪等生成する。
- 互換ブリッジは設けず（データ移行不要・モック）、seed を新モデルで再構築する。
- **salesPerf 指標には影響しない**（`policyCollected` は CSV import 由来で案件タスクと独立、grep 実査で確認済み）。
- 実装は T1〜T5 の5段階。未決5点は §7 の [要確認] を主上に確認してから T2 以降を確定する。
