const DOMAIN_RATIOS = Object.freeze({ 'الأفراد': 0.33, 'العمليات': 0.41, 'بيئة الأعمال': 0.26 });
const FULL_MATRIX = Object.freeze({
  'الأفراد': { 'تنبؤي': 24, 'رشيق': 18, 'هجين': 17 },
  'العمليات': { 'تنبؤي': 30, 'رشيق': 22, 'هجين': 22 },
  'بيئة الأعمال': { 'تنبؤي': 18, 'رشيق': 14, 'هجين': 15 }
});

export function fisherYates(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function proportionalTargets(total, ratios = DOMAIN_RATIOS) {
  const entries = Object.entries(ratios);
  const raw = entries.map(([key, ratio]) => ({ key, exact: total * ratio, value: Math.floor(total * ratio) }));
  let left = total - raw.reduce((sum, x) => sum + x.value, 0);
  raw.sort((a, b) => (b.exact - b.value) - (a.exact - a.value));
  for (let i = 0; i < left; i++) raw[i % raw.length].value++;
  return Object.fromEntries(raw.map(x => [x.key, x.value]));
}

function matches(q, filters = {}) {
  return ['domain', 'approach', 'difficulty'].every(key => !filters[key]?.length || filters[key].includes(q[key]));
}

function stratifiedPool(pool, target, random) {
  const predictive = Math.round(target * 0.4);
  const other = target - predictive;
  const agile = Math.round(other / 2);
  const hybrid = other - agile;
  const targets = { 'تنبؤي': predictive, 'رشيق': agile, 'هجين': hybrid };
  const selected = [], used = new Set();
  Object.entries(targets).forEach(([approach, count]) => {
    fisherYates(pool.filter(q => q.approach === approach), random).slice(0, count).forEach(q => { selected.push(q); used.add(q.qid); });
  });
  if (selected.length < target) fisherYates(pool.filter(q => !used.has(q.qid)), random).slice(0, target - selected.length).forEach(q => selected.push(q));
  return selected;
}

export function selectQuestions(questions, options = {}) {
  const count = Number(options.count) || 30;
  const random = options.random || Math.random;
  const eligible = questions.filter(q => matches(q, options.filters));
  if (eligible.length < count) throw new Error(`المرشحات الحالية توفر ${eligible.length} سؤالًا فقط، بينما المطلوب ${count}.`);
  const targets = proportionalTargets(count);
  const selected = [], used = new Set();
  if (count === 180 && !Object.values(options.filters || {}).some(values => values?.length)) {
    Object.entries(FULL_MATRIX).forEach(([domain, approaches]) => Object.entries(approaches).forEach(([approach, target]) => {
      fisherYates(eligible.filter(q => q.domain === domain && q.approach === approach), random).slice(0, target).forEach(q => { selected.push(q); used.add(q.qid); });
    }));
    if (selected.length !== count) throw new Error('لا يحتوي البنك على العدد المطلوب لبناء مصفوفة الاختبار الكامل.');
    return fisherYates(selected, random);
  }
  Object.entries(targets).forEach(([domain, target]) => {
    const pool = eligible.filter(q => q.domain === domain && !used.has(q.qid));
    stratifiedPool(pool, Math.min(target, pool.length), random).forEach(q => { if (!used.has(q.qid)) { selected.push(q); used.add(q.qid); } });
  });
  if (selected.length < count) fisherYates(eligible.filter(q => !used.has(q.qid)), random).slice(0, count - selected.length).forEach(q => selected.push(q));
  if (selected.length !== count || new Set(selected.map(q => q.qid)).size !== count) throw new Error('تعذر تكوين اختبار فريد بالتوزيع المطلوب.');
  return fisherYates(selected, random);
}

export function selectMistakes(questions, wrongIds, count = 200, random = Math.random) {
  const wanted = new Set(wrongIds);
  return fisherYates(questions.filter(q => wanted.has(q.qid)), random).slice(0, count);
}

export { DOMAIN_RATIOS };
