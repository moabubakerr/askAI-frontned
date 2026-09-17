import { useEffect, useRef, useState } from 'react';
import { Composer } from './components/Composer';
import { Header } from './components/Header';
import { SubBar } from './components/SubBar';
import { Thread } from './components/Thread';
import { formatNumber } from './i18n/formatNumber';
import { useI18n } from './i18n/useI18n';
import { useConversation } from './state/useConversation';
import styles from './App.module.css';

/** One polite live region for the whole thread. */
function Announcer() {
  const { t, lang } = useI18n();
  const { turns } = useConversation();
  const [message, setMessage] = useState('');
  const announced = useRef(-1);

  useEffect(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i];
      if (turn && turn.status === 'ready' && turn.index > announced.current) {
        announced.current = turn.index;
        setMessage(t('a11y.answerReady', { n: formatNumber(turn.index + 1, lang) }));
        return;
      }
    }
  }, [turns, t, lang]);

  return (
    <p className="visually-hidden" role="status" aria-live="polite">
      {message}
    </p>
  );
}

export function App() {
  const { t } = useI18n();

  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#composer-input">
        {t('app.skipToComposer')}
      </a>
      <Header />
      <SubBar />
      <main className={styles.canvas}>
        <Thread />
      </main>
      <Composer />
      <Announcer />
    </div>
  );
}
