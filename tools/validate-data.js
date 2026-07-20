'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'questions.json');
const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
const questions = bank.questions || [], ids = questions.map(q => q.qid), duplicates = [...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
const countBy = key => questions.reduce((a,q)=>((a[q[key]]=(a[q[key]]||0)+1),a),{});
const missingExplanation=[],badAnswers=[],badCases=[],caseIds=new Set((bank.cases||[]).map(c=>c.id));
for(const q of questions){if(!q.explanation?.trim())missingExplanation.push(q.qid);if(q.case_id&&!caseIds.has(q.case_id))badCases.push(q.qid);let ok=false;if(['single','multi','order'].includes(q.type)){ok=Array.isArray(q.options)&&Array.isArray(q.correct)&&q.correct.length>0&&q.correct.every(x=>q.options.includes(x));if(q.type==='single')ok&&=q.correct.length===1;if(q.type==='multi')ok&&=q.correct.length>1;if(q.type==='order')ok&&=q.correct.length===q.options.length}else if(q.type==='matching'){ok=Array.isArray(q.left_items)&&Array.isArray(q.right_items)&&q.left_items.length===q.right_items.length&&q.left_items.every(x=>q.correct_pairs&&q.right_items.includes(q.correct_pairs[x]))}if(!ok)badAnswers.push(q.qid)}
const report={total:questions.length,domains:countBy('domain'),approaches:countBy('approach'),difficulty:countBy('difficulty'),types:countBy('type'),duplicates,missingExplanation,badAnswers,badCases};
console.log(JSON.stringify(report,null,2));
if(questions.length!==500||duplicates.length||missingExplanation.length||badAnswers.length||badCases.length)process.exitCode=1;
