// =====================================================
// appstate/masters.ts — 保険会社マスタ / 種目マスタ slice of AppState
// =====================================================
import type { InsuranceCompany, ProductCategoryMaster } from "../../../types";

export interface AppStateMastersSlice {
  // Data
  insuranceCompanies: InsuranceCompany[];
  productCategories: ProductCategoryMaster[];

  // Actions: InsuranceCompany
  addInsuranceCompany: (
    partial: Omit<InsuranceCompany, "id">,
  ) => InsuranceCompany;
  updateInsuranceCompany: (
    id: string,
    patch: Partial<InsuranceCompany>,
  ) => void;
  removeInsuranceCompany: (id: string) => void;

  // Actions: ProductCategoryMaster
  addProductCategory: (
    partial: Omit<ProductCategoryMaster, "id">,
  ) => ProductCategoryMaster;
  updateProductCategory: (
    id: string,
    patch: Partial<ProductCategoryMaster>,
  ) => void;
  removeProductCategory: (id: string) => void;
}
