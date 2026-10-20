## Phase 3: 保険契約関連コンポーネント (97cf2b1 2026-06-09)

---

## PolicyStatusBadge (`src/components/policy/PolicyStatusBadge.tsx`)

**役割**: 保険契約のステータスを色・絵文字付きのバッジとして表示する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  status: PolicyStatus;
  size?: 'sm' | 'md' | 'lg';  // デフォルト: 'md'
}
```

### ステータス別色・絵文字対応表 (STATUS_META)

| ステータス | ラベル | 絵文字 | Tailwind 色クラス |
|---|---|---|---|
| `inforce` | 有効中 | ✅ | `bg-green-100 text-green-800 border-green-200` |
| `pending` | 申込中 | ⏳ | `bg-yellow-100 text-yellow-800 border-yellow-200` |
| `lapsed` | 失効 | ⚠️ | `bg-orange-100 text-orange-800 border-orange-200` |
| `surrendered` | 解約 | ❌ | `bg-red-100 text-red-700 border-red-200` |
| `matured` | 満期 | 🎉 | `bg-blue-100 text-blue-800 border-blue-200` |
| `paid_up` | 払済 | 💰 | `bg-purple-100 text-purple-800 border-purple-200` |
| `reduced` | 減額 | 📉 | `bg-gray-100 text-gray-700 border-gray-200` |

### サイズ別 CSS

| size | CSS クラス |
|---|---|
| `sm` | `text-[10px] px-1.5 py-0.5` |
| `md` | `text-xs px-2 py-0.5` |
| `lg` | `text-sm px-3 py-1` |

### 使用例

```tsx
// 標準表示
<PolicyStatusBadge status="inforce" />

// 小さめ
<PolicyStatusBadge status="pending" size="sm" />

// 大め
<PolicyStatusBadge status="surrendered" size="lg" />
```

---

## CoverageMatrix (`src/components/policy/CoverageMatrix.tsx`)

**役割**: 世帯内の全世帯員 × 保障種別の 2 次元マトリクスを表示する。保障漏れを赤バッジで警告する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  householdId: string;   // 表示対象世帯の ID
  compact?: boolean;     // true 時は主要 6 種のみ表示（デフォルト: false）
}
```

### 列構成

| モード | 表示列 | 用途 |
|---|---|---|
| `compact=false`（デフォルト） | 全 12 種 | PoliciesPage や大画面表示 |
| `compact=true` | 死亡 / 入院 / がん / 就業不能 / 介護 / 貯蓄（6 種） | HouseholdDetailPage の小画面 |

### 主要振る舞い

- `getCoverageMatrix(householdId)` Store アクションでデータ取得
- 行 = 世帯員（Person）、列 = 保障種別（CoverageType）
- **保障あり**: 保険金額を非円展示（例: `3000万`）
- **保障なし**: `-` を表示（`text-gray-300`）
- **世帯主に死亡保障なし**: テーブル上部に赤警告バナー表示 (`⚠️ 世帯主 「<名前>」 に死亡保障がありません`)
- **世帯員データなし**: 「世帯員データがありません」空状態表示

### 使用例

```tsx
// HouseholdDetailPage 内（コンパクトモード）
<CoverageMatrix householdId={household.id} compact={true} />

// 大画面（フル表示）
<CoverageMatrix householdId={household.id} />
```

---

## PolicyEditModal (`src/components/policy/PolicyEditModal.tsx`)

**役割**: 保険契約の新規追加・編集モーダル。`PoliciesPage` および `PolicyDetailPage` から呼び出される。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  householdId: string;  // 所属世帯 ID
  policy?: Policy;      // 未指定の場合は新規追加モード
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 商品カテゴリ | `<select>` | ✅ | 10 カテゴリ |
| 商品名 | テキスト | ✅ | |
| 保険会社 | テキスト | ✅ | |
| 契約者 | `<select>`（`persons` から） | ✅ | `Person.name` 一覧 |
| 被保険者 | チェックボックス一覧 | ✅ | 複数選択可 |
| ステータス | `<select>` | ✅ | 7 種 |
| 契約日 | `<input type="date">` | ✅ | YYYY-MM-DD |
| 満期日 | `<input type="date">` | — | |
| 月払保険料 | 数値 | ✅ | 円 |
| 払込方法 | `<select>` | ✅ | monthly / semi_annual / annual / lump_sum |
| 証券番号 | テキスト | — | |
| 解約返戻金あり | チェックボックス | — | |
| メモ | `<textarea>` | — | |

### 使用例

```tsx
// 新規追加
<PolicyEditModal
  householdId="c1"
  onClose={() => setShowAdd(false)}
/>

// 編集
<PolicyEditModal
  householdId="c1"
  policy={existingPolicy}
  onClose={() => setShowEdit(false)}
/>
```

---

## CoverageEditModal (`src/components/policy/CoverageEditModal.tsx`)

