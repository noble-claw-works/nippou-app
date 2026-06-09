# 保険営業ドメイン フェーズロードマップ

## 概要

305-hrl-nippou-app を保険営業の業務フローに特化させるための段階的な機能拡張計画。
各フェーズは独立したコミット群で完結し、前フェーズの実装を前提とする。

---

## Phase 1: 世帯モデル基盤 ✅ 完了 (2026-06-09 `6db6e91`)

### 目的

「顧客」から「世帯」への概念移行。保険営業では個人ではなく世帯単位で契約・訪問を管理する。
世帯員（Person）を管理することで、家族全員の保険ニーズを把握できるようにする。

### 主要型

```typescript
interface Household {          // 旧 Customer の発展形
  id: string;
  name: string;
  type: HouseholdType;         // 'individual' | 'corporate' | 'prospect'
  headPersonId?: string;       // 世帯主 Person.id
  familyMemo: string;          // 家族構成メモ
  // ... (旧 Customer フィールドを継承)
}

type Customer = Household;     // 互換エイリアス (deprecated 予告)

interface Person {             // 世帯員
  id: string;
  householdId: string;
  name: string;
  kana?: string;
  relation: PersonRelation;    // 'head' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
  birthDate?: string;
  gender?: PersonGender;
  occupation?: string;
  smoker?: boolean;
  healthNotes?: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}
```

### Store アクション

| アクション | 説明 |
|---|---|
| `addPerson(householdId, partial)` | 世帯員追加 |
| `updatePerson(personId, patch)` | 世帯員更新 |
| `deletePerson(personId)` | 世帯員削除（世帯主削除時は自動繰り上げ） |
| `getPersonsByHousehold(householdId)` | 世帯員一覧取得 |

### UI

- `/households` — 世帯一覧（世帯員数バッジ付き）
- `/households/:id` — 世帯詳細（👨‍👩‍👧 世帯員セクション + PersonEditModal）
- `/customers` → `/households` リダイレクト（後方互換）
- サイドバー「顧客」→「世帯」ラベル変更

### Seed

- PERSONS: c1〜c10 世帯主 + 家族 合計 18 件

### 依存関係

- なし（ベースライン実装）

---

## Phase 2: Opportunity（案件管理）+ Today 連携 — 予定

### 目的

保険営業の「案件」（Opportunity）を管理し、提案〜成約に向けたパイプラインを構築する。
Today ページのタイムブロックと連動させ、訪問 visit ブロックと案件を自動紐付けする。

### 主要型

```typescript
type OpportunityStage =
  | 'lead'           // 見込み創出
  | 'needs_analysis' // ニーズ確認
  | 'proposal'       // 提案中
  | 'negotiation'    // 交渉中
  | 'underwriting'   // 引受審査
  | 'closed_won'     // 成約
  | 'closed_lost'    // 失注
  | 'on_hold';       // 保留

interface Opportunity {
  id: string;
  householdId: string;       // 対象世帯
  personId?: string;         // 主な対象 Person（任意）
  productType: string;       // 保険種別（生命・医療・自動車 等）
  stage: OpportunityStage;   // 8 ステージ
  estimatedPremium?: number; // 見込み保険料（円）
  closeDate?: string;        // 見込みクローズ日 (YYYY-MM-DD)
  memo: string;
  createdAt: string;
  updatedAt: string;
}
```

### Store アクション（予定）

| アクション | 説明 |
|---|---|
| `addOpportunity(householdId, partial)` | 案件追加 |
| `updateOpportunity(opportunityId, patch)` | 案件更新（ステージ変更含む） |
| `deleteOpportunity(opportunityId)` | 案件削除 |
| `getOpportunitiesByHousehold(householdId)` | 世帯の案件一覧取得 |

### UI（予定）

- `HouseholdDetailPage` に「📋 案件」セクション追加
- Today ページの visit ブロックに案件紐付けフィールド追加
- 案件一覧ページ（`/opportunities`）または Dashboard 内案件ウィジェット

### Today 連携

- visit ブロック保存時に `opportunityId?` を指定可能
- 訪問後の案件ステージ変更を visit ブロックから直接操作

### 依存関係

