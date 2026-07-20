export const CONFIG = Object.freeze({
  appName: 'محاكي إدارة المشاريع الاحترافي',
  dataUrl: './data/questions.json',
  storagePrefix: 'projectExamLab_',
  fullExam: { count: 180, minutes: 240, breaksAfter: [60, 120] },
  mediumExam: { count: 60, minutes: 80, breaksAfter: [] },
  quickExam: { count: 30, minutes: 40, breaksAfter: [] },
  expectedQuestions: 500,
  historyLimit: 10,
  cacheVersion: 'v1'
});

export const LABELS = Object.freeze({
  single: 'اختيار مفرد', multi: 'اختيار متعدد', order: 'ترتيب', matching: 'مطابقة',
  full: 'اختبار كامل', medium: 'اختبار متوسط', quick: 'اختبار سريع',
  custom: 'تدريب مخصص', mistakes: 'مراجعة الأخطاء'
});
