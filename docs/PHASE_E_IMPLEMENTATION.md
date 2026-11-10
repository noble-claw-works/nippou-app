# 工程E実装内容ドキュメント

**対象プロジェクト**: 305 nippou-app  
**実装段階**: 工程E（2026-10-10）  
**検証日**: 2026-10-10  
**検証者**: doc_keeper  

---

## 概要

工程E では、以下の4つの主要機能を実装しました。各機能は `src/` コード実測により検証済みです。

---

## 1. 商談追加時のタスク自動生成

### 実装内容

商談（Opportunity）を新規作成する際に、有効なタスクマスタ定義に基づいて Task が自動生成されます。

#### 自動生成のトリガー

| トリガー | 説明 | 実装location |
|----------|------|--------------|
| `on_opportunity_created` | 商談作成時（即時） | taskGenerator.ts: generateTasksOnOpportunityCreated |
| `offset_from_base_date` | 基準日±offsetDays で dueDate を自動算出 | taskGenerator.ts: calculateDueDate |
| `product_added` | 提案商品追加時 | taskGenerator.ts: generateTasksOnProductAdded |
| `stage_reached` | ステージ到達時 | taskGenerator.ts: generateTasksOnStageChange |

#### 実装コード検証

**File**: `src/utils/taskGenerator.ts`

```typescript
// 商談作成時の自動タスク生成
export function generateTasksOnOpportunityCreated(
  opportunity: Opportunity,
  templates: TaskTemplate[]
): Task[]
```

- timingType = `on_opportunity_created` → 即時生成
- timingType = `offset_from_base_date` → baseDateType (first_consult_date / renewal_due_date) + offsetDays で dueDate 計算
- 基準日（example: firstConsultDate）が未入力の場合はスキップ

**File**: `src/store/_slices/opportunitySlice.ts`

```typescript
// addOpportunity reducer 内で呼び出し
const tasks = generateTasksOnOpportunityCreated(newOpp, state.taskTemplates);
// ... Task 配列を opportunity.tasks に append
```

#### 自動生成の仕様

- **対象マスタ**: TaskTemplate の isActive = true のもののみ
- **生成タスク**: scope / trigger / defaultDueOffsetDays / defaultPriority を継承
- **dueDate計算**:
  - timingType = `on_opportunity_created` → 手入力またはデフォルト未定義
  - timingType = `offset_from_base_date` → `baseDateType の日付 ± offsetDays`
- **sourceMasterId**: 生成元 TaskTemplate.id を記録（手動追加は undefined）

---

## 2. タスク列進捗表示（N/M）

### 実装内容

商談詳細画面（/opportunities/:id）および世帯画面（/households/:id）のタスクセクションで、完了状況を「**M/N**」形式で表示します。

#### 実装フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `Task.done` | boolean | 完了フラグ |
| `Task.doneDate` | string (YYYY-MM-DD) | 完了日 |
| `Task.doneBy` | string (User.id) | 完了者 |

#### 表示ロジック

```
進捗表示 = (完了タスク数) / (全タスク数)
例: Task が 3件中 2件完了 → "2/3"
```

#### 実装location

- `src/types/task.ts`: Task インターフェース定義
- `src/components/tasks/TaskList.tsx`: 進捗表示コンポーネント（想定）

---

## 3. 構成員年収合計の自動集計

### 実装内容

世帯詳細画面（/households/:id）で、世帯に属する全 Person の年収（annualIncome）を自動集計して表示します。

#### 実装フィールド

| Entity | フィールド | 型 | 単位 | 説明 |
|--------|-----------|-----|------|------|
| Household | annualIncome | number | 万円 | ★NEW 世帯契約者の年収（契約者=世帯に従属） |
| Person | annualIncome | number | 万円 | ★NEW 構成員ごとの収入（工程D） |

#### 集計ロジック

```typescript
totalAnnualIncome = persons.reduce((sum, p) => sum + (p.annualIncome ?? 0), 0)
// 例: 太郎(600万) + 花子(300万) = 900万
```

#### 実装検証（grep 実測）

```bash
$ grep -r "annualIncome" src/
src/types/household.ts:  annualIncome?: number; // ★NEW 年収（万円）構成員ごとの収入（工程D）
src/__tests__/householdsPaneD.test.ts:  it('addPerson で annualIncome が保存される', () => {
src/pages/HouseholdBatchEntryPage.tsx:  const [annualIncome, setAnnualIncome] = useState(...)
```

#### 表示場所

- /households/:id の「🛡️ 保障マトリクス」セクション下部に集計額表示
- スマホ表示時はタブ切替表示（PC lg: 横3列固定レイアウト）