**役割**: Coverage（保障内容）の追加・編集モーダル。`PolicyDetailPage` の「保障内容」タブから呼び出される。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  policyId: string;          // 所属 Policy.id
  insuredPersonIds: string[]; // 被保険者候補一覧（Policy.insuredPersonIds）
  householdId: string;        // 世帯 ID（persons 取得用）
  coverage?: Coverage;        // 未指定の場合は新規追加モード
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 保障種別 | `<select>` | ✅ | 12 種の `CoverageType` |
| ラベル | テキスト | ✅ | 表示名（例: 「死亡保険金」） |
| 被保険者 | `<select>` | ✅ | `insuredPersonIds` + `householdId` の全世帯員から選択 |
| 主契約/特約 | チェックボックス | — | `isMain` |
| 保険金額 | 数値 | — | 円（`faceAmount`） |
| 沼ぎ払・日額 | 数値 | — | 円/日/回（`unitAmount` + `unit`） |
| 特約名 | テキスト | — | `riderName` |
| 保険期間（年） | 数値 | — | `termYears` |
| メモ | `<textarea>` | — | |

### 使用例

```tsx
// 新規追加
<CoverageEditModal
  policyId={policy.id}
  insuredPersonIds={policy.insuredPersonIds}
  householdId={policy.householdId}
  onClose={() => setShowAddCoverage(false)}
/>

// 編集
<CoverageEditModal
  policyId={policy.id}
  insuredPersonIds={policy.insuredPersonIds}
  householdId={policy.householdId}
  coverage={editingCoverage}
  onClose={() => setEditCoverageId(null)}
/>
```

---

## QuickPolicyIssueModal (`src/components/policy/QuickPolicyIssueModal.tsx`)

**役割**: `issuePoliciesFromOpportunity` を UI から呼び出すための 2 ステップモーダル。「確認」 → 「完了」の UI フローを提供する。

**追加コミット**: `97cf2b1` (2026-06-09)

### Props

```typescript
interface Props {
  opportunity: Opportunity;                   // 発行元 Opportunity
  onClose: () => void;
  onIssued?: (policyIds: string[]) => void;   // 発行完了コールバック
}
```

### 2 ステップフロー

| ステップ | 内容 |
|---|---|
| `confirm` | `ProposalProducts` 一覧表示 + 「発行する」ボタン |
| `done` | 発行完了時: 発行済み Policy ID 一覧 + 「契約を確認」リンク |

### 主要振る舞い

- `ProposalProducts` がゼロの場合は「提案商品がありません」エラー toast を表示し終了
- `issuePoliciesFromOpportunity(opportunity.id, currentUserId)` を呼び出し、`Policy[]` を取得
- 発行後: Opportunity の `stage` が `issued`、`status` が `won` に自動遷移（store 内部）
- 発行成功: 「○件の契約を発行しました (ステータス: 申込中)」 toast 表示

### 使用例

```tsx
// OpportunityDetailPage 内
{showIssueModal && (
  <QuickPolicyIssueModal
    opportunity={opportunity}
    onClose={() => setShowIssueModal(false)}
    onIssued={(policyIds) => navigate(`/policies/${policyIds[0]}`)}
  />
)}
```

---

## 工程H追補改修ノート — RenewalListPage / RenewalDetailPage / ConsultTab / PolicyCollectTab (2026-10-20 e4664a4)

### RenewalListPage — フィルタ機能追加

**ファイル**: `src/pages/RenewalListPage.tsx`

**変更**: 損保更新一覧にフィルタUIパネルを追加。

| フィルタ種別 | 選択肢 | 備考 |
|---|---|---|
| 期間 | 60日以内 / 期限切れ / 全て | ラジオボタン式 |
| 状況 | 核心な定義値リスト | ドロップダウン |
| 種目 | 種目名リスト | ドロップダウン |
| 担当者 | 活動ユーザーリスト | ドロップダウン |

- フィルタ状態は `useState` で管理、全てクライアントサイドフィルタリング
- 60日以内: `dueDate` が今日から+60日以内のレコードのみ表示
- 期限切れ: `dueDate` が今日未満のレコードのみ表示

### RenewalDetailPage — 3列レイアウト化 / タスクタブ廃止

**ファイル**: `src/pages/RenewalDetailPage.tsx`

**変更**: 損保更新詳細ページを「詳細＋タスク＋履歴」3列構造に変更。

| 列 | 役割 | 幅 |
|---|---|---|
| 左 | 本文（基本情報・各タブコンテンツ） | 可変（`flex-1`） |
| 中 | タスクaside | `w-72` (固定) |
| 右 | 対応履歴aside | `w-80` (固定) |

- `lg:flex lg:gap-4` でラップ; lg未満は `lg:hidden` で中・右列を折りたたみ
- 「タスク」タブを廃止しタスクは中央asideへ移動

### ConsultTab — 重複ブロック削除

**ファイル**: `src/pages/RenewalDetailPage/ConsultTab.tsx`

**変更**: 「接触記録（時系列）」セクションの重複ブロックを削除。詳細:
- 削除前: 同内容のセクションが2箇所存在していた
- 削除後: 「接触記録（時系列）」は1箇所のみ表示
- ConsultTabエリアA（コンタクト履歴）の行追加/削除機能に変更なし

### PolicyCollectTab — 状態選択ラジオボタン化

**ファイル**: `src/pages/RenewalDetailPage/PolicyCollectTab.tsx`

**変更**: 状態選択UIを「編集時はラジオボタン・非編集時はラベル表示」に変更。

| 状態 | `isEditing=false` | `isEditing=true` |
|---|---|---|
| 状態選択 | ラベル表示（テキスト） | ラジオボタングループ |

- 「編集」ボタン→各フィールドが入力可能化（ラジオ含む）→「保存」ボタンで確定のフローは変更なし
- 未編集時にラジオボタンをクリックしても値は変更されない

