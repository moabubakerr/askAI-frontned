import { useRef, type KeyboardEvent } from 'react';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `compact` for in-card controls such as chart views. */
  size?: 'default' | 'compact';
  tone?: 'light' | 'dark';
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'default',
  tone = 'light',
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !back) return;

    event.preventDefault();
    // Arrow keys follow visual order; in RTL the row is mirrored.
    const rtl = document.documentElement.dir === 'rtl';
    const step = forward === rtl ? -1 : 1;
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[styles.group, styles[size], styles[tone]].join(' ')}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={option.hint}
            ref={(node) => {
              refs.current[index] = node;
            }}
            className={styles.option}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
