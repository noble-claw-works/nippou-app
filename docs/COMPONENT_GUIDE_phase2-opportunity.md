## Phase 2: 商談案件関連コンポーネント (97cabc9 2026-06-09)

---

## StageBadge (`src/components/opportunity/StageBadge.tsx`)

**役割**: 商談案件のステージを色・絵文字付きのバッジとして表示する。

### Props

```typescript
interface Props {
  stage: OpportunityStage;
  size?: 'sm' | 'md' | 'lg';   // デフォルト: 'md'
  showEmoji?: boolean;         // デフォルト: true
}
```

### ステージ別色・絵文字対応表 (STAGE_META)

| ステージ | ラベル | 絵文字 | Tailwind色クラス |
|---|---|---|---|
| `approach` | アプローチ | 🌱 | `bg-gray-100 text-gray-700` |
| `fact_finding` | ヒアリング | 🔍 | `bg-blue-100 text-blue-700` |
| `needs_analysis` | ニーズ分析 | 📊 | `bg-indigo-100 text-indigo-700` |
| `proposal` | 設計書提示 | 📄 | `bg-purple-100 text-purple-700` |
| `negotiation` | 検討中 | 💬 | `bg-yellow-100 text-yellow-700` |
| `application` | 申込書記入 | ✍️ | `bg-orange-100 text-orange-700` |
| `underwriting` | 査定中 | 🏥 | `bg-pink-100 text-pink-700` |
| `issued` | 証券発行 | 🎉 | `bg-green-100 text-green-700` |
| `lost` | 失注 | ❌ | `bg-red-100 text-red-600` |

### サイズ別 CSS

| size | CSS クラス |
|---|---|
| `sm` | `text-xs px-1.5 py-0.5` |
| `md` | `text-sm px-2 py-0.5` |
| `lg` | `text-base px-3 py-1` |

### 使用例

```tsx
// 標準表示
<StageBadge stage="proposal" />

// 小さめ、絵文字なし
<StageBadge stage="issued" size="sm" showEmoji={false} />

// 大きめ
<StageBadge stage="lost" size="lg" />
```

---

## StageSelector (`src/components/opportunity/StageSelector.tsx`)

**役割**: 商談案件のステージを変更するインライン UI。`changeOpportunityStage()` を内部で呼び出す。

### Props

```typescript
interface Props {
  opportunity: Opportunity;  // 変更対象の案件
  onClose?: () => void;      // キャンセル・保存後に呼ばれる
  compact?: boolean;         // true 時はパディング・ボーダーなしのコンパクト表示
}
```

### 主要振る舞い

- 選択ダウンで全 9 ステージを表示（絵文字 + ラベル）
- `stage === 'lost'` 選択時は LostReason セレクトボックス（必須）+ 詳細ブランク（任意）を追加展開
- `stage === 'issued'` または `stage === 'lost'` 時は変更メモ入力欄を非表示（終端ステージはメモ不要）
- 「ステージを更新」ボタン:
  - 変更なし: `disabled` + ラベル「変更なし」
  - 失注遷移: `bg-red-500`
  - 受注遷移: `bg-green-500`
  - その他: `bg-blue-500`

### 使用例

```tsx
// OpportunityDetailPage 内でインライン展開
{editingStage && (
  <StageSelector
    opportunity={opp}
    onClose={() => setEditingStage(false)}
  />
)}

// BlockModal 内でコンパクト表示
<StageSelector
  opportunity={selectedOpportunity}
  compact={true}
  onClose={() => setShowStageSelector(false)}
/>
```

---

## OpportunityCombobox (`src/components/opportunity/OpportunityCombobox.tsx`)

**役割**: 商談案件を検索・選択するコンボボックス。BlockModal 内で使用。

### Props

```typescript
interface Props {
  householdId?: string;         // 指定時はその世帯の案件のみ表示
  value?: string;               // 選択中の Opportunity.id
  onChange: (id: string | undefined) => void;
  onCreateNew?: (householdId: string) => void;  // 新規作成コールバック
  placeholder?: string;
}
```

### 主要振る舞い

- `householdId` が指定された場合、その世帯の商談案件のみを表示
- マウスアウトまたは Escape でドロップダウンを閉じる
- 「新規案件を作成」オプション: `onCreateNew` が指定された場合は `QuickOpportunityModal` へ。
- ステージとカテゴリををサブテキストで表示

### 使用例

```tsx
// BlockModal 内
<OpportunityCombobox
  householdId={state.block.customerId}
  value={state.block.opportunityId}
  onChange={opportunityId => {
    onChange(s => ({ ...s, block: { ...s.block, opportunityId } }));
    setShowStageSelector(false);
  }}
/>
```

---

## QuickOpportunityModal (`src/components/opportunity/QuickOpportunityModal.tsx`)

**役割**: 簡易な商談案件作成モーダル。`OpportunityCombobox` および `OpportunitiesPage` から呼び出される。

### Props

```typescript
interface Props {
  householdId: string;                     // 作成先世帯
  householdName: string;                   // モーダルヘッダーに表示
  onCreated: (opportunityId: string) => void;  // 作成後に呼ばれる
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 |
|---|---|---|
| 案件名 | テキスト入力 | ✅ |
| 初期ステージ | セレクトボックス | — (approach – negotiation の 4 ステージのみ) |
| 検討カテゴリ | チェックボックス (10 種) | — |
| メモ | テキストエリア | — |

### 主要振る舞い

- 案件名必須バリデーション（空文字列で保存不可）
- 保存: `addOpportunity()` を呼び出し、作成された案件の ID を `onCreated` で返す
- `status: 'open'` / `needsAnalysisDone: false` / `illustrationProvided: false` は自動設定

### 使用例

```tsx
// OpportunitiesPage から
<QuickOpportunityModal
  householdId="c1"
  householdName="KOORO GILSON"
  onCreated={(id) => navigate(`/opportunities/${id}`)}
  onClose={() => setShowQuickAdd(false)}
/>
```

---

## ProposalProductEditModal (`src/components/opportunity/ProposalProductEditModal.tsx`)

**役割**: `ProposalProduct`（提案商品）の追加・編集モーダル。`OpportunityDetailPage` の「提案商品」タブから呼び出される。

### Props

```typescript
interface Props {
  product?: ProposalProduct | null;  // null/undefined = 新規追加モード
  persons: Person[];                  // 被保険者選択用世帯員一覧
  onSave: (product: ProposalProduct) => void;
  onClose: () => void;
}
```

### フォーム構成

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 商品カテゴリ | セレクトボックス | ✅ | 10 カテゴリ |
| 商品名 | テキスト | ✅ | |
| 保険会社 | テキスト | ✅ | |
| 被保険者 | セレクト（`persons` から） | ✅ | |
| 月払額 | 数値 | ✅ | 円 |
| 保険金額 | 数値 | — | 円 |
| メモ | テキスト | — | |

### 主要振る舞い

- 新規追加時は `uid()` で新規 ID を生成
- 編集時は既存 `product.id` を維持
- 保存後、`totalMonthlyPremium` の再計算は 呼び元 (`OpportunityDetailPage`) で実施

### 使用例

```tsx
// 新規追加
<ProposalProductEditModal
  product={null}
  persons={getPersonsByHousehold(opp.householdId)}
  onSave={(p) => handleSaveProduct(p)}
  onClose={() => setEditProduct(undefined)}
/>

// 編集
<ProposalProductEditModal
  product={existingProduct}
  persons={persons}
  onSave={(p) => handleSaveProduct(p)}
  onClose={() => setEditProduct(undefined)}
/>
```

---

