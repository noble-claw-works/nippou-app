import {
  Clock,
  User as UserIcon,
  FileText,
  CheckCircle2,
  Calendar as CalendarIcon,
  Phone,
  Store,
  MapPin,
  Mail,
  MoreHorizontal,
} from "lucide-react";
import { BLOCK_EMOJIS, BLOCK_LABELS } from "../../utils";
import type {
  BlockType,
  CustomerInteraction,
  InteractionKind,
} from "../../types";
import { INTERACTION_KIND_LABEL } from "../../types";

export interface TimelineEntry {
  reportId: string;
  reportDate: string;
  reportUserId: string;
  block: {
    id: string;
    type: BlockType;
    startTime?: string;
    endTime?: string;
    title?: string;
    memo?: string;
    result?: string;
    proposal?: string;
    collected?: boolean;
    nextAppointment?: string;
    isActual?: boolean;
  };
}

/** 統合タイムラインエントリ（日報由来 or 手動対応記録） */
export type UnifiedTimelineEntry =
  | { source: "report"; date: string; entry: TimelineEntry }
  | { source: "interaction"; date: string; interaction: CustomerInteraction };

const TYPE_ACCENT: Record<string, string> = {
  visit: "border-l-blue-400 bg-blue-50/30",
  office: "border-l-gray-400 bg-gray-50/30",
  phone: "border-l-amber-400 bg-amber-50/30",
  travel: "border-l-emerald-400 bg-emerald-50/30",
  break: "border-l-pink-300 bg-pink-50/30",
  meeting: "border-l-purple-400 bg-purple-50/30",
  lunch: "border-l-orange-400 bg-orange-50/30",
};

const INTERACTION_KIND_ACCENT: Record<InteractionKind, string> = {
  phone: "border-l-amber-500 bg-amber-50/40",
  reception: "border-l-teal-400 bg-teal-50/40",
  visit: "border-l-blue-400 bg-blue-50/40",
  email: "border-l-violet-400 bg-violet-50/40",
  other: "border-l-gray-400 bg-gray-50/40",
};

const INTERACTION_KIND_BADGE: Record<InteractionKind, string> = {
  phone: "bg-amber-100 text-amber-800",
  reception: "bg-teal-100 text-teal-800",
  visit: "bg-blue-100 text-blue-800",
  email: "bg-violet-100 text-violet-800",
  other: "bg-gray-100 text-gray-700",
};

const INTERACTION_KIND_ICON: Record<
  InteractionKind,
  React.ComponentType<{ className?: string }>
> = {
  phone: Phone,
  reception: Store,
  visit: MapPin,
  email: Mail,
  other: MoreHorizontal,
};

import React from "react";

interface HouseholdTimelineBodyProps {
  historyEntries: TimelineEntry[];
  interactions?: CustomerInteraction[];
  users: { id: string; name: string }[];
  onNavigate: (date: string) => void;
}

export function HouseholdTimelineBody({
  historyEntries,
  interactions = [],
  users,
  onNavigate,
}: HouseholdTimelineBodyProps) {
  // 統合して降順ソート
  const unified: UnifiedTimelineEntry[] = [
    ...historyEntries.map((entry): UnifiedTimelineEntry => ({
      source: "report",
      date: entry.reportDate,
      entry,
    })),
    ...interactions.map((interaction): UnifiedTimelineEntry => ({
      source: "interaction",
      date: interaction.occurredAt,
      interaction,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  if (unified.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        対応履歴がありません
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      <div
        className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent"
        aria-hidden="true"
      />
      <ul className="space-y-3">
        {unified.map((item) => {
          if (item.source === "report") {
            const { entry } = item;
            const { reportDate, reportUserId, block } = entry;
            const handler = users.find((u) => u.id === reportUserId);
            const hasResult = !!(
              block.result ||
              block.proposal ||
              block.collected ||
              block.nextAppointment
            );
            return (
              <li key={`report-${block.id}`} className="relative">
                <span
                  className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onNavigate(reportDate)}
                  className={`block w-full text-left rounded-lg border border-gray-200 border-l-4 ${
                    TYPE_ACCENT[block.type] ?? "border-l-gray-300 bg-gray-50/30"
                  } p-3 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  aria-label={`${reportDate} ${block.startTime}〜${block.endTime} ${BLOCK_LABELS[block.type]} の日報を開く`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
                    <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                      {reportDate}
                    </span>
                    <span className="text-xs text-gray-600 tabular-nums inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {block.startTime || "--:--"} 〜 {block.endTime || "--:--"}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                      {BLOCK_EMOJIS[block.type]} {BLOCK_LABELS[block.type]}
                    </span>
                  </div>
                  {block.title && (
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {block.title}
                    </p>
                  )}
                  {block.memo && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2 leading-relaxed">
                      {block.memo}
                    </p>
                  )}
                  {hasResult && (
                    <div className="mt-2 space-y-1 text-xs">
                      {block.result && (
                        <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                          <FileText className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-wide">
                              結果
                            </span>
                            <span className="text-gray-800">
                              {block.result}
                            </span>
                          </div>
                        </div>
                      )}
                      {block.proposal && (
                        <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                          <span className="text-purple-600 flex-shrink-0">
                            💡
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-wide">
                              提案
                            </span>
                            <span className="text-gray-800">
                              {block.proposal}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    {handler && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        {handler.name}
                      </span>
                    )}
                    {!block.isActual && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">
                        予定
                      </span>
                    )}
                    {block.collected && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> 集金済
                      </span>
                    )}
                    {block.nextAppointment && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                        📆 次回: {block.nextAppointment}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-blue-600 hover:underline">
                      日報を開く →
                    </span>
                  </div>
                </button>
              </li>
            );
          }

          // 手動対応記録
          const { interaction } = item;
          const recorder = users.find((u) => u.id === interaction.byUserId);
          const KindIcon = INTERACTION_KIND_ICON[interaction.kind];
          return (
            <li key={`interaction-${interaction.id}`} className="relative">
              <span
                className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-teal-400 shadow-sm"
                aria-hidden="true"
              />
              <div
                className={`rounded-lg border border-gray-200 border-l-4 ${
                  INTERACTION_KIND_ACCENT[interaction.kind]
                } p-3`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
                  <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    {interaction.occurredAt}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      INTERACTION_KIND_BADGE[interaction.kind]
                    }`}
                  >
                    <KindIcon className="w-3 h-3" />
                    {INTERACTION_KIND_LABEL[interaction.kind]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed mb-2">
                  {interaction.summary}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  {recorder && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      {recorder.name}
                    </span>
                  )}
                  {interaction.nextAppointment && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                      📆 次回: {interaction.nextAppointment}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-teal-600 font-medium">
                    手動記録
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
