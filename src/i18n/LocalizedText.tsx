import { Fragment } from 'react';
import { splitRuns } from './formatNumber';
import { useI18n } from './useI18n';

/**
 * Renders backend prose exactly as it arrived. The only thing done to it is
 * bidi isolation of Latin-script runs, so an English indicator name inside an
 * Arabic sentence does not reorder the line. No numeral, separator or sign is
 * rewritten — the service composed the sentence once, in the requested
 * language, and this renders those characters.
 */
export function LocalizedText({ text }: { text: string }) {
  const { lang } = useI18n();
  const runs = splitRuns(text, lang);

  return (
    <>
      {runs.map((run, i) =>
        run.ltr ? (
          <span key={i} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {run.text}
          </span>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
