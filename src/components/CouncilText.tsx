import { Quote } from 'lucide-react';
import type { ReactNode } from 'react';
import { bulletLines, nonBulletText, replyDir } from '../api/types';
import { Inline } from '../i18n/ProseText';
import styles from './CouncilText.module.css';

/**
 * The Council's own writing, wherever it appears.
 *
 * Analyst commentary and article excerpts both come back verbatim, and both
 * must read as quoted, attributed content — visibly not the app's voice and
 * visibly not generated prose. One component, so the two can never drift apart:
 * the moment they look alike, generated text starts borrowing the Council's
 * authority.
 */
export function CouncilText({
  attribution,
  meta,
  children,
}: {
  attribution: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className={styles.block}>
      <figcaption className={styles.attribution}>
        <Quote size={12} strokeWidth={2} aria-hidden="true" />
        {attribution}
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </figcaption>
      {children}
    </figure>
  );
}

/**
 * A passage of Council text. "• " lines become a list; everything else keeps
 * its own line breaks, because the service wrote them.
 */
export function CouncilProse({ text, label }: { text: string; label?: string }) {
  const bullets = bulletLines(text);
  const lead = nonBulletText(text);

  return (
    <div className={styles.prose} dir={replyDir(text)}>
      {label ? <span className={styles.label}>{label}</span> : null}
      {lead ? (
        <p className={styles.lead}>
          <Inline text={lead} />
        </p>
      ) : null}
      {bullets.length > 0 ? (
        <ul className={styles.bullets}>
          {bullets.map((line, index) => (
            <li key={index}>
              <Inline text={line} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
