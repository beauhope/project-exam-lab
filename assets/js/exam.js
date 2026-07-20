import { CONFIG, LABELS } from './config.js';
import { loadQuestionBank } from './questions-loader.js';
import { fisherYates, selectQuestions, selectMistakes } from './question-selector.js';
import { getActiveAttempt, saveActiveAttempt, clearActiveAttempt } from './storage.js';
import { getWrongQuestionIds, addHistory } from './history.js';
import { renderQuestion, isAnswered, isCorrect, typeLabel, esc } from './question-renderer.js';
import { announce } from './accessibility.js';

let bank, attempt, questions = [], timerId, breakTimerId;
const $ = selector => document.querySelector(selector);
const uid = () => `attempt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

function modeOptions(mode) {
  const params = new URLSearchParams(location.search);
  if (mode === 'full') return { count: 180, minutes: 240, breaksAfter: [60,120] };
  if (mode === 'medium') return { count: 60, minutes: 80, breaksAfter: [] };
  if (mode === 'quick') return { count: 30, minutes: 40, breaksAfter: [] };
  const count = Math.max(10, Math.min(200, Number(params.get('count')) || 50));
  const minutes = Math.max(10, Math.min(300, Number(params.get('minutes')) || 70));
  const filters = {};
  ['domain','approach','difficulty'].forEach(key => { const values = params.getAll(key); if (values.length) filters[key] = values; });
  return { count, minutes, breaksAfter: [], filters };
}

function createAttempt(mode) {
  const opts = modeOptions(mode);
  let selected;
  if (mode === 'mistakes') {
    selected = selectMistakes(bank.questions, getWrongQuestionIds(), opts.count);
    if (!selected.length) throw new Error('لا توجد أسئلة خاطئة محفوظة للمراجعة حتى الآن.');
    opts.count = selected.length;
  } else selected = selectQuestions(bank.questions, opts);
  const optionOrders = {};
  selected.forEach(q => { if (q.options?.length) optionOrders[q.qid] = fisherYates(q.options); });
  return { id: uid(), mode, questionIds: selected.map(q => q.qid), optionOrders, answers: {}, flags: [], current: 0, startedAt: new Date().toISOString(), remainingSeconds: opts.minutes * 60, durationMinutes: opts.minutes, breaksAfter: opts.breaksAfter, completedBreaks: [], activeBreakAfter: null, breakRemainingSeconds: 600, lastTickAt: Date.now(), status: 'active' };
}

function restoreElapsed() {
  const elapsed = Math.max(0, Math.floor((Date.now() - (attempt.lastTickAt || Date.now())) / 1000));
  if (!attempt.activeBreakAfter) attempt.remainingSeconds = Math.max(0, attempt.remainingSeconds - elapsed);
  attempt.lastTickAt = Date.now();
}

export async function initExam() {
  try {
    $('#data-status').textContent = 'جارٍ تحميل بنك الأسئلة…'; bank = await loadQuestionBank(); $('#data-status').textContent = '● البيانات متصلة: 500 سؤال';
    const params = new URLSearchParams(location.search); const resume = params.get('resume') === '1'; const mode = params.get('mode') || 'quick';
    const saved = getActiveAttempt(); attempt = resume && saved?.status === 'active' ? saved : createAttempt(mode);
    restoreElapsed(); questions = attempt.questionIds.map(id => bank.questions.find(q => q.qid === id)).filter(Boolean);
    if (questions.length !== attempt.questionIds.length) throw new Error('تعذر استعادة بعض أسئلة المحاولة.');
    save(); buildNavigation(); render(); startTimer(); if (attempt.activeBreakAfter) showBreak();
    addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else { restoreElapsed(); renderTimer(); } });
  } catch (error) { $('#exam-main').innerHTML = `<div class="notice error" role="alert">${esc(error.message)}</div><p><a class="btn btn-secondary" href="./index.html">العودة للرئيسية</a></p>`; }
}

function currentQuestion() { const q = questions[attempt.current]; return { ...q, displayOptions: attempt.optionOrders[q.qid] || q.options }; }
function save() { if (attempt?.status === 'active') { attempt.lastTickAt = Date.now(); saveActiveAttempt(attempt); } }
function renderTimer() { $('#timer').textContent = formatTime(attempt.remainingSeconds); $('#timer').classList.toggle('status-bad', attempt.remainingSeconds <= 600); if(attempt.remainingSeconds===600)announce('تبقت عشر دقائق على انتهاء الوقت.'); }
function formatTime(seconds) { const h = Math.floor(seconds/3600), m = Math.floor(seconds%3600/60), s = seconds%60; return [h,m,s].map(x => String(x).padStart(2,'0')).join(':'); }
function startTimer() { clearInterval(timerId); renderTimer(); if (attempt.remainingSeconds <= 0) return submit(true); timerId = setInterval(() => { if (!attempt.activeBreakAfter) attempt.remainingSeconds--; attempt.lastTickAt = Date.now(); renderTimer(); if (attempt.remainingSeconds <= 0) submit(true); if (attempt.remainingSeconds % 10 === 0) save(); }, 1000); }

function render() {
  const q = currentQuestion(); const idx = attempt.current; $('#question-number').textContent = `السؤال ${idx + 1} من ${questions.length}`; $('#question-type').textContent = typeLabel(q.type);
  $('#question-meta').innerHTML = [q.domain,q.approach,q.difficulty,q.topic].map(x => `<span class="tag">${esc(x)}</span>`).join('');
  $('#prompt').textContent = q.prompt; $('#progress-bar').style.width = `${((idx + 1)/questions.length)*100}%`; $('#progress-bar').parentElement.setAttribute('aria-valuenow', String(idx+1)); $('#progress-bar').parentElement.setAttribute('aria-valuemax', String(questions.length));
  const caseBox = $('#case-box'); if (q.case_id) { caseBox.hidden = false; caseBox.innerHTML = `<details open><summary><strong>${esc(q.case_title)}</strong> — إظهار أو إخفاء السيناريو</summary><p>${esc(q.case_scenario)}</p></details>`; } else caseBox.hidden = true;
  renderQuestion(q, attempt.answers[q.qid], { onChoice: choice, onReorder: reorder, onMatch: match });
  $('#flag-button').textContent = attempt.flags.includes(q.qid) ? '★ إزالة علامة المراجعة' : '☆ تعليم للمراجعة';
  $('#previous').disabled = idx === 0 || lockedByBreak(idx - 1); $('#next').textContent = idx === questions.length - 1 ? 'مراجعة وإنهاء الاختبار' : 'التالي'; refreshNavigation(); announce(`السؤال ${idx + 1} من ${questions.length}`);
}

function choice(option, checked) { const q = currentQuestion(); if (q.type === 'single') attempt.answers[q.qid] = option; else { let arr = Array.isArray(attempt.answers[q.qid]) ? [...attempt.answers[q.qid]] : []; arr = checked ? [...new Set([...arr,option])] : arr.filter(x => x !== option); attempt.answers[q.qid] = arr; } save(); refreshNavigation(); }
function reorder(items, from, to) { const next = [...items]; [next[from],next[to]]=[next[to],next[from]]; attempt.answers[currentQuestion().qid]=next; save(); render(); }
function match(left, value) { const q=currentQuestion(), obj={...(attempt.answers[q.qid]||{})}; if(value)obj[left]=value;else delete obj[left];attempt.answers[q.qid]=obj;save();render(); }
function lockedByBreak(target) {
  if (attempt.completedBreaks.some(point => target < point && attempt.current >= point)) return true;
  const pending = attempt.breaksAfter.find(point => !attempt.completedBreaks.includes(point));
  return Boolean(pending && attempt.current < pending && target >= pending);
}
function move(step) { if (step === 1 && attempt.current === questions.length - 1) return confirmSubmit(); const target=attempt.current+step;if(target<0||target>=questions.length||lockedByBreak(target))return;attempt.current=target;render();window.scrollTo({top:0,behavior:'smooth'}); }
function maybeBreak() { const position=attempt.current+1; if(attempt.breaksAfter.includes(position)&&!attempt.completedBreaks.includes(position)){startBreak(position);return true}return false; }
function startBreak(position){attempt.activeBreakAfter=position;attempt.breakRemainingSeconds=600;save();showBreak()}
function showBreak(){
  $('#break-overlay').hidden=false;$('#break-time').textContent=formatTime(attempt.breakRemainingSeconds??600).slice(3);clearInterval(breakTimerId);
  breakTimerId=setInterval(()=>{attempt.breakRemainingSeconds=Math.max(0,(attempt.breakRemainingSeconds??600)-1);$('#break-time').textContent=formatTime(attempt.breakRemainingSeconds).slice(3);if(attempt.breakRemainingSeconds%10===0)save();if(attempt.breakRemainingSeconds<=0)endBreak()},1000)
}
function endBreak(){clearInterval(breakTimerId);const point=attempt.activeBreakAfter;if(point&&!attempt.completedBreaks.includes(point))attempt.completedBreaks.push(point);attempt.activeBreakAfter=null;attempt.breakRemainingSeconds=600;attempt.current=Math.min(point,questions.length-1);$('#break-overlay').hidden=true;save();render()}
function buildNavigation(){const grid=$('#question-grid');grid.innerHTML=questions.map((_,i)=>`<button class="qnav" type="button" data-index="${i}" aria-label="الانتقال إلى السؤال ${i+1}">${i+1}</button>`).join('');grid.addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;const target=Number(b.dataset.index);if(!lockedByBreak(target)){attempt.current=target;render()}})}
function refreshNavigation(){questions.forEach((q,i)=>{const b=document.querySelector(`[data-index="${i}"]`);b.classList.toggle('current',i===attempt.current);b.classList.toggle('answered',isAnswered(q,attempt.answers[q.qid]));b.classList.toggle('flagged',attempt.flags.includes(q.qid));b.setAttribute('aria-current',i===attempt.current?'step':'false')});$('#answered-count').textContent=questions.filter(q=>isAnswered(q,attempt.answers[q.qid])).length;$('#flagged-count').textContent=attempt.flags.length}
function confirmSubmit(){const unanswered=questions.filter(q=>!isAnswered(q,attempt.answers[q.qid])).length;$('#confirm-text').textContent=unanswered?`لديك ${unanswered} سؤالًا غير مجاب. يمكنك العودة إليها أو تسليم الاختبار الآن.`:'أجبت عن جميع الأسئلة. هل تريد تسليم الاختبار الآن؟';$('#submit-dialog').showModal()}
function submit(auto=false){if(attempt.status!=='active')return;clearInterval(timerId);attempt.status='completed';attempt.completedAt=new Date().toISOString();const details=questions.map(q=>({qid:q.qid,answer:attempt.answers[q.qid]??null,correct:isCorrect(q,attempt.answers[q.qid]),answered:isAnswered(q,attempt.answers[q.qid])}));const correct=details.filter(x=>x.correct).length,unanswered=details.filter(x=>!x.answered).length;const result={...attempt,details,total:questions.length,correct,wrong:questions.length-correct-unanswered,unanswered,percentage:Math.round(correct/questions.length*100),usedSeconds:attempt.durationMinutes*60-attempt.remainingSeconds,wrongQuestionIds:details.filter(x=>x.answered&&!x.correct).map(x=>x.qid),autoSubmitted:auto};addHistory(result);clearActiveAttempt();location.href=`./results.html?id=${encodeURIComponent(result.id)}`}

function bind(){ $('#previous')?.addEventListener('click',()=>move(-1));$('#next')?.addEventListener('click',()=>{if(!maybeBreak())move(1)});$('#flag-button')?.addEventListener('click',()=>{const id=currentQuestion().qid;attempt.flags=attempt.flags.includes(id)?attempt.flags.filter(x=>x!==id):[...attempt.flags,id];save();render()});$('#clear-answer')?.addEventListener('click',()=>{delete attempt.answers[currentQuestion().qid];save();render()});$('#end-exam')?.addEventListener('click',confirmSubmit);$('#confirm-submit')?.addEventListener('click',()=>submit(false));$('#continue-break')?.addEventListener('click',endBreak);document.querySelector('[data-close-dialog]')?.addEventListener('click',()=>$('#submit-dialog').close());const side=$('#question-sidebar'),toggle=$('#sidebar-toggle'),close=()=>{side?.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false')};toggle?.addEventListener('click',()=>{const open=!side.classList.contains('is-open');side.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open))});document.querySelector('.sidebar-close')?.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()}); }
bind();
