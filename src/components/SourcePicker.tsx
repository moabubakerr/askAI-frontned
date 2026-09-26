import { useEffect, useRef, useState } from 'react';
import { Check, ChevronUp } from 'lucide-react';
import type { Source } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import styles from './SourcePicker.module.css';

/**
 * Who answers the next question.
 *
 * Still chosen per session and never written to storage: Oxford and Combined
 * send the question to Oxford Economics' cloud, and a remembered default would
 * keep doing that in later sessions without the reader choosing it again. The
 * current choice is on the button, so it is legible without opening the menu.
 */
export function SourcePicker() {
  const { t } = useI18n();
  const { source, setSource, oxfordAvailable } = useConversation();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // A menu that stays open after a click elsewhere reads as stuck.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const options: { value: Source; label: string; description: string }[] = [
    { value: 'scai', label: t('source.scai'), description: t('source.scaiHint') },
    ...(oxfordAvailable
      ? [
          {
            value: 'oxford' as const,
            label: t('source.oxford'),
            description: t('source.oxfordHint'),
          },
          {
            value: 'combined' as const,
            label: t('source.combined'),
            description: t('source.combinedHint'),
          },
        ]
      : []),
  ];

  const current = options.find((option) => option.value === source) ?? options[0];

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('source.group')}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {current?.label}
        <ChevronUp
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className={open ? `${styles.chevron} ${styles.open}` : styles.chevron}
        />
      </button>

      {open ? (
        <ul className={styles.menu} role="listbox" aria-label={t('source.group')}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={source === option.value}
                className={styles.option}
                onClick={() => {
                  setSource(option.value);
                  setOpen(false);
                }}
              >
                <span className={styles.text}>
                  <span className={styles.label}>{option.label}</span>
                  <span className={styles.description}>{option.description}</span>
                </span>
                {source === option.value ? (
                  <Check size={16} strokeWidth={2.5} aria-hidden="true" className={styles.check} />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
