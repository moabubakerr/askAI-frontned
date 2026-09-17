import { CornerDownRight } from 'lucide-react';
import type { Inheritance } from '../api/types';
import { LocalizedText } from '../i18n/LocalizedText';
import { useI18n } from '../i18n/useI18n';
import styles from './InheritanceBanner.module.css';

interface Props {
  inherited: Inheritance;
  onReject: () => void;
}

/** A wrong inheritance must be obvious to the reader rather than silent. */
export function InheritanceBanner({ inherited, onReject }: Props) {
  const { t, dir } = useI18n();

  return (
    <div className={styles.banner}>
      <CornerDownRight
        size={15}
        strokeWidth={1.75}
        aria-hidden="true"
        className={styles.icon}
        style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
      />

      <div className={styles.body}>
        <p className={styles.title}>{t('inheritance.title')}</p>
        <dl className={styles.pairs}>
          <div className={styles.pair}>
            <dt>{t('inheritance.carried')}</dt>
            <dd className={styles.mono}>
              <LocalizedText text={inherited.carried} />
            </dd>
          </div>
          {inherited.changed.length > 0 ? (
            <div className={styles.pair}>
              <dt>{t('inheritance.changed')}</dt>
              <dd className={styles.mono}>
                {inherited.changed.map((change, index) => (
                  <span key={index} className={styles.change}>
                    <LocalizedText text={change} />
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <button type="button" className={styles.reject} onClick={onReject}>
        {t('inheritance.notThis')}
      </button>
    </div>
  );
}
