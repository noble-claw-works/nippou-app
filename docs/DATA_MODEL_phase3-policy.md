## 保険営業ドメイン Phase 3: 保険契約管理 ✅ 完了 (2026-06-09 `97cf2b1`)

**コミット**: `97cf2b1 feat(policy): Phase 3 — 保険契約 (Policy) + 保障 (Coverage) 管理 + Opportunity→Policy 自動発行 + 世帯保障マトリクス`

成約した保険契約（`Policy`）と補償内容（`Coverage`）を世帯・世帯員単位で管理する。
Opportunity が `issued` になると `issuePoliciesFromOpportunity` で Policy に自動昇格する設計。
契約は必ず `Household`（世帯）に紐付き、契約者・被保険者はすべて `Person`（世帯員）として管理する。

### Policy 型（保険契約）

```typescript
export type PolicyStatus =
  | 'inforce'       // 有効中
  | 'lapsed'        // 失効
  | 'surrendered'   // 解約
  | 'matured'       // 満期
  | 'paid_up'       // 払済
  | 'reduced'       // 減額
  | 'pending';      // 申込中

export type PayMode = 'monthly' | 'semi_annual' | 'annual' | 'lump_sum';

export interface Policy {
  id: string;
  policyNumber?: string;             // 証券番号（activatePolicy 時に設定）
  householdId: string;               // 所属世帯（Household.id）— 必須
  ownerId: string;                   // 担当者 userId
  contractorPersonId: string;        // 契約者 Person.id
  insuredPersonIds: string[];        // 被保険者 Person.id[]
  insurer: string;                   // 保険会社名
  productName: string;               // 商品名
  productCategory: ProductCategory;  // 10 カテゴリ
  status: PolicyStatus;              // 7 ステータス
  startDate: string;                 // 保険期間開始（YYYY-MM-DD）
  maturityDate?: string;             // 満期日（YYYY-MM-DD）
  surrenderDate?: string;            // 解約日（YYYY-MM-DD）
  monthlyPremium: number;            // 月払保険料（円）
  annualPremium?: number;            // 年払保険料（円）
  payMode: PayMode;                  // 払込方法
  payerPersonId?: string;            // 保険料支払者 Person.id
  premiumPaidUntil?: string;         // 払込満了日（YYYY-MM-DD）
  payPeriodYears?: number;           // 払込期間（年）
  hasCashValue: boolean;             // 解約返戻金あり
  cashValue?: number;                // 解約返戻金（円）
  sourceOpportunityId?: string;      // 発行元 Opportunity.id（系譜追跡キー）
  coverages: Coverage[];             // 保障内容一覧（embedded）
  renewalDate?: string;              // 次回更新日（YYYY-MM-DD）
  renewalReminderSent?: boolean;     // 更新リマインダー送信済
  tags: string[];
  memo: string;
  createdAt: string;                 // ISO 8601
  updatedAt: string;                 // ISO 8601
}
```

**Household との関係**: Policy は必ず `householdId` で `Household` に紐付く。契約者 (`contractorPersonId`) および被保険者 (`insuredPersonIds`) はすべてその Household に所属する `Person` の id を参照する。

**Opportunity → Policy 系譜**: `sourceOpportunityId` により Policy が「どの商談案件から発行されたか」を追跡できる。この連携は `issuePoliciesFromOpportunity` により自動設定される。

---

### PolicyStatus — 7 種ステータス

| 値 | ラベル | 説明 |
|---|---|---|
| `pending` | 申込中 | 申込後・査定・承認待ち |
| `inforce` | 有効中 | 保険料払込中・保障有効（`activatePolicy` で移行）|
| `lapsed` | 失効 | 保険料未払いによる失効 |
| `surrendered` | 解約 | 契約者都合による解約 |
| `matured` | 満期 | 保険期間終了による満了 |
| `paid_up` | 払済 | 払済保険に変換済み |
| `reduced` | 減額 | 保険金額を減額した状態 |

**ステータス遷移**:
```
pending ──[activatePolicy]──→ inforce
inforce ──[changePolicyStatus]──→ lapsed | surrendered | matured | paid_up | reduced
```

