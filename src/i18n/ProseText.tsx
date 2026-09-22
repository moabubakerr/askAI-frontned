import { Fragment, type ReactNode } from 'react';
import { LocalizedText } from './LocalizedText';
import styles from './ProseText.module.css';

/**
 * The service's prose, which carries a little Markdown: `**bold**` for the
 * indicator name at the head of a line, and `- ` or `• ` bullets for a list.
 * Rendered as plain text those become literal asterisks and hyphens on screen.
 *
 * This understands exactly those two things and nothing else. It is not a
 * Markdown renderer and never produces HTML from the response: every fragment
 * goes through `LocalizedText`, which renders text nodes, so a stray `<script>`
 * in an answer stays the characters it was.
 *
 * Anything it does not recognise — a heading, a link, a table — is left as the
 * literal text the service sent, which is wrong-looking but never wrong.
 */
export function ProseText({ text }: { text: string }) {
  return <>{blocks(text)}</>;
}

const BULLET = /^\s*(?:[-*•])\s+(.*)$/;

/** Group consecutive bullet lines into one list; everything else is a paragraph. */
function blocks(text: string): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];

  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    out.push(
      <ul key={`ul-${out.length}`} className={styles.list}>
        {items.map((item, index) => (
          <li key={index}>
            <Inline text={item} />
          </li>
        ))}
      </ul>,
    );
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const body = paragraph.join('\n');
    paragraph = [];
    out.push(
      <p key={`p-${out.length}`} className={styles.paragraph}>
        <Inline text={body} />
      </p>,
    );
  };

  for (const line of lines) {
    const bullet = line.match(BULLET);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1] ?? '');
      continue;
    }

    if (line.trim() === '') {
      flushBullets();
      flushParagraph();
      continue;
    }

    flushBullets();
    paragraph.push(line);
  }

  flushBullets();
  flushParagraph();

  return out;
}

const BOLD = /\*\*([^*]+)\*\*/g;

/** `**bold**` only. Everything else is text. */
export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  BOLD.lastIndex = 0;
  let match = BOLD.exec(text);
  while (match !== null) {
    if (match.index > cursor) {
      parts.push(<LocalizedText key={parts.length} text={text.slice(cursor, match.index)} />);
    }
    parts.push(
      <strong key={parts.length}>
        <LocalizedText text={match[1] ?? ''} />
      </strong>,
    );
    cursor = match.index + match[0].length;
    match = BOLD.exec(text);
  }

  if (cursor < text.length) {
    parts.push(<LocalizedText key={parts.length} text={text.slice(cursor)} />);
  }

  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}
