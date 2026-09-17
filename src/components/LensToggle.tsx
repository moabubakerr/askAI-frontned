import { useI18n } from '../i18n/useI18n';
import { useConversation, type Lens } from '../state/useConversation';
import { Segmented } from './Segmented';

/**
 * Purely a re-render of what is already in memory. One request returned
 * everything both lenses show, so the two can never disagree about a figure.
 */
export function LensToggle() {
  const { t } = useI18n();
  const { lens, setLens } = useConversation();

  return (
    <Segmented<Lens>
      label={t('lens.group')}
      value={lens}
      onChange={setLens}
      options={[
        { value: 'explore', label: t('lens.explore') },
        { value: 'executive', label: t('lens.executive') },
      ]}
    />
  );
}
