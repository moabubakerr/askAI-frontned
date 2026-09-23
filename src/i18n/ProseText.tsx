import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ProseText.module.css';

/**
 * The service's prose, which is Markdown by contract.
 *
 * A real parser rather than a pattern match: the answers are bilingual and carry
 * indicator names that came from a catalogue, so an asterisk or an underscore
 * can appear inside the text itself. Matching `**` by hand gets that wrong in
 * exactly the cases that matter.
 *
 * Raw HTML in the response is **not** rendered — `react-markdown` ignores it
 * unless `rehype-raw` is added, which it deliberately is not. So an answer
 * cannot put markup, let alone a script, into the page. That is the whole
 * sanitisation story: nothing is ever passed to `dangerouslySetInnerHTML`.
 *
 * The contract says no headings, tables, nested lists, code blocks, links or
 * images. They are parsed anyway, and styled quietly, because rendering
 * something unexpected badly is better than rendering it as raw characters —
 * but no layout here depends on them.
 */
export function ProseText({ text }: { text: string }) {
  return (
    <div className={styles.prose}>
      <Markdown remarkPlugins={[remarkGfm]}>{normalizeBullets(text)}</Markdown>
    </div>
  );
}

/**
 * The service writes list items with `-` **or** `•`, but Markdown only knows
 * the first: a `•` line parses as ordinary text and the list collapses into a
 * paragraph. Rewriting the marker at the start of a line is the one liberty
 * taken with the response, and it touches nothing else — a bullet inside a
 * sentence is left alone.
 */
function normalizeBullets(text: string): string {
  return text.replace(/^([ 	]*)[•·]\s+/gm, '$1- ');
}
