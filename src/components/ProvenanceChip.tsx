import { Globe, ShieldCheck } from 'lucide-react';
import type { Provenance } from '../api/types';
import { useI18n } from '../i18n/useI18n';
import styles from './ProvenanceChip.module.css';

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  const { t } = useI18n();
  const approved = provenance === 'approved';

  return (
    <span className={approved ? styles.chip : `${styles.chip} ${styles.external}`}>
      {approved ? (
        <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Globe size={13} strokeWidth={1.75} aria-hidden="true" />
      )}
      {approved ? t('provenance.approved') : t('provenance.external')}
    </span>
  );
}
