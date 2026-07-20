import { LABELS } from './config.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function prepareQuestion(q, savedOrder) {
  const order = savedOrder?.length ? savedOrder : [...(q.options || [])];
  return { ...q, displayOptions: order };
}

export function renderQuestion(q, answer, callbacks) {
  const root = document.querySelector('[data-answer-area]');
  if (!root) return;
  root.innerHTML = '';
  if (q.type === 'single' || q.type === 'multi') renderChoices(root, q, answer, callbacks);
  else if (q.type === 'order') renderOrder(root, q, answer, callbacks);
  else if (q.type === 'matching') renderMatching(root, q, answer, callbacks);
}

function renderChoices(root, q, answer, callbacks) {
  if (q.type === 'multi') root.insertAdjacentHTML('beforeend', '<p class="notice">قد يتطلب هذا السؤال أكثر من إجابة. يجب اختيار المجموعة كاملة.</p>');
  (q.displayOptions || q.options).forEach((option, index) => {
    const input = document.createElement('input'); input.type = q.type === 'single' ? 'radio' : 'checkbox'; input.name = 'answer'; input.value = option; input.id = `option-${index}`;
    input.checked = q.type === 'single' ? answer === option : Array.isArray(answer) && answer.includes(option);
    input.addEventListener('change', () => callbacks.onChoice(option, input.checked));
    const label = document.createElement('label'); label.className = 'option'; label.htmlFor = input.id; label.append(input);
    const span = document.createElement('span'); span.textContent = option; label.append(span); root.append(label);
  });
}

function renderOrder(root, q, answer, callbacks) {
  const current = Array.isArray(answer) && answer.length === q.options.length ? answer : [...q.displayOptions];
  const list = document.createElement('div'); list.className = 'order-list';
  current.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'order-item';
    row.innerHTML = `<strong>${index + 1}</strong><span>${esc(item)}</span>`;
    const buttons = document.createElement('div'); buttons.className = 'order-buttons';
    const up = document.createElement('button'); up.type = 'button'; up.className = 'btn btn-secondary'; up.textContent = '↑'; up.ariaLabel = `تحريك ${item} لأعلى`; up.disabled = index === 0;
    const down = document.createElement('button'); down.type = 'button'; down.className = 'btn btn-secondary'; down.textContent = '↓'; down.ariaLabel = `تحريك ${item} لأسفل`; down.disabled = index === current.length - 1;
    up.addEventListener('click', () => callbacks.onReorder(current, index, index - 1)); down.addEventListener('click', () => callbacks.onReorder(current, index, index + 1));
    buttons.append(up, down); row.append(buttons); list.append(row);
  }); root.append(list);
}

function renderMatching(root, q, answer = {}, callbacks) {
  q.left_items.forEach((left, index) => {
    const row = document.createElement('div'); row.className = 'match-row';
    const label = document.createElement('label'); label.htmlFor = `match-${index}`; label.textContent = left;
    const select = document.createElement('select'); select.id = `match-${index}`; select.dataset.left = left; select.ariaLabel = `مطابقة ${left}`;
    select.innerHTML = '<option value="">اختر العنصر المطابق</option>' + q.right_items.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
    select.value = answer?.[left] || '';
    [...select.options].forEach(opt => { if (opt.value && opt.value !== select.value && Object.values(answer || {}).includes(opt.value)) opt.disabled = true; });
    select.addEventListener('change', () => callbacks.onMatch(left, select.value)); row.append(label, select); root.append(row);
  });
}

export function isAnswered(q, answer) {
  if (q.type === 'single') return typeof answer === 'string' && answer.length > 0;
  if (q.type === 'multi') return Array.isArray(answer) && answer.length > 0;
  if (q.type === 'order') return Array.isArray(answer) && answer.length === q.options.length;
  return answer && typeof answer === 'object' && q.left_items.every(left => answer[left]);
}

export function isCorrect(q, answer) {
  if (!isAnswered(q, answer)) return false;
  if (q.type === 'single') return answer === q.correct[0];
  if (q.type === 'multi') return answer.length === q.correct.length && answer.every(x => q.correct.includes(x));
  if (q.type === 'order') return answer.every((x, i) => x === q.correct[i]);
  return q.left_items.every(left => answer[left] === q.correct_pairs[left]);
}

export function answerDisplay(q, answer) {
  if (!isAnswered(q, answer)) return 'غير مجاب';
  if (q.type === 'single') return answer;
  if (q.type === 'multi' || q.type === 'order') return answer.join(' ← ');
  return q.left_items.map(left => `${left} ← ${answer[left]}`).join('؛ ');
}
export const typeLabel = type => LABELS[type] || type;
export { esc };
