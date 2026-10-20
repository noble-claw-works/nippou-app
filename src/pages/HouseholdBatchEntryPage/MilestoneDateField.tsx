// B-2b: マイルストーン日付フィールド（小コンポーネント）

interface MilestoneDateFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  today: string;
}

export function MilestoneDateField({
  label,
  value,
  onChange,
  today,
}: MilestoneDateFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="block text-[10px] text-gray-500">{label}</label>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={label}
      />
      {!value && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="text-[10px] text-blue-500 hover:text-blue-700 text-left px-0 py-0 leading-tight"
          tabIndex={-1}
        >
          今日
        </button>
      )}
    </div>
  );
}
