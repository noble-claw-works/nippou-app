// =====================================================
// シードデータ — 今日の日報
// =====================================================
import type { DailyReport } from "../../types";
import { today, d, f, makeBlock, makeTodo, makeReport } from "./helpers";

export function buildTodayReport(): DailyReport {
  return makeReport(
    "r_today_u1",
    "u1",
    today,
    "planning",
    [
      makeBlock("b1", "r_today_u1", {
        type: "meeting",
        startTime: "09:00",
        endTime: "09:30",
        title: "朝礼",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock("b2", "r_today_u1", {
        type: "visit",
        startTime: "10:00",
        endTime: "11:30",
        title: "自動車保険更新手続き",
        customerId: "c1",
        isPlanned: true,
        isActual: true,
      }),
      makeBlock("b3", "r_today_u1", {
        type: "office",
        startTime: "13:00",
        endTime: "14:00",
        title: "見積書作成",
        isPlanned: true,
        isActual: false,
      }),
      makeBlock("b4", "r_today_u1", {
        type: "visit",
        startTime: "14:30",
        endTime: "15:30",
        title: "火災保険更新確認 (暁和化学ゴム)",
        customerId: "c3",
        isPlanned: true,
        isActual: false,
      }),
    ],
    [
      // DEAD-1: 期限切れ検証用 × 2 + 今日期限 × 1 + 未期限 × 1
      makeTodo(
        "td1",
        "r_today_u1",
        "法人アポ取り (月末期限)",
        false,
        d(3),
        "high",
      ),
      makeTodo(
        "td2",
        "r_today_u1",
        "見積作成 (KOORO GILSON) ⚠ 付け完了",
        false,
        d(7),
        "high",
      ),
      makeTodo("td3", "r_today_u1", "山田工業フォロー"),
      makeTodo("td4", "r_today_u1", "今日期限のタスク", false, today, "medium"),
      {
        ...makeTodo(
          "td5",
          "r_today_u1",
          "テクノ精工 労災更新書類確認",
          false,
          f(7),
          "medium",
        ),
        customerId: "c7",
      },
    ],
    [],
  );
}
