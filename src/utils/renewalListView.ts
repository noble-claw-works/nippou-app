// =====================================================
// renewalListView.ts — 更新一覧 行表示モデル（§5 T5-02 / §0確定①）
//
// 純関数のみ。日数は renewalDays util に統一（二重表示禁止）:
//   主表示 = 本日基点の満期残日数 (daysFromToday)
//   FC日横 = FC日基点の日数     (daysFromFirstContact)
// 強調しきい値は filterRenewalPolicies の RENEWAL_NEAR_DAYS を共有。
// =====================================================
import type { RenewalCase } from "../types";
import { daysFromToday, daysFromFirstContact, formatDayCount } from "./renewalDays";
import { RENEWAL_NEAR_DAYS } from "./filterRenewalPolicies";

/** 一覧の入力ビュー。view=閲覧 / edit=行直接入力 */
export type RenewalListViewMode = "view" | "edit";

/** 1行分の算出済み表示モデル（算出列は入力不可＝ここで確定） */
export interface RenewalRowView {
  /** 本日基点の満期残日数（主表示）。欠損/不正は null */
  maturityDays: number | null;
  /** 主表示ラベル（"N日" / "—"） */
  maturityDaysLabel: string;
  /** FC日（survey.consult.firstContactDate）。未入力は undefined */
  fcDate?: string;
  /** FC日基点の日数（満期 − FC日）。欠損は null */
  fcDays: number | null;
  /** FC日基点ラベル（"N日" / "—"） */
  fcDaysLabel: string;
  /** 60日以内（RENEWAL_NEAR_DAYS）強調対象。欠損時 false */
  near: boolean;
  /** 満期経過（残日数 <= 0）。欠損時 false */
  expired: boolean;
}

/**
 * RenewalCase から一覧行の表示モデルを構築（純関数）。
 * @param rc 対象ケース
 * @param todayStr 基準日 yyyy-MM-dd（注入可能・テスト容易化）
 */
export function buildRenewalRowView(
  rc: Pick<RenewalCase, "maturityDate" | "survey">,
  todayStr: string,
): RenewalRowView {
  const maturityDays = daysFromToday(rc.maturityDate, todayStr);
  const fcDate = rc.survey?.consult?.firstContactDate;
  const fcDays = daysFromFirstContact(rc.maturityDate, fcDate);

  const near =
    maturityDays !== null && maturityDays <= RENEWAL_NEAR_DAYS;
  const expired = maturityDays !== null && maturityDays <= 0;

  return {
    maturityDays,
    maturityDaysLabel: formatDayCount(maturityDays),
    fcDate,
    fcDays,
    fcDaysLabel: formatDayCount(fcDays),
    near,
    expired,
  };
}
