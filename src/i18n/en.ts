export const en = {
  'app.brand': 'Supreme Council for Economic Affairs and Investment',
  'app.brandShort': 'SCEAI',
  'app.brandAr': 'المجلس الأعلى للشؤون الاقتصادية والاستثمار',
  'app.product': 'Ask AI',
  'app.skipToComposer': 'Skip to the question box',

  'header.home': 'Start a new conversation',
  'header.account': 'Account',




  'composer.label': 'Your question',
  'composer.placeholder': 'Ask about a published indicator',
  'composer.send': 'Ask',
  'composer.new': 'New conversation',

  'turn.number': 'Question {n}',
  'turn.loading': 'Reading the approved dataset — this can take a few seconds',
  'turn.error': 'The request did not complete. {message}',
  'turn.timeout': 'The service did not answer in time.',
  'stage.understanding': 'Understanding the question',
  'stage.routed': 'Choosing how to answer',
  'stage.resolved': 'Found the indicator',
  'stage.resolvedWith': 'Looking up {indicator}',
  'stage.retrieving': 'Retrieving the data',
  'stage.composing': 'Composing the answer',
  'stage.verifying': 'Checking the figures',
  'turn.jump': 'Jump to answer',
  'turn.retry': 'Ask again',

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
  'facts.first': 'First · {period}',
  'facts.last': 'Latest · {period}',
  'facts.high': 'Highest · {period}',
  'facts.low': 'Lowest · {period}',
  'facts.difference': 'Difference',
  'facts.change': 'Change',
  'facts.percentChange': 'Percent change',
  'facts.growthRate': 'Growth rate',
  'facts.method': 'Method',
  'facts.order': 'Order',
  'facts.yoy': 'YoY',
  'facts.notFound': 'Not found',
  'facts.scanned': '{n} readings scanned',
  'facts.extremum.highest': 'Highest reading',
  'facts.extremum.lowest': 'Lowest reading',
  'facts.vsYearEarlier': 'vs a year earlier',
  'facts.noDataFor': 'No approved data for',
  'read.action': 'Read this for me',
  'read.hide': 'Hide the retelling',
  'read.title': 'Read this for me',
  'read.loading': 'Reading it out — this takes longer than an answer',
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

  'read.councilAttached': 'SCAI commentary attached to the {period} data point',
  'read.periodMismatch': 'This commentary refers to a different period than the data point it is filed against.',

  'direction.rose': 'Rose ({n})',
  'direction.fell': 'Fell ({n})',
  'direction.unchanged': 'Unchanged ({n})',
  'direction.noComparison': 'No year-on-year comparison available for {n} of {total}',

  'ranking.rankedOf': '{n} of {total} ranked',
  'ranking.notAssessable': '{n} of {total} could not be ranked',
  'ranking.targetFor': 'target for {year}',
  'ranking.order.best_first': 'Best first',
  'ranking.order.worst_first': 'Worst first',
  'ranking.polarity.Increase': 'higher is better',
  'ranking.polarity.Decrease': 'lower is better',

  'feedback.question': 'Was this answer useful?',
  'feedback.rate': 'Rate {n} out of 5',
  'feedback.commentLabel': 'What was wrong with it?',
  'feedback.commentPlaceholder': 'for example, wrong period',
  'feedback.submit': 'Send rating',
  'feedback.thanks': 'Thank you, your rating was recorded.',
  'feedback.failed': 'The rating could not be sent.',

  'citations.title': 'Sources',
  'citations.catalogEntry': 'Catalog entry',

  'chart.group': 'Chart view',
  'chart.view.line': 'Line',
  'chart.view.bar': 'Bar',
  'chart.view.table': 'Table',
  'chart.colPeriod': 'Period',
  'chart.colValue': 'Value',
  'chart.missingCountries': 'Not shown, no approved data: {countries}',

  'firstrun.q1': 'What is the latest value of Real GDP?',
  'firstrun.q2': 'Show the Real GDP trend over time',
  'firstrun.q3': 'What does inflation mean?',
  'firstrun.q4': 'What’s the latest in Qatar’s economy?',
  'firstrun.q5': 'What was the growth rate of Real GDP?',
  'firstrun.q6': 'What can you do?',

  'lens.group': 'Reading depth',
  'lens.executive': 'Executive Lens',
  'lens.executiveHint': 'Concise summaries for decision-makers',
  'lens.explore': 'Explore Data',
  'lens.exploreHint': 'Full detail: charts, evidence and related content',

  'source.name': 'SCEAI Indicators',

  'firstrun.welcome': 'Welcome to Ask AI',
  'firstrun.intro':
    'Ask about Qatar’s economic indicators and their approved descriptions. Every value comes from the approved indicator database — never estimated.',
  'firstrun.priority': 'Priority questions',
  'firstrun.note': 'Responses are based on the approved indicator data warehouse.',
  'firstrun.help': 'Help',
  'firstrun.footnote':
    'Ask AI is an assistive layer. Verify figures against the Economic Monitoring Dashboard as the source of truth.',


  'a11y.answerReady': 'Answer ready for question {n}',
  'a11y.asking': 'Asking question {n}',
} as const;

export type Dict = Record<keyof typeof en, string>;
export type MsgKey = keyof typeof en;
