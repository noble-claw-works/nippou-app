// =====================================================
// core.ts — 基盤型 (Role / Status / BlockType など)
// =====================================================

export type Role = "general" | "manager" | "executive" | "admin";
export type ReportStatus =
  "planning" | "in_progress" | "submitted" | "confirmed";
export type BlockType =
  "visit" | "office" | "phone" | "travel" | "break" | "meeting" | "lunch";
export type CustomerType = "individual" | "corporate" | "prospect";
export type CustomerStatus = "active" | "inactive";

// === Household (世帯) 型 — CustomerType/Status と互換 ===
export type HouseholdType = CustomerType;
export type HouseholdStatus = CustomerStatus;

export type PersonRelation =
  "head" | "spouse" | "child" | "parent" | "sibling" | "other";
export type PersonGender = "M" | "F" | "other";
export type UserStatus = "active" | "inactive" | "invited";

export type MoodType = "sunny" | "partly_cloudy" | "cloudy" | "rainy";
export type ManagerSignal = "consult" | "listen" | "ok" | null;
