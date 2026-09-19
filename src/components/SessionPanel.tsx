import { useState } from 'react';
import { getSession } from '../api/client';
import type { SessionState } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import { useConversation } from '../state/useConversation';
import styles from './SessionPanel.module.css';

/**
 * What the server remembers for this session.
 *
 * Follow-ups now resolve server-side, which is invisible from here: an answer
 * that inherited the wrong indicator looks exactly like one that did not. This
 * is the affordance for checking, and it fetches only when opened.
 */
export function SessionPanel() {
  const { t } = useI18n();
  const { sessionId } = useConversation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setState(await getSession(sessionId));
    setLoading(false);
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={toggle}>
        {t('session.title')}
      </button>

      {open ? (
        <div className={styles.body}>
          <p className={styles.id}>{sessionId}</p>
          {loading ? <p className={styles.empty}>{t('session.loading')}</p> : null}
          {!loading && state === null ? <p className={styles.empty}>{t('session.none')}</p> : null}
          {!loading && state !== null ? (
            <pre className={styles.dump}>{JSON.stringify(state, null, 2)}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
