import styles from './Loader.module.css';

/**
 * The wait, without the commentary.
 *
 * An answer takes a few seconds and the first one after a restart takes longer,
 * but saying so in words puts the delay in front of the reader and makes it feel
 * longer than it is. The motion carries that on its own.
 *
 * The label is kept for screen readers, which have no animation to read.
 */
export function Loader({ label, size = 'default' }: { label: string; size?: 'default' | 'small' }) {
  return (
    <p className={size === 'small' ? `${styles.loader} ${styles.small}` : styles.loader}>
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      <span className="visually-hidden" role="status">
        {label}
      </span>
    </p>
  );
}