- Phase 1（世帯 + Person）

---

## Phase 3: Policy / Coverage（契約管理）— 予定

### 目的

実際に成約した保険契約（Policy）と補償内容（Coverage）を管理する。
Opportunity が `closed_won` になると Policy に昇格する設計。

### 主要型

```typescript
interface Policy {
  id: string;
  householdId: string;
  personId?: string;           // 被保険者 Person
  opportunityId?: string;      // 元となった案件
  policyNumber: string;        // 証券番号
  insurer: string;             // 保険会社名
  productName: string;         // 商品名
  premiumAnnual: number;       // 年間保険料（円）
  startDate: string;           // 保険期間開始 (YYYY-MM-DD)
  endDate?: string;            // 保険期間終了 (YYYY-MM-DD)
  renewalDate?: string;        // 次回更新日 (YYYY-MM-DD)
  status: 'active' | 'expired' | 'cancelled';
  memo: string;
  createdAt: string;
  updatedAt: string;
}

interface Coverage {
  id: string;
  policyId: string;            // 所属 Policy
  type: string;                // 補償種別（死亡・入院・車両 等）
  amount: number;              // 補償金額（円）
  deductible?: number;         // 免責金額（円）
  memo: string;
}
```

### UI（予定）

- `HouseholdDetailPage` に「🗂 契約」セクション追加
- 更新日アラート（renewalDate が近い契約を Today/Dashboard でハイライト）
- 証券番号検索

### 依存関係

- Phase 1（世帯 + Person）
- Phase 2（Opportunity）推奨（なくても実装可）

---

## Phase 4: カンバン UI + Dashboard パイプライン — 予定

### 目的

案件（Opportunity）の進捗を視覚的に把握するカンバンボードを提供する。
Dashboard に営業パイプライン全体のサマリーを追加する。

### UI（予定）

#### カンバンボード（`/pipeline`）

- 8 ステージを列として横並びに表示
- 各カード: 世帯名 / Person 名 / 保険種別 / 見込み保険料 / クローズ日
- ドラッグ&ドロップでステージ移動（既存 TimelinePanel の D&D 実装を流用）
- 列ごとの合計見込み保険料を表示

#### Dashboard パイプラインウィジェット

- ファネル形式で各ステージの件数・合計金額を表示
- `closed_won` の月次累計をメトリクスカードに追加
- 前月比較

### 依存関係

- Phase 2（Opportunity + ステージ）

---

## Phase 5: 引受査定統合 — 予定

### 目的

引受査定（Underwriting）プロセスを支援する機能を追加する。
Person の健康情報（healthNotes / smoker / birthDate）を査定補助情報として活用する。

### 主要型（予定）

```typescript
interface UnderwritingRequest {
  id: string;
  opportunityId: string;
  personId: string;            // 被保険者
  requestDate: string;         // 査定依頼日
  decision?: 'approved' | 'conditional' | 'declined';
  conditions?: string;         // 条件付き承認の条件内容
  declinedReason?: string;     // 謝絶理由
  resolvedDate?: string;       // 査定結果日
  memo: string;
}
```

### UI（予定）

- Opportunity の `underwriting` ステージ時に査定依頼フォームを追加
- Person カードに「⚕ 査定情報」セクション追加（healthNotes の構造化）
- Dashboard に「査定中件数」メトリクスを追加

### 依存関係

- Phase 1（Person の健康情報）
- Phase 2（Opportunity + underwriting ステージ）
- Phase 3（Policy への昇格フロー）

---

## フェーズ依存関係図

```
Phase 1: 世帯 + Person (基盤) ✅
    │
    ├── Phase 2: Opportunity + Today 連携
    │       │
    │       ├── Phase 3: Policy / Coverage
    │       │
    │       └── Phase 4: カンバン UI + Dashboard パイプライン
    │               │
    │               └── Phase 5: 引受査定統合 (1+2+3+4 依存)
    └── Phase 3: Policy / Coverage (Phase 2 なしでも可)
```

---

## 改修履歴

- **2026-06-09**: `PHASE_ROADMAP.md` 新設 — Phase 1 完了に合わせて Phase 1-5 のロードマップを策定
