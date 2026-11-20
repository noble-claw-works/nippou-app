// =====================================================
// salesPerf/data/seed/contracts-normal.ts — 正規契約データ生成 (285件)
// =====================================================
import type { SalesContractRaw } from "../../types";
import {
  OWNERS,
  GROUPS,
  INSURERS_LIFE,
  INSURERS_NONLIFE,
  PT_LIFE,
  PT_NONLIFE,
  CHANNELS,
  PARTNERS,
  CONF_LIFE,
  CONF_NONLIFE,
  pr,
  prb,
  fy2025Date,
} from "./contracts-shared";

// 正規契約 (285件)
export const normalContracts: SalesContractRaw[] = [];
for (let i = 0; i < 285; i++) {
  const isLife = pr(i, 2) === 0;
  const line = isLife ? "life" : "nonlife";
  const ownerIdx = pr(i + 100, OWNERS.length);
  const ownerId = OWNERS[ownerIdx];
  const fiscalMonth = pr(i + 200, 12) + 1;
  const confArr = isLife ? CONF_LIFE : CONF_NONLIFE;
  const confIdx = pr(i + 300, confArr.length);
  const confidence = confArr[confIdx];
  const insurer = isLife
    ? INSURERS_LIFE[pr(i + 400, INSURERS_LIFE.length)]
    : INSURERS_NONLIFE[pr(i + 400, INSURERS_NONLIFE.length)];
  const pt = isLife
    ? PT_LIFE[pr(i + 500, PT_LIFE.length)]
    : PT_NONLIFE[pr(i + 500, PT_NONLIFE.length)];
  const channel = CHANNELS[pr(i + 600, CHANNELS.length)];
  const partner = PARTNERS[pr(i + 700, PARTNERS.length)];

  // 月払保険料 (3000〜50000)
  const premium = (pr(i + 800, 48) + 3) * 1000;
  // 初年度手数料 (保険料の30〜60%)
  const commRate = (pr(i + 900, 31) + 30) / 100;
  const comm = Math.round(premium * commRate * 12);

  normalContracts.push({
    id: `c_${String(i + 1).padStart(4, "0")}`,
    line,
    fiscal_year: 2025,
    owner_id: ownerId,
    group_id: GROUPS[ownerId],
    channel,
    partner,
    insurer,
    product_type: pt,
    monthly_premium: premium,
    first_year_commission: comm,
    confidence,
    application_date: fy2025Date(fiscalMonth, i + 1000),
    established_date:
      confidence === "確定" ? fy2025Date(fiscalMonth, i + 1100) : undefined,
    had_meeting: prb(i + 1200),
    had_lifeplan: isLife && prb(i + 1300),
    policy_collected: confidence === "確定" && prb(i + 1400),
    had_proposal: prb(i + 1500),
    household_id: `hh_${String(pr(i + 1600, 150) + 1).padStart(4, "0")}`,
  });
}

// 前年度 FY2024 データ (20件, 比較用)
for (let i = 0; i < 20; i++) {
  const isLife = pr(i + 1700, 2) === 0;
  const line = isLife ? "life" : "nonlife";
  const ownerIdx = pr(i + 1800, OWNERS.length);
  const ownerId = OWNERS[ownerIdx];
  const calMonth = pr(i + 1900, 12) + 1;
  const year = calMonth >= 4 ? 2024 : 2025;
  const day = pr(i + 2000, 28) + 1;
  const insurer = isLife
    ? INSURERS_LIFE[pr(i + 2100, INSURERS_LIFE.length)]
    : INSURERS_NONLIFE[pr(i + 2100, INSURERS_NONLIFE.length)];
  const pt = isLife
    ? PT_LIFE[pr(i + 2200, PT_LIFE.length)]
    : PT_NONLIFE[pr(i + 2200, PT_NONLIFE.length)];
  const premium = (pr(i + 2300, 48) + 3) * 1000;
  const comm = Math.round(premium * 0.4 * 12);

  normalContracts.push({
    id: `c_fy24_${String(i + 1).padStart(3, "0")}`,
    line,
    fiscal_year: 2024,
    owner_id: ownerId,
    group_id: GROUPS[ownerId],
    channel: CHANNELS[pr(i + 2400, CHANNELS.length)],
    partner: PARTNERS[pr(i + 2500, PARTNERS.length)],
    insurer,
    product_type: pt,
    monthly_premium: premium,
    first_year_commission: comm,
    confidence: "確定",
    established_date: `${year}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    had_meeting: true,
    had_lifeplan: isLife && prb(i + 2600),
    policy_collected: true,
    had_proposal: true,
    household_id: `hh_fy24_${String(pr(i + 2700, 80) + 1).padStart(3, "0")}`,
  });
}
