import { useState, type FormEvent } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import { SourceSelector } from './SourceSelector';
import styles from './Composer.module.css';

export function Composer() {
  const { t, lang, dir } = useI18n();
  const { ask, reset, busy, turns } = useConversation();
  const [draft, setDraft] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    ask(draft, lang);
    setDraft('');
  }

  return (
    <div className={styles.dock}>
      <form className={styles.inner} onSubmit={onSubmit}>
        <div className={styles.row}>
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
          <button
            type="submit"
            className={styles.send}
            disabled={busy || draft.trim().length === 0}
          >
            {t('composer.send')}
            <ArrowRight
              size={15}
              strokeWidth={1.75}
              aria-hidden="true"
              style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
            />
          </button>
        </div>

        <div className={styles.row}>
          <SourceSelector />
          <button
            type="button"
            className={styles.reset}
            onClick={reset}
            disabled={turns.length === 0}
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            {t('composer.new')}
          </button>
        </div>
      </form>
    </div>
  );
}
