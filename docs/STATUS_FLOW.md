# 日報ステータス遷移仕様

## ステータス一覧

| ステータス | 表示名 | 説明 |
|---|---|---|
| `planning` | 予定入力中 | 日報作成直後。予定ブロックのみ入力可 |
| `in_progress` | 実績入力中 | 予定確定後。予定・実績どちらも入力可 |
| `submitted` | 提出済み | 提出後。変更不可・未承認なら取り下げ可 |
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
| 取り下げ | — | — | ✅（未承認のみ） | ❌ |

## 差し戻しの扱い

上長による差し戻しは「取り下げ」と同動作（`submitted → in_progress`）。
担当者は実績を修正し、再度「提出する」で再提出できる。

## 実装ファイル

- `src/types/index.ts` — `ReportStatus` 型定義
- `src/store/index.ts` — `confirmPlanning` / `submitReport` / `withdrawReport` / `confirmReport`
- `src/pages/TodayPage.tsx` — ブロック操作ガード (`canEditPlanned` / `canEditActual` / `isReadOnly`)
- `src/components/today/StatusBar.tsx` — ステップインジケーター + ステータス別ボタン
- `src/components/ui/StatusBadge.tsx` — ステータスバッジ表示
