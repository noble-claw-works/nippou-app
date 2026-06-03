# 日報ステータス遷移仕様

## ステータス一覧

| ステータス | 表示名 | 説明 |
|---|---|---|
| `planning` | 予定入力中 | 日報作成直後。予定ブロックのみ入力可 |
| `in_progress` | 実績入力中 | 予定確定後。予定・実績どちらも入力可 |
| `submitted` | 提出済み | 提出後。変更不可・未承認なら取り下げ可。上長コメント表示 |
| `confirmed` | 承認済み | 上長承認後。完全読み取り専用 |

## 遷移図

```
planning ──[予定を確定する]──→ in_progress ──[提出する]──→ submitted
                                    ↑                        ↓
                                    └──[取り下げ / 差し戻し]──┘
                                                              ↓ 上長承認
                                                          confirmed
```

## 操作制限

| 操作 | planning | in_progress | submitted | confirmed |
|---|---|---|---|---|
| 予定ブロック 追加/編集/削除 | ✅ | ✅ | ❌ | ❌ |
| 実績ブロック 追加/編集/削除 | ❌ | ✅ | ❌ | ❌ |
| テーマ/感謝/振り返り編集 | ✅ | ✅ | ❌ | ❌ |
| 実績化ボタン | ❌ | ✅ | ❌ | ❌ |
| お褒め記録（追加・削除） | ✅ | ✅ | ❌ | ❌ |
| 上長コメント表示 | ❌ | ❌ | ✅ | ✅ |
| 上長コメント返答 | ❌ | ❌ | ✅ | ✅ |
| 取り下げ | — | — | ✅（未承認時のみ） | ❌ |

## 提出フロー

### submitted フラグと status の関係

| 操作 | status 遷移 | submitted 変化 | submittedAt |
|---|---|---|---|
| `confirmPlanning()` | `planning` → `in_progress` | — | — |
| `submitReport()` | `in_progress` → `submitted` | `false` → `true` | セット（現在時刻） |
| `withdrawReport()` | `submitted` → `in_progress` | `true` → `false` | クリア |
| `confirmReport()` | `submitted` → `confirmed` | 変化なし（true 維持） | 変化なし |

**重要**: `submitted` フラグと `status='submitted'` は常に同期している。
実装の都合上、いずれかで「提出済みか」を判定できる。

## 差し戻しの扱い

上長による差し戻しは「取り下げ」と同動作（`submitted → in_progress` + `submitted=false`）。
担当者は実績を修正し、再度「提出する」で再提出できます。

## 実装ファイル

- `src/types/index.ts` — `ReportStatus` / `DailyReport.submitted` 型定義
- `src/store/index.ts` — `confirmPlanning` / `submitReport` / `withdrawReport` / `confirmReport`
- `src/pages/TodayPage.tsx` — ブロック操作ガード (`canEditPlanned` / `canEditActual` / `isReadOnly`)
- `src/components/today/StatusBar.tsx` — ステップインジケーター + ステータス別ボタン
- `src/components/ui/StatusBadge.tsx` — ステータスバッジ表示

## 上長コメント・返答フロー

- **表示タイミング**: `status='submitted'` または `status='confirmed'` の時のみ表示
- **コメント入力**: 上長ロール（manager/executive/admin）が `submitted` 日報にコメント追加
- **部下の返答**: `reply-to-comment` ボタンで ✅YES（了承）/ ❌NO（要相談）を選択
- **返答の永続性**: 一度返答すると、返答ステータス + 日時が表示され、ボタンは非活性化

---

## 改修履歴

- **2026-06-03**: 上長コメント・お褒め記録機能追加対応、submitted フラグの関係を明記
