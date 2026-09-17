export const en = {
  'app.brand': 'Supreme Council for Economic Affairs and Investment',
  'app.brandShort': 'SCEAI',
  'app.product': 'Ask AI',
  'app.skipToComposer': 'Skip to the question box',

  'header.langGroup': 'Interface language',
  'header.langEn': 'English',
  'header.langAr': 'العربية',
  'header.account': 'Account',

  'lens.group': 'Lens',
  'lens.explore': 'Explore data',
  'lens.executive': 'Executive lens',
  'lens.openExplore': 'Open in Explore data',

  'freshness.group': 'Data freshness',
  'freshness.fresh': 'Refreshed {time}',
  'freshness.stale': 'Overdue by {duration}',
  'freshness.never': 'Never refreshed',
  'freshness.staleBadge': 'Stale data',

  'composer.label': 'Your question',
  'composer.placeholder': 'Ask about a published indicator',
  'composer.send': 'Ask',
  'composer.new': 'New question',
  'composer.sourceGroup': 'Source',

  'source.approved': 'SCEAI Indicators',
  'source.external': 'Oxford Economics',
  'source.combined': 'Combined — never blended',
  'source.approvedHint': 'Approved published rows only',
  'source.externalHint': 'Third-party content only',
  'source.combinedHint': 'Both, side by side, nothing reconciled',

  'turn.number': 'Question {n}',
  'turn.askedAgainst': 'Asked against {source}',
  'turn.loading': 'Reading published rows',
  'turn.error': 'The request did not complete. {message}',
  'turn.rejected': 'The service rejected this request, so nothing was answered. {message}',
  'turn.retry': 'Ask again',
  'turn.resolved': 'Completed with {name}',

  'provenance.approved': 'Approved published data',
  'provenance.external': 'External · Oxford Economics',

  'class.measured': 'Measured',
  'class.derived': 'Derived',
  'class.attributed': 'Analyst note',
  'class.article': 'Article',
  'class.external': 'External',
  'class.absent': 'Not published',

  'scope.asOf': 'As of {period}',

  /* Slot names and binding reasons are open vocabularies: an unknown key falls
     back to the service's own wording rather than being renamed here. */
  'slot.detail': 'indicator',
  'slot.period': 'period',
  'slot.country_scope': 'country',
  'slot.measure': 'measure',
  'slot.operation': 'operation',
  'boundby.named-in-question': 'named in the question',
  'boundby.rule-default': 'rule default',
  'boundby.semantic-match': 'semantic match',
  'boundby.carried-from-previous-turn': 'carried over',
  'boundby.reader': 'chosen by the reader',

  'basis.title': 'Basis',
  'analysis.title': 'Published analysis',

  'evidence.show': 'Show published rows',
  'evidence.hide': 'Hide published rows',
  'evidence.note':
    'Headline figures are rounded for display. The rows below are at full published precision — the difference is intentional.',
  'evidence.colIndicator': 'Indicator',
  'evidence.colPeriod': 'Period',
  'evidence.colValue': 'Published value',
  'evidence.colPublisher': 'Publishing source',
  'evidence.colRef': 'Row reference',

  'chart.group': 'Chart view',
  'chart.view.line': 'Line',
  'chart.view.bar': 'Bar',
  'chart.view.table': 'Table',
  'chart.colPeriod': 'Period',
  'chart.colValue': 'Value',

  'degradations.title': 'What was changed to answer this',
  'degradation.grain_changed': 'Grain changed',
  'degradation.period_changed': 'Period changed',
  'degradation.country_changed': 'Country scope changed',

  'caveat.label': 'Caveat',

  /* The state, not the wording: every refusal sentence comes from the service. */
  'refusal.title': 'Nothing published to answer from',

  'external.title': 'External · Oxford Economics',
  'external.outcome.success': 'Answered',
  'external.outcome.timeout': 'Timed out',
  'external.outcome.unavailable': 'Unavailable',
  'external.outcome.abandoned': 'Abandoned',
  'external.elapsed': '{seconds}s',
  'external.checkTitle': 'Checked against published data',
  'external.band': 'Band',
  'external.limits': 'Limits',
  'external.found': 'Found',
  'external.beyond': 'Beyond the band',

  'suggestions.title': 'Next step',

  'clarification.title': 'Which indicator?',
  'clarification.lead': 'Pick one and the question completes against it.',
  'clarification.followUp': 'Or say more — the answer continues this conversation.',
  'clarification.followUpCta': 'Reply to this',
  'clarification.latest': 'Latest published',
  'clarification.noLatest': 'Nothing published yet',
  'clarification.pick': 'Use {name}',

  'inheritance.title': 'Carried over from the previous question',
  'inheritance.carried': 'Carried over',
  'inheritance.changed': 'Changed',
  'inheritance.notThis': 'Not this indicator',

  'firstrun.heading': 'Ask about Qatar’s published economic indicators.',
  'firstrun.q1': 'What was CPI inflation in April 2026?',
  'firstrun.q2': 'Show total goods exports since 2018',
  'firstrun.q3': 'How did GDP change from Q1 to Q2 2025?',
  'firstrun.q4': 'What is the inflation rate?',
  'firstrun.q5': 'What is the GDP growth forecast for 2027?',
  'firstrun.q6': 'Compare female labour force participation with the GCC',

  'a11y.answerReady': 'Answer ready for question {n}',
  'a11y.asking': 'Reading published rows for question {n}',
} as const;

export type Dict = Record<keyof typeof en, string>;
export type MsgKey = keyof typeof en;