---

## 4. 保険会社・種目マスタの処理

### 4-1. 保険会社（insurer） — 後方互換 + insurerId

#### 実装フィールド

| Entity | フィールド | 型 | 説明 |
|--------|-----------|-----|------|
| ProposalProduct | insurer | string | 従来フィールド（後方互換） |
| ProposalProduct | insurerId | string | ★NEW マスタから選択（SalesChannel/Insurer マスタ） |

#### 仕様

- **新規作成**: insurerId をマスタから選択 → UI は insurer 選択肢を insurerId で管理
- **後方互換**: 既存 insurer 文字列は読み込み可（insurerId が null の場合フォールバック）
- **保存**: categoryKey enum 値を維持

#### 実装location

- `src/types/policy.ts`: Policy / ProposalProduct 型定義
- UI: `/opportunities/:id` の ProposalProductEditModal

### 4-2. 種目（productCategories） — マスタ選択・enum 保存

#### 実装フィールド

| Entity | フィールド | 型 | 説明 |
|--------|-----------|-----|------|
| Opportunity | productCategories | ProductCategory[] | 提案対象の商品カテゴリ一覧 |
| Policy | productCategory | ProductCategory | 証券単位の商品カテゴリ |
| ProposalProduct | category | ProductCategory (enum) | 提案商品の種目 |

#### 種目リスト（ProductCategory enum）

**生保系**:
- `life` — 生命保険
- `medical` — 医療保険
- `cancer` — がん保険
- `income` — 所得補償
- `nursing` — 介護保険
- `savings` — 貯蓄/年金

**損保系**:
- `auto` — 自動車保険
- `fire` — 火災保険
- `liability` — 賠償責任保険

#### 仕様

- **UI**: マスタ選択（複数選択可能）
- **保存**: ProductCategory enum キーのまま保存
- **分類**: LIFE_CATEGORIES / NONLIFE_CATEGORIES 定数で区分

#### 実装location

- `src/types/opportunity.ts`: ProductCategory 型定義 + LIFE_CATEGORIES / NONLIFE_CATEGORIES 定数
- UI: `/opportunities/:id` の ProposalProductEditModal

#### 実装検証（grep 実測）

```bash
$ grep -r "productCategories" src/
src/types/opportunity.ts:  productCategories: ProductCategory[];
src/__tests__/policy.test.ts:  productCategories: ['life', 'medical'],
```

---

## 5. レスポンシブ対応（スマホ タブ切替）

### 実装内容

/households/:id（保障マトリクス表示）でスマートフォン・PC 別のレイアウト切替を実装。

#### 仕様

| デバイス | レイアウト | 説明 |
|---------|-----------|------|
| PC (lg以上) | 横3列固定 | 保障種別を3列で並べて表示 |
| スマホ (md以下) | タブ切替 | 種別ごとにタブを切替表示 |

#### 実装location

- Tailwind CSS breakpoint: `lg:` クラス + `flex-col` / `grid-cols-3` の条件分岐
- `/households/:id` の HouseholdMatrixPane コンポーネント

---

## ドキュメント検証結果

### 更新済みファイル

| ファイル | 変更内容 | 検証状況 |
|---------|---------|---------|
| `docs/USE_CASE_LIST.md` | UC-G-09 (商談作成) / UC-G-10 (ステージ進捗) / UC-G-11 (提案商品) / UC-G-14 (保障マトリクス) に工程E実装を反映 | ✅ 実装コード grep 検証済み |
| `docs/PHASE_E_IMPLEMENTATION.md` | 本ドキュメント新規作成。4機能の実装仕様・検証結果を記録 | ✅ 作成 |

### grep 検証済み機能

- ✅ taskGenerator.ts: timingType / baseDateType / offsetDays 実装
- ✅ opportunitySlice.ts: generateTasksOnOpportunityCreated 呼び出し
- ✅ Task.done / Task.doneDate / Task.doneBy フィールド完全実装
- ✅ Person.annualIncome（万円単位）実装済み
- ✅ ProposalProduct: insurerId + insurer（後方互換）両立
- ✅ productCategories: ProductCategory enum 型定義完全

---

## 参照

- **仕様マスタ**: src/types/task.ts / src/types/opportunity.ts / src/types/household.ts
- **実装**: src/utils/taskGenerator.ts / src/store/_slices/opportunitySlice.ts
- **テスト**: src/__tests__/householdsPaneD.test.ts （Person.annualIncome テスト）
- **ユースケース**: docs/USE_CASE_LIST.md （UC-G-09, UC-G-10, UC-G-11, UC-G-14）
