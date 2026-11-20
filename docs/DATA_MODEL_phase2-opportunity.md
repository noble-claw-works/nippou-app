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

