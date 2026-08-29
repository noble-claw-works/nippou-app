// =====================================================
// Customer + Person slice
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, Customer, Person, Household } from "../_internal/types";
import { uid } from "../_internal/constants";
import { format } from "date-fns";
import { generateTasksOnHouseholdCreated } from "../../utils/taskGenerator";
import { hasCustomerAttachment } from "../../utils/customerAttachment";
import { persistDeletedCustomerId } from "../deletedCustomers";

export const createCustomerSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addCustomer"
    | "updateCustomer"
    | "deactivateCustomer"
    | "deleteCustomer"
    | "addPerson"
    | "updatePerson"
    | "deletePerson"
    | "getPersonsByHousehold"
  >
> = (set, get) => ({
  addCustomer: (customer) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const masters = get().taskTemplates;
    const newCustomer: Customer = {
      ...customer,
      id: uid(),
      tasks: (customer as Household).tasks ?? [],
    };
    // 世帯作成トリガー — 自動タスク生成
    const generatedTasks = generateTasksOnHouseholdCreated(
      newCustomer as Household,
      masters,
      today,
    );
    const customerWithTasks: Customer = {
      ...newCustomer,
      tasks: [...((newCustomer as Household).tasks ?? []), ...generatedTasks],
    } as Customer;
    set((s) => ({ customers: [...s.customers, customerWithTasks] }));
    return customerWithTasks;
  },

  updateCustomer: (customerId, updates) => {
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === customerId ? { ...c, ...updates } : c,
      ),
    }));
  },

  deactivateCustomer: (customerId) => {
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === customerId ? { ...c, status: "inactive" } : c,
      ),
    }));
  },

  deleteCustomer: (customerId) => {
    // P0 二層防御: 付帯情報あり顧客は admin/executive のみ削除可
    const s = get();
    if (hasCustomerAttachment({ reports: s.reports }, customerId)) {
      if (s.currentRole !== "admin" && s.currentRole !== "executive") {
        console.warn(
          "[security] deleteCustomer blocked: 付帯情報あり customer は admin/executive のみ削除可",
        );
        return false;
      }
    }
    // CUS-3: 完全削除。過去日報からの参照は customerId が dangling になるが、UI 側で fallback 表示する
    // E-8 修正: 削除した顧客 ID を localStorage に永続化し、ページリロード後も削除状態を保持する
    persistDeletedCustomerId(customerId);
    set((s) => ({
      customers: s.customers.filter((c) => c.id !== customerId),
      persons: s.persons.filter((p) => p.householdId !== customerId),
    }));
    return true;
  },

  // --- Person アクション ---
  addPerson: (householdId, partial) => {
    const now = new Date().toISOString();
    const newPerson: Person = {
      ...partial,
      id: uid(),
      householdId,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ persons: [...s.persons, newPerson] }));
    return newPerson;
  },

  updatePerson: (personId, patch) => {
    set((s) => ({
      persons: s.persons.map((p) =>
        p.id === personId
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));
  },

  deletePerson: (personId) => {
    const s = get();
    const person = s.persons.find((p) => p.id === personId);
    if (!person) return { ok: false, error: "世帯員が見つかりません" };
    if (person.relation === "head") {
      // 世帯主削除: 別の世帯員を世帯主に自動繰り上げ
      const siblings = s.persons.filter(
        (p) => p.householdId === person.householdId && p.id !== personId,
      );
      if (siblings.length > 0) {
        const next = siblings[0];
        set((state) => ({
          persons: state.persons
            .filter((p) => p.id !== personId)
            .map((p) =>
              p.id === next.id
                ? {
                    ...p,
                    relation: "head" as const,
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          customers: state.customers.map((c) =>
            c.id === person.householdId ? { ...c, headPersonId: next.id } : c,
          ),
        }));
      } else {
        // 世帯員が自分のみの場合は削除して headPersonId もクリア
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== personId),
          customers: state.customers.map((c) =>
            c.id === person.householdId ? { ...c, headPersonId: undefined } : c,
          ),
        }));
      }
    } else {
      set((state) => ({
        persons: state.persons.filter((p) => p.id !== personId),
      }));
    }
    return { ok: true };
  },

  getPersonsByHousehold: (householdId) => {
    return get().persons.filter((p) => p.householdId === householdId);
  },
});
