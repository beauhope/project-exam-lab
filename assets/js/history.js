import { CONFIG } from './config.js';
import { readJSON, writeJSON } from './storage.js';
export const getHistory = () => readJSON('history', []);
export function addHistory(result) {
  const history = [result, ...getHistory().filter(x => x.id !== result.id)].slice(0, CONFIG.historyLimit);
  writeJSON('history', history); return history;
}
export function getHistoryItem(id) { return getHistory().find(x => x.id === id) || null; }
export function deleteHistoryItem(id) { writeJSON('history', getHistory().filter(x => x.id !== id)); }
export function getWrongQuestionIds() { return [...new Set(getHistory().flatMap(x => x.wrongQuestionIds || []))]; }
