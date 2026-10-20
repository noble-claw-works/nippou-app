import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppStore } from "../store";
import { canDeleteCustomer } from "../utils/customerAttachment";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import type { Customer } from "../types";
import { type SortKey } from "./customers/constants";
import { CustomerForm } from "./customers/CustomerForm";
import { CustomerCard } from "./customers/CustomerCard";
import {
  buildHistoryCountMap,
  filterCustomers,
  sortCustomers,
} from "./customers/helpers";

export function CustomersPage() {
  const {
    customers,
    users,
    reports,
    addCustomer,
    updateCustomer,
    deactivateCustomer,
    deleteCustomer,
    currentRole,
    addToast,
  } = useAppStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const attachmentState = { reports };
  const historyCountByCustomer = buildHistoryCountMap(reports);
  const canAdd = currentRole !== undefined;
  const canDeactivate = currentRole !== undefined;

  const filtered = filterCustomers(customers, query, typeFilter);
  const sorted = sortCustomers(filtered, sortKey);
  const editingCustomer = editId
    ? customers.find((c) => c.id === editId)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">顧客マスタ</h1>
        {canAdd && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 新規追加
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-2 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="顧客名・エリアで検索"
            className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">すべての区分</option>
          <option value="individual">個人</option>
          <option value="corporate">法人</option>
          <option value="prospect">見込み</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="ソート順"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="name_asc">氏名順（あ→ん）</option>
          <option value="name_desc">氏名順（ん→あ）</option>
          <option value="lastContact_desc">最終接触日（新しい順）</option>
          <option value="nextAppt_asc">次回AP（近い順）</option>
          <option value="created_desc">登録順（新しい順）</option>
        </select>
      </div>

      <div className="flex items-center justify-between mb-2 px-1 text-xs text-gray-600">
        <span>
          全 <strong className="text-gray-900">{sorted.length}</strong> 件
          {(query || typeFilter) && (
            <span className="text-gray-400">
              （全顧客 {customers.length} 件中）
            </span>
          )}
        </span>
        {(query || typeFilter) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTypeFilter("");
            }}
            className="text-blue-600 hover:underline"
          >
            条件をクリア
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="👥"
          title="顧客が見つかりません"
          action={
            canAdd
              ? { label: "+ 顧客を追加", onClick: () => setShowNew(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              primaryUser={users.find((u) => u.id === customer.primaryUserId)}
              historyCount={historyCountByCustomer.get(customer.id) ?? 0}
              attachmentState={attachmentState}
              currentRole={currentRole}
              onEdit={setEditId}
              onDeactivate={setDeactivateId}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="新しい顧客を追加"
        size="md"
      >
        <CustomerForm
          onSave={(data) => {
            addCustomer({
              ...data,
              id: "",
              status: "active",
              tags: data.tags ?? [],
              memo: data.memo ?? "",
            } as Omit<Customer, "id">);
            setShowNew(false);
            addToast({ type: "success", message: "顧客を追加しました" });
          }}
          onCancel={() => setShowNew(false)}
        />
      </Modal>

      {editingCustomer && (
        <Modal
          open={!!editId}
          onClose={() => setEditId(null)}
          title="顧客を編集"
          size="md"
        >
          <CustomerForm
            initial={editingCustomer}
            onSave={(data) => {
              updateCustomer(editingCustomer.id, data);
              setEditId(null);
              addToast({ type: "success", message: "変更を保存しました" });
            }}
            onCancel={() => setEditId(null)}
          />
          {currentRole !== undefined && (
            <div className="mt-6 pt-4 border-t border-red-100">
              <p className="text-xs font-semibold text-red-700 mb-2">
                ⚠ 危険ゾーン
              </p>
              <div className="flex gap-2 flex-wrap">
                {canDeactivate && editingCustomer.status === "active" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setDeactivateId(editingCustomer.id);
                    }}
                    className="px-3 py-1.5 text-xs text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50"
                  >
                    🚫 無効化する
                  </button>
                )}
                {(() => {
                  const modalCanDelete = canDeleteCustomer(
                    attachmentState,
                    editingCustomer.id,
                    currentRole,
                  );
                  const modalHasAttach =
                    !modalCanDelete && currentRole !== undefined;
                  return (
                    <button
                      type="button"
                      disabled={!modalCanDelete}
                      title={
                        modalHasAttach
                          ? modalCanDelete
                            ? "付帯情報あり顧客 (admin/executive 削除可)"
                            : "付帯情報あり: admin/executive のみ削除可"
                          : ""
                      }
                      onClick={() => {
                        if (modalCanDelete) {
                          setEditId(null);
                          setDeleteId(editingCustomer.id);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs border rounded-lg font-medium ${
                        modalCanDelete
                          ? "text-red-700 border-red-300 hover:bg-red-50"
                          : "text-red-300 border-red-200 opacity-50 cursor-not-allowed pointer-events-none"
                      }`}
                      aria-label={`${editingCustomer.name} を完全削除`}
                      aria-disabled={!modalCanDelete}
                    >
                      🗑 この顧客を削除
                    </button>
                  );
                })()}
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">
                削除は不可逆です。予定・履歴を保全したい場合は「無効化」を推奨します。
              </p>
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          deactivateCustomer(deactivateId!);
          addToast({ type: "info", message: "顧客を無効化しました" });
        }}
        title="顧客を無効化しますか？"
        message={
          <div className="space-y-2">
            <p>
              「{customers.find((c) => c.id === deactivateId)?.name}
              」を無効化します。
            </p>
            <p className="text-sm text-gray-500">
              ⚠
              過去の日報からは引き続き参照できますが、新規日報の顧客選択候補からは外れます。
            </p>
          </div>
        }
        confirmLabel="無効化する"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (
            deleteId &&
            !canDeleteCustomer(attachmentState, deleteId, currentRole)
          ) {
            addToast({
              type: "error",
              message: "付帯情報あり顧客は admin/executive のみ削除可能です",
            });
            setDeleteId(null);
            return;
          }
          deleteCustomer(deleteId!);
          addToast({ type: "success", message: "顧客を削除しました" });
          setDeleteId(null);
        }}
        title="顧客を完全に削除しますか？"
        message={
          <div className="space-y-2">
            <p>
              「{customers.find((c) => c.id === deleteId)?.name}」を削除します。
            </p>
            <p className="text-sm text-red-600">
              ❌
              この操作は取り消しできません。過去の日報では顧客名が「不明」と表示されます。
            </p>
            <p className="text-xs text-gray-500">
              手順保全が要な場合は「無効化」を推奨します。
            </p>
          </div>
        }
        confirmLabel="削除する"
      />
    </div>
  );
}
