import {
  asOfPeriod,
  isDeferredPeriod,
  periodRange,
  unboundReason,
  type AnswerElement,
  type AnswerSpec,
} from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './ScopeLine.module.css';

interface Props {
  scope: AnswerElement | undefined;
  spec: AnswerSpec;
}

/**
 * Permanent, in both lenses. The same indicator publishes different figures at
 * different frequencies, so the reader must never have to guess which question
 * was answered.
 *
 * "As of" comes from `resolved_period`: when the question said "now", the spec
 * defers the period and the service reports what that actually resolved to.
 * That is the most common question about an answer, so it is always on screen.
 */
export function ScopeLine({ scope, spec }: Props) {
  const { t, tOpen } = useI18n();

  const range = periodRange(spec);
  const asOf = asOfPeriod(spec);
  const deferred = isDeferredPeriod(spec);
  const unbound = unboundReason(spec.detail_id);
  const countries = spec.countries ?? [];
  const boundBy = Object.entries(spec.bound_by);

  return (
    <div className={styles.scope}>
      {scope?.text ? (
        <span className={styles.text}>
          <LocalizedText text={scope.text} />
        </span>
      ) : null}

      {/* A span, when the question covers one. `resolved_period` only reports
          where it ends. */}
      {range ? (
        <span className={styles.asOf}>
          {t('scope.range', { start: range.start, end: range.end })}
        </span>
      ) : asOf ? (
        <span className={styles.asOf} data-deferred={deferred ? 'true' : undefined}>
          {t('scope.asOf', { period: asOf })}
        </span>
      ) : null}

      {countries.length > 0 ? (
        <span className={styles.countries}>{countries.join(' · ')}</span>
      ) : null}

      {unbound ? <span className={styles.unbound}>{unbound}</span> : null}

      {/* bound_by is an open vocabulary: an unknown key or value is shown raw
          rather than dropped or renamed. */}
      {boundBy.length > 0 ? (
        <span className={styles.bound}>
          {boundBy.map(([slot, how]) => (
            <span key={slot} className={styles.boundPair}>
              {tOpen(`slot.${slot}`, slot)}
              <span className={styles.boundHow}>{tOpen(`boundby.${how}`, how)}</span>
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
