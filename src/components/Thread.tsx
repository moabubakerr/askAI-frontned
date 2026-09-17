import { useEffect, useRef } from 'react';
import { useConversation } from '../state/useConversation';
import { FirstRun } from './FirstRun';
import { Turn } from './Turn';
import styles from './Thread.module.css';

/** The whole conversation lives in the canvas. There is no side history panel. */
export function Thread() {
  const { turns } = useConversation();
  const endRef = useRef<HTMLDivElement>(null);
  const count = turns.length;

  useEffect(() => {
    if (count === 0) return;
    const end = endRef.current;
    if (typeof end?.scrollIntoView !== 'function') return;
    end.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [count]);

  if (count === 0) return <FirstRun />;

  return (
    <div className={styles.thread}>
      {turns.map((turn) => (
        <Turn key={turn.index} turn={turn} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
