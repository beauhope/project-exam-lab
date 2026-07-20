import { CONFIG } from './config.js';
const key = name => `${CONFIG.storagePrefix}${name}`;

export function readJSON(name, fallback = null) {
  try { const raw = localStorage.getItem(key(name)); return raw ? JSON.parse(raw) : fallback; }
  catch (error) { console.warn(`تعذر قراءة ${name}`, error); return fallback; }
}
export function writeJSON(name, value) { localStorage.setItem(key(name), JSON.stringify(value)); }
export function remove(name) { localStorage.removeItem(key(name)); }
export const getActiveAttempt = () => readJSON('activeAttempt');
export const saveActiveAttempt = attempt => writeJSON('activeAttempt', { ...attempt, lastSavedAt: new Date().toISOString() });
export const clearActiveAttempt = () => remove('activeAttempt');
export const getSettings = () => readJSON('settings', {});
export const saveSettings = settings => writeJSON('settings', settings);
export function clearAllLocalData() {
  Object.keys(localStorage).filter(k => k.startsWith(CONFIG.storagePrefix)).forEach(k => localStorage.removeItem(k));
}
