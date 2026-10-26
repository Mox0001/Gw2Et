import {isTimeZone} from './time.js';

export const SETTINGS_KEY = 'gw2-event-timers.preferences.v1';
export const DEFAULTS = Object.freeze({zone: 'local', clockFormat: '24'});
function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}
export function normalizePreferences(value) {
  return {
    zone: value?.zone === 'local' || isTimeZone(value?.zone) ? value.zone : 'local',
    clockFormat: value?.clockFormat === '12' ? '12' : '24',
  };
}
export function loadPreferences(storage = browserStorage()) {
  try { return normalizePreferences(JSON.parse(storage?.getItem(SETTINGS_KEY) || 'null')); }
  catch { return {...DEFAULTS}; }
}
export function savePreferences(value, storage = browserStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalizePreferences(value)));
    return true;
  } catch { return false; }
}
