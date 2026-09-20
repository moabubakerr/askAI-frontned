import { useConversation, type Lens } from '../state/useConversation';
import { useI18n } from '../i18n/useI18n';
import styles from './LensCards.module.css';

/**
 * The two reading depths, as cards.
 *
 * Both are the same answer: the lens decides how much of it is on screen, never
 * what was asked, so switching never costs a round trip.
 */
export function LensCards() {
  const { t } = useI18n();
  const { lens, setLens } = useConversation();

  const options: { value: Lens; title: string; description: string }[] = [
    { value: 'executive', title: t('lens.executive'), description: t('lens.executiveHint') },
    { value: 'explore', title: t('lens.explore'), description: t('lens.exploreHint') },
  ];

  return (
    <div className={styles.cards} role="radiogroup" aria-label={t('lens.group')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={lens === option.value}
          className={styles.card}
          onClick={() => setLens(option.value)}
        >
          <span className={styles.title}>{option.title}</span>
          <span className={styles.description}>{option.description}</span>
        </button>
      ))}
    </div>
  );
}
