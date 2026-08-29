import type { CustomerType, PersonRelation, PersonGender } from "../../types";

export const TYPE_LABELS: Record<CustomerType, string> = {
  individual: "個人",
  corporate: "法人",
  prospect: "見込み",
};

export const RELATION_LABELS: Record<PersonRelation, string> = {
  head: "世帯主",
  spouse: "配偶者",
  child: "子",
  parent: "親",
  sibling: "兄弟姉妹",
  other: "その他",
};

export const GENDER_LABELS: Record<PersonGender, string> = {
  M: "男性",
  F: "女性",
  other: "その他",
};

export const RELATION_ORDER: Record<PersonRelation, number> = {
  head: 0,
  spouse: 1,
  child: 2,
  parent: 3,
  sibling: 4,
  other: 5,
};

export function calcAge(birthDate?: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0);
  return `${age}歳`;
}