---

### PayMode — 4 種払込方法

| 値 | ラベル |
|---|---|
| `monthly` | 月払 |
| `semi_annual` | 半年払 |
| `annual` | 年払 |
| `lump_sum` | 一括払 |

---

### Coverage 型（保障内容）

```typescript
export type CoverageType =
  | 'death'             // 死亡
  | 'living_benefit'    // 生前給付
  | 'medical_hospital'  // 入院
  | 'medical_surgery'   // 手術
  | 'cancer'            // がん
  | 'critical_illness'  // 三大疾病
  | 'disability'        // 就業不能
  | 'nursing'           // 介護
  | 'savings'           // 貯蓄/年金
  | 'liability'         // 賠償
  | 'asset_damage'      // 物損
  | 'other';

export interface Coverage {
  id: string;
  policyId: string;              // 所属 Policy.id
  type: CoverageType;            // 保障種別（12 種）
  label: string;                 // 表示名
  faceAmount?: number;           // 保険金額（円）
  unitAmount?: number;           // 日額・1 回あたり金額（円）
  unit?: 'JPY' | 'day' | 'time'; // 単位
  insuredPersonId: string;       // 被保険者 Person.id
  beneficiaryPersonId?: string;  // 受取人 Person.id
  riderName?: string;            // 特約名（特約の場合）
  isMain: boolean;               // 主契約 (true) / 特約 (false)
  termYears?: number;            // 保険期間（年）
  memo: string;
}
```

**CoverageType 一覧**:

| 値 | ラベル | 区分 |
|---|---|---|
| `death` | 死亡 | 主契約 |
| `living_benefit` | 生前給付 | 主契約 / 特約 |
| `medical_hospital` | 入院 | 主契約 / 特約 |
| `medical_surgery` | 手術 | 主契約 / 特約 |
| `cancer` | がん | 主契約 |
| `critical_illness` | 三大疾病 | 主契約 / 特約 |
| `disability` | 就業不能 | 主契約 / 特約 |
| `nursing` | 介護 | 主契約 |
| `savings` | 貯蓄/年金 | 主契約 |
| `liability` | 賠償 | 主契約 |
| `asset_damage` | 物損 | 主契約 |
| `other` | その他 | 主契約 / 特約 |

---

### PolicyStatusHistory 型

```typescript
export interface PolicyStatusHistory {
  id: string;
  policyId: string;          // 対象 Policy.id
  status: PolicyStatus;      // 変更後ステータス
  changedAt: string;         // ISO 8601
  changedByUserId: string;   // 操作者 userId
  note?: string;             // 変更メモ（任意）
}
```

ステータス変更のたびに `policyStatusHistory` 配列に新エントリが追記される。
`activatePolicy` 時は `note: '証券番号: <policyNumber>'` が自動設定される。

---

### Household / Person / Policy / Coverage のリレーション

```
Household (1)
  id: "c1"
      │
      ├── Person (N) [世帯員]
      │   { id: "p_c1_head",   relation: "head"   }  ← 契約者 / 被保険者
      │   { id: "p_c1_spouse", relation: "spouse" }
      │
      └── Policy (N) [保険契約]
          {
            id: "pol_1"
            householdId: "c1"                // 世帯への参照
            contractorPersonId: "p_c1_head"  // 契約者 Person
            insuredPersonIds: ["p_c1_head"]  // 被保険者 Person[]
            sourceOpportunityId: "opp7"      // 発行元 Opportunity（系譜）
            coverages: [ Coverage{...}, Coverage{...} ]  // 保障内容
          }
```

---

### Store Actions: Policy 操作

