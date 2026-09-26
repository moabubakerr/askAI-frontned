import { useState, type FormEvent } from 'react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useConversation, type Lens } from '../state/useConversation';
import { SourcePicker } from './SourcePicker';
import styles from './Composer.module.css';

const LENSES: { value: Lens; key: 'lens.executive' | 'lens.explore' }[] = [
  { value: 'executive', key: 'lens.executive' },
  { value: 'explore', key: 'lens.explore' },
];

export function Composer() {
  const { t, lang } = useI18n();
  const { ask, reset, busy, turns, lens, setLens } = useConversation();
  const [draft, setDraft] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    ask(draft, lang);
    setDraft('');
  }

  return (
    <div className={styles.dock}>
      <div className={styles.inner}>
        <form className={styles.card} onSubmit={onSubmit}>
          <label className="visually-hidden" htmlFor="composer-input">
            {t('composer.label')}
          </label>
          <input
            id="composer-input"
            className={styles.input}
            type="text"
            autoComplete="off"
            value={draft}
            placeholder={t('composer.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
          />

          <div className={styles.controls}>
            {/* The same control as the cards on the opening screen, kept within
                reach once the conversation has started. */}
            <div className={styles.lens} role="radiogroup" aria-label={t('lens.group')}>
              {LENSES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={lens === option.value}
                  className={styles.lensOption}
                  onClick={() => setLens(option.value)}
                >
                  {t(option.key)}
                </button>
              ))}
            </div>

            <div className={styles.right}>
              <button
                type="button"
                className={styles.reset}
                onClick={reset}
                disabled={turns.length === 0}
                title={t('composer.new')}
                aria-label={t('composer.new')}
              >
                <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>

              <button
                type="submit"
                className={styles.send}
                disabled={busy || draft.trim().length === 0}
                aria-label={t('composer.send')}
              >
                <ArrowUp size={17} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>

        <SourcePicker />
      </div>
    </div>
  );
}
