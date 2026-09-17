import type { Dict } from './en';

export const ar: Dict = {
  'app.brand': 'المجلس الأعلى للشؤون الاقتصادية والاستثمار',
  'app.brandShort': 'المجلس الأعلى',
  'app.product': 'اسأل الذكاء الاصطناعي',
  'app.skipToComposer': 'انتقل إلى مربع السؤال',

  'header.langGroup': 'لغة الواجهة',
  'header.langEn': 'English',
  'header.langAr': 'العربية',
  'header.account': 'الحساب',

  'lens.group': 'العدسة',
  'lens.explore': 'استكشاف البيانات',
  'lens.executive': 'العدسة التنفيذية',
  'lens.openExplore': 'افتح في استكشاف البيانات',

  'freshness.group': 'حداثة البيانات',
  'freshness.fresh': 'حُدِّثت {time}',
  'freshness.stale': 'متأخرة بمقدار {duration}',
  'freshness.never': 'لم تُحدَّث قط',
  'freshness.staleBadge': 'بيانات قديمة',

  'composer.label': 'سؤالك',
  'composer.placeholder': 'اسأل عن مؤشر منشور',
  'composer.send': 'اسأل',
  'composer.new': 'سؤال جديد',
  'composer.sourceGroup': 'المصدر',

  'source.approved': 'مؤشرات المجلس الأعلى',
  'source.external': 'أوكسفورد إيكونوميكس',
  'source.combined': 'مجتمعة — دون دمج',
  'source.approvedHint': 'السجلات المنشورة المعتمدة فقط',
  'source.externalHint': 'محتوى الطرف الثالث فقط',
  'source.combinedHint': 'كلاهما جنبًا إلى جنب، دون توفيق بينهما',

  'turn.number': 'السؤال {n}',
  'turn.askedAgainst': 'طُرح على {source}',
  'turn.loading': 'قراءة السجلات المنشورة',
  'turn.error': 'لم يكتمل الطلب. {message}',
  'turn.rejected': 'رفضت الخدمة هذا الطلب، فلم تُقدَّم أي إجابة. {message}',
  'turn.retry': 'اسأل مرة أخرى',
  'turn.resolved': 'اكتمل باستخدام {name}',

  'provenance.approved': 'بيانات منشورة معتمدة',
  'provenance.external': 'خارجي · أوكسفورد إيكونوميكس',

  'class.measured': 'مقيس',
  'class.derived': 'مشتق',
  'class.attributed': 'ملاحظة محلل',
  'class.article': 'مقال',
  'class.external': 'خارجي',
  'class.absent': 'غير منشور',

  'scope.asOf': 'حتى {period}',
  'scope.range': '{start}–{end}',

  'slot.detail': 'المؤشر',
  'slot.period': 'الفترة',
  'slot.country_scope': 'النطاق القُطري',
  'slot.measure': 'القياس',
  'slot.operation': 'العملية',
  'boundby.named-in-question': 'مذكور في السؤال',
  'boundby.rule-default': 'قاعدة افتراضية',
  'boundby.semantic-match': 'مطابقة دلالية',
  'boundby.carried-from-previous-turn': 'مُرحَّل',
  'boundby.reader': 'اختيار القارئ',

  'basis.title': 'الأساس',
  'analysis.title': 'التحليل المنشور',
  'series.title': 'السجلات المنشورة',

  'evidence.show': 'إظهار السجلات المنشورة',
  'evidence.hide': 'إخفاء السجلات المنشورة',
  'evidence.note':
    'الأرقام الرئيسية مُقرَّبة للعرض. السجلات أدناه بدقة النشر الكاملة — والفارق مقصود.',
  'evidence.colIndicator': 'المؤشر',
  'evidence.colPeriod': 'الفترة',
  'evidence.colValue': 'القيمة المنشورة',
  'evidence.colPublisher': 'جهة النشر',
  'evidence.colRef': 'مرجع السجل',

  'chart.group': 'عرض الرسم',
  'chart.view.line': 'خطي',
  'chart.view.bar': 'أعمدة',
  'chart.view.table': 'جدول',
  'chart.colPeriod': 'الفترة',
  'chart.colValue': 'القيمة',

  'degradations.title': 'ما غُيِّر للإجابة عن هذا',
  'degradation.grain_changed': 'تغيّرت الدقة الزمنية',
  'degradation.period_changed': 'تغيّرت الفترة',
  'degradation.country_changed': 'تغيّر النطاق القُطري',

  'caveat.label': 'تحفّظ',

  'refusal.title': 'لا يوجد منشور يُجاب منه',

  'external.title': 'خارجي · أوكسفورد إيكونوميكس',
  'external.outcome.success': 'أجاب',
  'external.outcome.timeout': 'انتهت المهلة',
  'external.outcome.unavailable': 'غير متاح',
  'external.outcome.abandoned': 'أُلغي',
  'external.elapsed': '{seconds} ث',
  'external.checkTitle': 'مقارنة بالبيانات المنشورة',
  'external.band': 'النطاق',
  'external.limits': 'الحدود',
  'external.found': 'ما وُجد',
  'external.beyond': 'خارج النطاق',

  'suggestions.title': 'الخطوة التالية',

  'clarification.title': 'أي مؤشر؟',
  'clarification.lead': 'اختر واحدًا ليكتمل السؤال بناءً عليه.',
  'clarification.followUp': 'أو أضف تفصيلًا — تكمل الإجابة هذه المحادثة.',
  'clarification.followUpCta': 'الرد على هذا',
  'clarification.latest': 'آخر ما نُشر',
  'clarification.noLatest': 'لم يُنشر شيء بعد',
  'clarification.pick': 'استخدم {name}',

  'inheritance.title': 'مُرحَّل من السؤال السابق',
  'inheritance.carried': 'المُرحَّل',
  'inheritance.changed': 'المُتغيِّر',
  'inheritance.notThis': 'ليس هذا المؤشر',

  'firstrun.heading': 'اسأل عن المؤشرات الاقتصادية المنشورة في قطر.',
  'firstrun.q1': 'ما تضخم أسعار المستهلك في أبريل 2026؟',
  'firstrun.q2': 'اعرض إجمالي صادرات السلع منذ 2018',
  'firstrun.q3': 'كيف تغيّر الناتج المحلي من Q1 إلى Q2 2025؟',
  'firstrun.q4': 'ما معدل التضخم؟',
  'firstrun.q5': 'ما توقع نمو الناتج المحلي الإجمالي لعام 2027؟',
  'firstrun.q6': 'قارن مشاركة المرأة في القوى العاملة مع دول الخليج',

  'a11y.answerReady': 'الإجابة جاهزة للسؤال {n}',
  'a11y.asking': 'قراءة السجلات المنشورة للسؤال {n}',
};
