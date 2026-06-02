# データモデル仕様

## 概要

nippou-app は LocalStorage ベースの Zustand Store でデータを管理します。
外部 API 通信は一切ありません。

---

## コアエンティティ

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
  mainTheme: string;
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

  // タイムスタンプ
  submittedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

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

日報に紐づくタスク。

```typescript
interface Todo {
  id: string;
  reportId: string;
  text: string;
  completed: boolean;
  rolledOver: boolean;  // 前日から持ち越し
  dueDate?: string;
}
```

---

## ステータス遷移

### 過移図

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
| 実績化ボタン | ❌ | ✅ | ❌ | ❌ |
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
