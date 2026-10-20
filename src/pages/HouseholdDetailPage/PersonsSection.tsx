import type { Person } from "../../types";
import { RELATION_LABELS, GENDER_LABELS, calcAge } from "./helpers";

interface PersonsSectionProps {
  persons: Person[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PersonsSection({
  persons,
  onAdd,
  onEdit,
  onDelete,
}: PersonsSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          👨‍👩‍👧 世帯員 ({persons.length}名)
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          + 世帯員を追加
        </button>
      </div>

      {persons.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          世帯員が登録されていません
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {persons.map((person) => (
            <div
              key={person.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {person.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {RELATION_LABELS[person.relation]}
                    </span>
                    {person.relation === "head" && (
                      <span className="text-xs text-yellow-600">👑</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {person.kana && <p>{person.kana}</p>}
                    <div className="flex gap-3 flex-wrap">
                      {person.gender && (
                        <span>{GENDER_LABELS[person.gender]}</span>
                      )}
                      {person.birthDate && (
                        <span>
                          {person.birthDate} ({calcAge(person.birthDate)})
                        </span>
                      )}
                      {person.occupation && (
                        <span>職業: {person.occupation}</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {person.smoker && (
                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px]">
                          🚬 喫煙
                        </span>
                      )}
                      {person.healthNotes && (
                        <span
                          className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]"
                          title={person.healthNotes}
                        >
                          🏥{" "}
                          {person.healthNotes.length > 12
                            ? person.healthNotes.slice(0, 12) + "…"
                            : person.healthNotes}
                        </span>
                      )}
                    </div>
                    {person.memo && (
                      <p className="text-gray-600 mt-1">{person.memo}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => onEdit(person.id)}
                    className="px-2 py-1 text-[10px] text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    ✎ 編集
                  </button>
                  <button
                    onClick={() => onDelete(person.id)}
                    className="px-2 py-1 text-[10px] text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
