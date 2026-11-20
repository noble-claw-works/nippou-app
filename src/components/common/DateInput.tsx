import { useState, type InputHTMLAttributes } from 'react';
import { dateInputProps, validateDateInputEvent, validateDateValue } from '../../utils/dateInput';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & { value?: string };

/**
 * <input type="date"> の drop-in 置換 (#305 A1)。
 * - min/max を共通定数で付与
 * - 範囲外/不正値は親の onChange に流さず(=保存されない)、直下にエラー表示
 */
export function DateInput({ value = '', onChange, ...rest }: Props) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  const [error, setError] = useState<string | null>(validateDateValue(value));
  // 親の value が変わったら入力中の値を同期(render 中の派生 state 更新)
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
    setError(validateDateValue(value));
  }
  return (
    <>
      <input
        {...dateInputProps}
        {...rest}
        type="date"
        value={draft}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          const err = validateDateInputEvent(e);
          setDraft(e.target.value);
          setError(err);
          if (!err) onChange?.(e);
        }}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 whitespace-normal">
          {error}
        </p>
      )}
    </>
  );
}
