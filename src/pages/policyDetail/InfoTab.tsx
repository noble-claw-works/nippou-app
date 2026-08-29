import type { Policy } from "../../types";
import { PAY_MODE_LABELS } from "./constants";

interface InfoTabProps {
  policy: Policy;
}

export function InfoTab({ policy }: InfoTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">契約日</p>
          <p className="font-medium text-gray-800">{policy.startDate}</p>
        </div>
        {policy.maturityDate && (
          <div>
            <p className="text-xs text-gray-500">満期日</p>
            <p className="font-medium text-gray-800">{policy.maturityDate}</p>
          </div>
        )}
        {policy.renewalDate && (
          <div>
            <p className="text-xs text-gray-500">次回更新日</p>
            <p className="font-medium text-gray-800">{policy.renewalDate}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">払込方法</p>
          <p className="font-medium text-gray-800">
            {PAY_MODE_LABELS[policy.payMode] ?? policy.payMode}
          </p>
        </div>
        {policy.annualPremium && (
          <div>
            <p className="text-xs text-gray-500">年払額</p>
            <p className="font-medium text-gray-800">
              ¥{policy.annualPremium.toLocaleString()}
            </p>
          </div>
        )}
        {policy.payPeriodYears && (
          <div>
            <p className="text-xs text-gray-500">払込期間</p>
            <p className="font-medium text-gray-800">
              {policy.payPeriodYears}年
            </p>
          </div>
        )}
        {policy.premiumPaidUntil && (
          <div>
            <p className="text-xs text-gray-500">払込済期日</p>
            <p className="font-medium text-gray-800">
              {policy.premiumPaidUntil}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">解約返戻金</p>
          <p className="font-medium text-gray-800">
            {policy.hasCashValue
              ? policy.cashValue
                ? `¥${policy.cashValue.toLocaleString()}`
                : "あり"
              : "なし"}
          </p>
        </div>
        {policy.tags.length > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">タグ</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {policy.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {policy.memo && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">メモ</p>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">
              {policy.memo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