| アクション | 説明 |
|---|---|
| `addPolicy(partial)` | 契約追加（id / createdAt / updatedAt 自動付与）|
| `updatePolicy(id, patch)` | 契約部分更新（updatedAt 自動更新）|
| `deletePolicy(id)` | 契約削除（関連 PolicyStatusHistory も削除）|
| `addCoverage(policyId, partial)` | 保障内容追加（id / policyId 自動付与）|
| `updateCoverage(coverageId, patch)` | 保障内容更新 |
| `deleteCoverage(coverageId)` | 保障内容削除 |
| `issuePoliciesFromOpportunity(opportunityId, userId)` | Opportunity から Policy を自動発行（下記詳述）|
| `activatePolicy(policyId, policyNumber, startDate, userId)` | 申込中 → 有効中 に昇格（下記詳述）|
| `changePolicyStatus(id, newStatus, note?, userId?)` | ステータス変更 + 履歴追記 |
| `getPoliciesByHousehold(householdId, options?)` | 世帯 ID で契約一覧取得。`options.activeOnly=true` で inforce/pending のみ |
| `getPoliciesByPerson(personId, options?)` | Person ID（契約者・被保険者・Coverage 被保険者）で契約一覧取得 |
| `getCoverageMatrix(householdId)` | 世帯保障マトリクスを生成（下記詳述）|

#### `issuePoliciesFromOpportunity` の挙動

```
issuePoliciesFromOpportunity(opportunityId, userId)
```

1. `Opportunity.proposalProducts` の各 `ProposalProduct` から `Policy` を 1:1 で自動生成
2. 生成された Policy の初期値:
   - `status: 'pending'`（申込中）
   - `sourceOpportunityId: opportunityId`（Opportunity → Policy 系譜キー）
   - `payMode: 'monthly'`（デフォルト）
   - `hasCashValue: true`（`life` / `savings` / `nursing` カテゴリのみ）
3. `ProposalProduct.faceAmount` が設定されている場合、Coverage を 1 件自動生成
4. **Opportunity 側の自動遷移**:
   - `stage` を `'issued'` に変更
   - `status` を `'won'` に変更
   - `stageHistory` に `{ stage: 'issued', note: '契約発行' }` を追記
5. localStorage (`nippou.policies.v1` / `nippou.opportunities.v1`) に即座に永続化
6. 発行した `Policy[]` を返り値として返す

#### `activatePolicy` の挙動

```
activatePolicy(policyId, policyNumber, startDate, userId)
```

1. `Policy.status` を `'pending'` → `'inforce'` に変更
2. `Policy.policyNumber` と `Policy.startDate` を設定
3. `PolicyStatusHistory` に `{ status: 'inforce', note: '証券番号: <policyNumber>' }` を追記
4. localStorage に永続化

#### `getCoverageMatrix` の戻り値構造

```typescript
// 戻り値: 世帯員ごとの保障カバレッジ情報
Array<{
  personId: string;                        // Person.id
  coverageTypes: Set<CoverageType>;         // カバーされている保障種別
  totalFaceByType: Record<string, number>;  // 保障種別ごとの保険金額合計（円）
}>
```

- `inforce` / `pending` の契約のみ対象
- 被保険者の判定: `Policy.insuredPersonIds` への含有 or `Coverage.insuredPersonId` との一致

---

### Seed データ: POLICIES / COVERAGES

- **Policy**: 15 件（c1〜c10 世帯に分散、全 7 ステータスを網羅）
- **Coverage**: 25 件以上（各 Policy に 1〜3 件の Coverage）
- `sourceOpportunityId` 設定済みの Policy は Opportunity との系譜を確認可能

---

### LocalStorage: `nippou.policies.v1` / `nippou.policyHistory.v1`

```typescript
// 読み込み: store 初期化時
const rawPolicies = window.localStorage.getItem('nippou.policies.v1');
if (rawPolicies) return JSON.parse(rawPolicies) as Policy[];
// else フォールバック: POLICIES seed データ

const rawHistory = window.localStorage.getItem('nippou.policyHistory.v1');
if (rawHistory) return JSON.parse(rawHistory) as PolicyStatusHistory[];
// else フォールバック: 空配列

// 書き込み: addPolicy / updatePolicy / deletePolicy / issuePoliciesFromOpportunity /
//           activatePolicy / changePolicyStatus 時
window.localStorage.setItem('nippou.policies.v1', JSON.stringify(updated));
window.localStorage.setItem('nippou.policyHistory.v1', JSON.stringify(updatedHistory));
```

---

