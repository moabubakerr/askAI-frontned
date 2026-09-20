import type { Dict } from './en';

export const ar: Dict = {
  'app.brand': 'المجلس الأعلى للشؤون الاقتصادية والاستثمار',
  'app.brandShort': 'المجلس الأعلى',
  'app.product': 'اسأل الذكاء الاصطناعي',
  'app.skipToComposer': 'انتقل إلى مربع السؤال',

  'header.home': 'ابدأ محادثة جديدة',
  'header.account': 'الحساب',




  'composer.label': 'سؤالك',
  'composer.placeholder': 'اسأل عن مؤشر منشور',
  'composer.send': 'اسأل',
  'composer.new': 'محادثة جديدة',

  'turn.number': 'السؤال {n}',
  'turn.loading': 'قراءة البيانات المعتمدة — قد يستغرق ذلك بضع ثوانٍ',
  'turn.error': 'لم يكتمل الطلب. {message}',
  'turn.timeout': 'لم تُجب الخدمة في الوقت المتاح. السؤال الأول بعد إعادة التشغيل أبطأ من غيره.',
  'turn.retry': 'اسأل مرة أخرى',

  'answer.choose': 'أيّها تقصد؟',

  'facts.period': 'الفترة',
  'facts.periodUsed': 'الفترة المستخدمة',
  'facts.value': 'القيمة',
  'facts.target': 'المستهدف',
  'facts.unit': 'الوحدة',
  'facts.indicator': 'المؤشر',
  'facts.indicatorCount': 'المؤشرات المنشورة',
  'facts.points': 'النقاط المنشورة',
  'facts.country': 'الدولة',
  'facts.rank': '#',
  'facts.count': 'العدد',
  'facts.first': 'الأولى · {period}',
  'facts.last': 'الأحدث · {period}',
  'facts.high': 'الأعلى · {period}',
  'facts.low': 'الأدنى · {period}',
  'facts.difference': 'الفارق',
  'facts.change': 'التغيّر',
  'facts.percentChange': 'نسبة التغيّر',
  'facts.growthRate': 'معدل النمو',
  'facts.method': 'الطريقة',
  'facts.order': 'الترتيب',
  'facts.yoy': 'سنويًا',
  'facts.notFound': 'غير موجود',
  'facts.scanned': 'فُحصت {n} قراءة',
  'facts.extremum.highest': 'أعلى قراءة',
  'facts.extremum.lowest': 'أدنى قراءة',
  'facts.vsYearEarlier': 'مقارنة بالعام السابق',
  'facts.noDataFor': 'لا توجد بيانات معتمدة لـ',
  'read.action': 'اقرأ هذا نيابة عني',
  'read.title': 'اقرأ هذا نيابة عني',
  'read.loading': 'جارٍ القراءة — يستغرق ذلك وقتًا أطول من الإجابة',
  'read.retry': 'أعد المحاولة',
  'read.council': 'وفقًا للمجلس الأعلى',
  'read.councilWithPeriod': 'وفقًا للمجلس الأعلى، {period}',
  'read.evidence': 'أدلة البيانات',
  'read.disclaimerFallback': 'مُولَّد من القراءات أعلاه — وليس تحليلًا للمجلس.',

  'analysis.attribution': 'تعليق محللي المجلس الأعلى',
  'analysis.detailed': 'بالتفصيل',
  'analysis.npc': 'تحليل مجلس التخطيط الوطني',
  'analysis.benchmark': 'المرجعية',

  'passages.topic': 'البحث عن',
  'passages.show': 'إظهار المصادر ({n})',
  'passages.attribution': 'من مقال للمجلس الأعلى',

  'read.councilAttached': 'تعليق المجلس الأعلى المرفق بنقطة بيانات {period}',
  'read.periodMismatch': 'يشير هذا التعليق إلى فترة مختلفة عن نقطة البيانات المرفق بها.',

  'direction.rose': 'ارتفعت ({n})',
  'direction.fell': 'انخفضت ({n})',
  'direction.unchanged': 'دون تغيّر ({n})',
  'direction.noComparison': 'لا تتوفر مقارنة سنوية لـ {n} من {total}',

  'ranking.rankedOf': 'رُتِّب {n} من {total}',
  'ranking.notAssessable': 'تعذّر ترتيب {n} من {total}',
  'ranking.targetFor': 'مستهدف {year}',
  'ranking.order.best_first': 'الأفضل أولًا',
  'ranking.order.worst_first': 'الأضعف أولًا',
  'ranking.polarity.Increase': 'الأعلى أفضل',
  'ranking.polarity.Decrease': 'الأدنى أفضل',

  'citations.title': 'المصادر',
  'citations.catalogEntry': 'مدخل الفهرس',

  'chart.group': 'عرض الرسم',
  'chart.view.line': 'خطي',
  'chart.view.bar': 'أعمدة',
  'chart.view.table': 'جدول',
  'chart.colPeriod': 'الفترة',
  'chart.colValue': 'القيمة',
  'chart.missingCountries': 'غير معروضة، لا بيانات معتمدة: {countries}',

  'firstrun.q1': 'ما آخر قيمة للناتج المحلي الإجمالي الحقيقي؟',
  'firstrun.q2': 'اعرض اتجاه الناتج المحلي الإجمالي الحقيقي عبر الزمن',
  'firstrun.q3': 'ما معنى التضخم؟',
  'firstrun.q4': 'ما آخر مستجدات الاقتصاد القطري؟',
  'firstrun.q5': 'ما معدل نمو الناتج المحلي الإجمالي الحقيقي؟',
  'firstrun.q6': 'ماذا يمكنك أن تفعل؟',

  'lens.group': 'مستوى التفصيل',
  'lens.executive': 'العدسة التنفيذية',
  'lens.executiveHint': 'ملخصات موجزة لصنّاع القرار',
  'lens.explore': 'استكشاف البيانات',
  'lens.exploreHint': 'التفاصيل الكاملة: الرسوم والأدلة والمحتوى ذو الصلة',

  'composer.source': 'مؤشرات المجلس الأعلى',
  'composer.pocNote':
    'ملاحظة: لا تُطبَّق أدوار المستخدمين وصلاحياتهم في هذا النموذج؛ سيُطبَّق الوصول المستند إلى الأدوار عند التكامل الإنتاجي.',

  'firstrun.welcome': 'مرحبًا بك في اسأل الذكاء الاصطناعي',
  'firstrun.intro':
    'اسأل عن المؤشرات الاقتصادية القطرية وأوصافها المعتمدة. كل قيمة مصدرها قاعدة المؤشرات المعتمدة — دون أي تقدير.',
  'firstrun.priority': 'أسئلة ذات أولوية',
  'firstrun.topics': 'الموضوعات',
  'firstrun.note': 'تستند الإجابات إلى مستودع بيانات المؤشرات المعتمدة.',
  'firstrun.help': 'المساعدة',
  'firstrun.footnote':
    'اسأل الذكاء الاصطناعي طبقة مساعِدة. تحقق من الأرقام في لوحة المتابعة الاقتصادية بوصفها مصدر الحقيقة.',

  'topic.t1': 'نمو الناتج المحلي',
  'topic.t2': 'الميزان التجاري',
  'topic.t3': 'الصادرات غير الهيدروكربونية',
  'topic.t4': 'القوى العاملة',

  'a11y.answerReady': 'الإجابة جاهزة للسؤال {n}',
  'a11y.asking': 'جارٍ طرح السؤال {n}',
};
