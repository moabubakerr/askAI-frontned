export const en = {
  'app.brand': 'Supreme Council for Economic Affairs and Investment',
  'app.brandShort': 'SCEAI',
  'app.product': 'Ask AI',
  'app.skipToComposer': 'Skip to the question box',

  'header.account': 'Account',

  'health.up': 'Service responding',
  'health.down': 'Service not responding',
  'health.caveat': 'The process is up. This does not prove the data or models are reachable.',

  'session.title': 'Session',
  'session.loading': 'Reading the server’s memory…',
  'session.none': 'The server remembers nothing for this session yet.',

  'composer.label': 'Your question',
  'composer.placeholder': 'Ask about a published indicator',
  'composer.send': 'Ask',
  'composer.new': 'New conversation',

  'turn.number': 'Question {n}',
  'turn.loading': 'Reading the approved dataset — this can take a few seconds',
  'turn.error': 'The request did not complete. {message}',
  'turn.timeout': 'The service did not answer in time. The first question after a restart is slower than the rest.',
  'turn.retry': 'Ask again',

  'answer.unverified': 'Wording checked and replaced with a plain template. The data is unchanged.',
  'answer.choose': 'Which one did you mean?',

  'facts.period': 'Period',
  'facts.periodUsed': 'Period used',
  'facts.value': 'Value',
  'facts.target': 'Target',
  'facts.unit': 'Unit',
  'facts.indicator': 'Indicator',
  'facts.indicatorCount': 'Published indicators',
  'facts.points': 'Published points',
  'facts.country': 'Country',
  'facts.rank': '#',
  'facts.count': 'Count',
  'facts.high': 'Highest · {period}',
  'facts.low': 'Lowest · {period}',
  'facts.difference': 'Difference',
  'facts.change': 'Change',
  'facts.percentChange': 'Percent change',
  'facts.growthRate': 'Growth rate',
  'facts.method': 'Method',
  'facts.order': 'Order',
  'facts.noDataFor': 'No approved data for',
  'read.action': 'Read this for me',
  'read.title': 'Read this for me',
  'read.loading': 'Reading…',
  'read.retry': 'Try reading it again',
  'read.council': 'According to SCAI',
  'read.councilWithPeriod': 'According to SCAI, {period}',
  'read.evidence': 'Data evidence',
  'read.disclaimerFallback': 'Generated from the readings above — not Council analysis.',

  'analysis.attribution': 'SCAI analyst commentary',
  'analysis.detailed': 'In detail',
  'analysis.npc': 'NPC analysis',
  'analysis.benchmark': 'Benchmark',

  'passages.topic': 'Searched for',
  'passages.show': 'Show sources ({n})',
  'passages.attribution': 'From a SCAI article',

  'citations.title': 'Sources',
  'citations.catalogEntry': 'Catalog entry',
  'citations.raw': 'Working data',

  'chart.group': 'Chart view',
  'chart.view.line': 'Line',
  'chart.view.bar': 'Bar',
  'chart.view.table': 'Table',
  'chart.colPeriod': 'Period',
  'chart.colValue': 'Value',
  'chart.missingCountries': 'Not shown, no approved data: {countries}',

  'firstrun.heading': 'Ask about Qatar’s published economic indicators.',
  'firstrun.q1': 'What is the latest value of Real GDP?',
  'firstrun.q2': 'Show the Real GDP trend over time',
  'firstrun.q3': 'What does inflation mean?',
  'firstrun.q4': 'Compare Real GDP across Qatar and Saudi Arabia',
  'firstrun.q5': 'What was the growth rate of Real GDP?',
  'firstrun.q6': 'What can you do?',

  'a11y.answerReady': 'Answer ready for question {n}',
  'a11y.asking': 'Asking question {n}',
} as const;

export type Dict = Record<keyof typeof en, string>;
export type MsgKey = keyof typeof en;
