// =====================================================
// シードデータ — 商談案件 (Opportunity) barrel
// =====================================================
import type { Opportunity } from "../../types";
import { OPP_DATA_1_3 } from "./opportunities-1";
import { OPP_DATA_4_5 } from "./opportunities-2";
import { OPP_DATA_6_8 } from "./opportunities-3";
import { OPP_DATA_9_DEMO1 } from "./opportunities-4";

export const OPPORTUNITIES: Opportunity[] = [
  ...OPP_DATA_1_3,
  ...OPP_DATA_4_5,
  ...OPP_DATA_6_8,
  ...OPP_DATA_9_DEMO1,
];
