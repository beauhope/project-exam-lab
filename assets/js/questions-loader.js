import { CONFIG } from './config.js';

let cachedBank = null;

const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = values => new Set(values).size === values.length;

export function validateQuestionBank(bank, expectedCount = CONFIG.expectedQuestions) {
  const errors = [], warnings = [];
  if (!bank || !Array.isArray(bank.questions)) return { valid: false, errors: ['الحقل questions غير موجود أو ليس مصفوفة.'], warnings, stats: null };
  const questions = bank.questions;
  if (questions.length !== expectedCount) errors.push(`العدد المتوقع ${expectedCount}، والموجود ${questions.length}.`);
  const ids = questions.map(q => q?.qid).filter(Boolean);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length) errors.push(`معرفات qid مكررة: ${duplicates.join('، ')}`);
  const missingExplanations = [], missingAnswers = [], badCaseRefs = [], invalidQuestions = [];
  const caseIds = new Set((bank.cases || []).map(c => c.id));
  questions.forEach((q, index) => {
    const tag = q?.qid || `السؤال ${index + 1}`;
    const required = ['qid', 'prompt', 'type', 'domain', 'approach', 'difficulty'];
    if (required.some(k => !text(q?.[k]))) invalidQuestions.push(`${tag}: حقول أساسية ناقصة`);
    if (!text(q?.explanation)) missingExplanations.push(tag);
    if (q?.case_id && !caseIds.has(q.case_id)) badCaseRefs.push(tag);
    let answerValid = false;
    if (['single', 'multi', 'order'].includes(q?.type)) {
      const opts = Array.isArray(q.options) ? q.options : [];
      const correct = Array.isArray(q.correct) ? q.correct : [];
      answerValid = opts.length > 0 && correct.length > 0 && unique(opts) && correct.every(v => opts.includes(v));
      if (q.type === 'single') answerValid &&= correct.length === 1;
      if (q.type === 'multi') answerValid &&= correct.length > 1 && unique(correct);
      if (q.type === 'order') answerValid &&= correct.length === opts.length && unique(correct);
    } else if (q?.type === 'matching') {
      const left = Array.isArray(q.left_items) ? q.left_items : [];
      const right = Array.isArray(q.right_items) ? q.right_items : [];
      const pairs = q.correct_pairs && typeof q.correct_pairs === 'object' ? q.correct_pairs : {};
      answerValid = left.length > 0 && left.length === right.length && unique(left) && unique(right) &&
        left.every(item => Object.hasOwn(pairs, item) && right.includes(pairs[item])) && unique(Object.values(pairs));
    } else invalidQuestions.push(`${tag}: نوع غير مدعوم (${q?.type ?? 'فارغ'})`);
    if (!answerValid) missingAnswers.push(tag);
  });
  if (invalidQuestions.length) errors.push(`${invalidQuestions.length} سؤالًا ببنية غير صحيحة.`);
  if (missingAnswers.length) errors.push(`${missingAnswers.length} سؤالًا بلا إجابة صحيحة صالحة.`);
  if (missingExplanations.length) warnings.push(`${missingExplanations.length} سؤالًا بلا تفسير.`);
  if (badCaseRefs.length) errors.push(`${badCaseRefs.length} مرجع دراسة حالة غير صالح.`);
  const countBy = key => questions.reduce((acc, q) => ((acc[q[key]] = (acc[q[key]] || 0) + 1), acc), {});
  return {
    valid: errors.length === 0, errors, warnings,
    details: { duplicates, missingExplanations, missingAnswers, badCaseRefs, invalidQuestions },
    stats: { total: questions.length, domains: countBy('domain'), approaches: countBy('approach'), difficulties: countBy('difficulty'), types: countBy('type') }
  };
}

export async function loadQuestionBank(url = CONFIG.dataUrl) {
  if (cachedBank) return cachedBank;
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bank = await response.json();
    const report = validateQuestionBank(bank);
    if (!report.valid) throw new Error(report.errors.join(' '));
    cachedBank = bank;
    window.dispatchEvent(new CustomEvent('projectExamLab:data-ready', { detail: report.stats }));
    return bank;
  } catch (error) {
    console.error('تعذر تحميل بنك الأسئلة:', error instanceof Error ? error.message : error);
    throw new Error('تعذر تحميل بنك الأسئلة. تحقق من الاتصال ثم أعد تحميل الصفحة. يعمل التطبيق عبر خادم محلي أو GitHub Pages.');
  }
}
