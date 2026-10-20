// =====================================================
// appstate/customers.ts — Customer & Person slice of AppState
// =====================================================
import type { Customer, Person } from "../../../types";

export interface AppStateCustomersSlice {
  // Data
  customers: Customer[];
  persons: Person[];

  // Actions: Customer
  addCustomer: (customer: Omit<Customer, "id">) => Customer;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deactivateCustomer: (customerId: string, reason?: string) => void;
  deleteCustomer: (customerId: string) => boolean;

  // Actions: Person (世帯員)
  addPerson: (
    householdId: string,
    partial: Omit<Person, "id" | "householdId" | "createdAt" | "updatedAt">,
  ) => Person;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  deletePerson: (personId: string) => { ok: boolean; error?: string };
  getPersonsByHousehold: (householdId: string) => Person[];
}
