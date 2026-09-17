import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Lang } from '../api/types';
import { App } from '../App';
import { I18nProvider } from '../i18n/useI18n';
import { ConversationProvider } from '../state/useConversation';

export function renderApp(lang: Lang = 'en') {
  const user = userEvent.setup();
  const utils = render(
    <I18nProvider initialLang={lang}>
      <ConversationProvider>
        <App />
      </ConversationProvider>
    </I18nProvider>,
  );
  return { user, ...utils };
}
