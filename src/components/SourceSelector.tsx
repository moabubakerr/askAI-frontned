import { useI18n } from '../i18n/useI18n';
import { useConversation, type SourceChoice } from '../state/useConversation';
import { Segmented } from './Segmented';

export function SourceSelector() {
  const { t } = useI18n();
  const { source, setSource } = useConversation();

  return (
    <Segmented<SourceChoice>
      label={t('composer.sourceGroup')}
      size="compact"
      value={source}
      onChange={setSource}
      options={[
        { value: 'approved', label: t('source.approved'), hint: t('source.approvedHint') },
        { value: 'external', label: t('source.external'), hint: t('source.externalHint') },
        { value: 'combined', label: t('source.combined'), hint: t('source.combinedHint') },
      ]}
    />
  );
}
