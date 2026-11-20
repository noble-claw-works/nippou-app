// =====================================================
// シードデータ — 日報 (DailyReport)
// =====================================================
import type { DailyReport, Comment } from "../../types";
import { d, makeComment, makeReport } from "./helpers";
import { buildTodayReport } from "./reports-today";
import { getExtraBlocks } from "./reports-blocks";
import { getBaseBlocks } from "./reports-blocks";
import { getPastTodos } from "./reports-todos";

const buildReports = (): DailyReport[] => {
  const reports: DailyReport[] = [];

  // 今日の日報（下書き）
  reports.push(buildTodayReport());

  // 過去30日分を生成（u1のみ詳細、u2/u3は簡易）
  const statuses: Array<
    "submitted" | "confirmed" | "in_progress" | "planning"
  > = [
    "confirmed",
    "confirmed",
    "submitted",
    "confirmed",
    "planning",
    "confirmed",
    "confirmed",
    "submitted",
    "in_progress",
    "confirmed",
  ];

  for (let i = 1; i <= 30; i++) {
    const date = d(i);
    const dow = new Date(date).getDay();
    if (dow === 0 || dow === 6) continue; // 土日スキップ

    const status = statuses[i % statuses.length];
    const rid = `r_${date}_u1`;
    const comments: Comment[] =
      status === "confirmed"
        ? [
            makeComment(
              `cm_${rid}_1`,
              rid,
              "u4",
              "お疲れさまでした。引き続きよろしく。",
              `${date}T19:30:00`,
            ),
          ]
        : [];

    const extraBlocks = getExtraBlocks(date, rid);
    const baseBlocks = getBaseBlocks(date, rid);

    reports.push(
      makeReport(
        rid,
        "u1",
        date,
        status,
        [...baseBlocks, ...extraBlocks],
        getPastTodos(i, rid, date),
        comments,
      ),
    );

    // u2も一部生成
    if (i <= 15) {
      const rid2 = `r_${date}_u2`;
      reports.push(
        makeReport(
          rid2,
          "u2",
          date,
          i <= 5 ? "confirmed" : "submitted",
          [],
          [],
          [],
        ),
      );
    }
  }

  return reports;
};

export const REPORTS: DailyReport[] = buildReports();
