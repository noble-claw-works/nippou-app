// <input type="date"> 共通の範囲定数と検証 (#305 A1)
export const DATE_MIN = '1900-01-01';
export const DATE_MAX = '2100-12-31';
export const DATE_RANGE_ERROR = `日付は ${DATE_MIN} 〜 ${DATE_MAX} の範囲で入力してください`;
export const DATE_INVALID_ERROR = '日付の形式が正しくありません';

/** input に展開する共通 props */
export const dateInputProps = { min: DATE_MIN, max: DATE_MAX } as const;

function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/**
 * 日付文字列 (YYYY-MM-DD) を検証。空は OK(任意項目の未入力)。
 * ブラウザは不正入力時に value を '' にするため、validity.badInput も受ける。
 * エラーメッセージ or null を返す。
 */
export function validateDateValue(value: string | undefined | null, badInput = false): string | null {
  if (badInput) return DATE_INVALID_ERROR;
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return DATE_INVALID_ERROR;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return DATE_INVALID_ERROR;
  if (value < DATE_MIN || value > DATE_MAX) return DATE_RANGE_ERROR;
  return null;
}

/** onChange イベントから検証 (badInput 対応) */
export function validateDateInputEvent(e: {
  target: { value: string; validity?: { badInput?: boolean } };
}): string | null {
  return validateDateValue(e.target.value, !!e.target.validity?.badInput);
}
