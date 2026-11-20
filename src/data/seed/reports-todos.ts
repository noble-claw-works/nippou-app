// =====================================================
// シードデータ — 日報 Todo ヘルパー
// =====================================================
import type { Todo } from "../../types";
import {
  _lastWeekday,
  _oarDate2,
  _oarDate3,
  _recentWeekdays,
  d,
  f,
  makeTodo,
} from "./helpers";

export function getPastTodos(i: number, rid: string, date: string): Todo[] {
  return [
    // DEAD-1: 検証を確実にするため、全ての過去日報に dueDate 付き TODO を最低 1 件仕込む
    // i % 4 で見え方をバラつかせる:
    //   0: 完了 (期限切れでもバッジなし)
    //   1: 未完了 + 期限切れ (赤バッジ)
    //   2: 未完了 + dueDate 未設定 (バッジなし)
    //   3: 未完了 + 期限切れ高優先度 (赤バッジ + bold)
    makeTodo(
      `td_${rid}_1`,
      rid,
      "顧客フォロー",
      i % 4 === 0,
      i % 4 === 1 ? d(i - 1) : undefined,
      "medium",
    ),
    makeTodo(
      `td_${rid}_2`,
      rid,
      "見積提出",
      i % 4 === 2,
      i % 4 === 3 ? d(Math.max(1, i - 2)) : undefined,
      i % 4 === 3 ? "high" : "medium",
    ),
    // DEAD-1: 一部の過去日報に高優先度 期限切れ TODO
    ...(i % 5 === 0
      ? [
          makeTodo(
            `td_${rid}_3`,
            rid,
            "重要課題 (要フォロー)",
            false,
            d(Math.max(1, i - 3)),
            "high",
          ),
        ]
      : []),
    // ★ 案件結付 TODO — 各日報の内容に应じて opportunityId を付属
    ...(date === _lastWeekday
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp1`,
              rid,
              "GILSON家: 配偶者分設計書の作成",
              false,
              f(2),
              "high",
            ),
            opportunityId: "opp1",
          },
        ]
      : []),
    ...(date === _oarDate2
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp2`,
              rid,
              "齋藤家: 奥様同席面談の日程確定",
              false,
              f(5),
              "high",
            ),
            opportunityId: "opp2",
          },
        ]
      : []),
    ...(date === _oarDate3
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp3`,
              rid,
              "水野家: 申込書類の回収・引受審査提出",
              false,
              f(2),
              "high",
            ),
            opportunityId: "opp3",
          },
          {
            ...makeTodo(
              `td_${rid}_opp6`,
              rid,
              "伊藤家: ニーズ分析シートの送付・確認",
              false,
              f(10),
              "medium",
            ),
            opportunityId: "opp6",
          },
        ]
      : []),
    ...(date === _recentWeekdays[1]
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp4`,
              rid,
              "鈴木家: ニーズヒアリング結果をメモ・共有",
              false,
              f(7),
              "medium",
            ),
            opportunityId: "opp4",
          },
        ]
      : []),
    ...(date === _recentWeekdays[2]
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp5`,
              rid,
              "高橋家: 証券確認後の暫定見積もり提出",
              false,
              f(5),
              "high",
            ),
            opportunityId: "opp5",
          },
        ]
      : []),
    ...(date === _recentWeekdays[3]
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp10`,
              rid,
              "鈴木家: 学資保険の暫定設計書送付",
              false,
              f(10),
              "medium",
            ),
            opportunityId: "opp10",
          },
          {
            ...makeTodo(
              `td_${rid}_opp11`,
              rid,
              "水野家: 初回面談の日程調整",
              false,
              f(14),
              "medium",
            ),
            opportunityId: "opp11",
          },
        ]
      : []),
    ...(date === _recentWeekdays[4]
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp7`,
              rid,
              "GILSON家 自動車: 継続更新の案内送付",
              true,
              undefined,
              "medium",
            ),
            opportunityId: "opp7",
          },
          {
            ...makeTodo(
              `td_${rid}_opp8`,
              rid,
              "齋藤家: 失注対応・別案件のリファー依頼",
              false,
              d(1),
              "medium",
            ),
            opportunityId: "opp8",
          },
          {
            ...makeTodo(
              `td_${rid}_demo1`,
              rid,
              "松本家: 医療・自動車の申込日定確認",
              false,
              f(7),
              "high",
            ),
            opportunityId: "opp_demo1",
          },
        ]
      : []),
    ...(date === _recentWeekdays[0]
      ? [
          {
            ...makeTodo(
              `td_${rid}_opp9`,
              rid,
              "暁和化学ゴム: 査定結果待ち・進捗フォロー",
              false,
              f(14),
              "medium",
            ),
            opportunityId: "opp9",
          },
        ]
      : []),
  ];
}
