import type { CustomerType } from "../../types";

export const TYPE_LABELS: Record<CustomerType, string> = {
  individual: "個人",
  corporate: "法人",
};

export type SortKey =
  | "name_asc"
  | "name_desc"
  | "lastContact_desc"
  | "nextAppt_asc"
  | "created_desc";
