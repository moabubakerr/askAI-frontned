import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n/useI18n';
import { ConversationProvider } from './state/useConversation';
import './styles/base.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <ConversationProvider>
        <App />
      </ConversationProvider>
    </I18nProvider>
  </StrictMode>,
);
