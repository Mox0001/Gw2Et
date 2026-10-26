import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTime, formatDate, zoneLabel, timeZone, zones} from '../src/time.js';
import {loadPreferences, savePreferences, SETTINGS_KEY} from '../src/preferences.js';

const midnight = Date.UTC(2026, 9, 26);
test('24-hour UTC midnight and noon', () => {
  assert.equal(formatTime(midnight, 'UTC', '24'), '00:00');
  assert.equal(formatTime(midnight + 12 * 3600000, 'UTC', '24'), '12:00');
});
test('12-hour midnight and noon have correct AM/PM', () => {
  assert.equal(formatTime(midnight, 'UTC', '12'), '12:00 AM');
  assert.equal(formatTime(midnight + 12 * 3600000, 'UTC', '12'), '12:00 PM');
  assert.equal(formatTime(midnight + 13.5 * 3600000, 'UTC', '12'), '01:30 PM');
});
test('Dubai and fractional offsets convert instants without shifting schedules', () => {
  assert.equal(formatTime(midnight, 'Asia/Dubai'), '04:00');
  assert.match(zoneLabel(midnight, 'Asia/Dubai'), /GMT\+4/);
  assert.equal(formatTime(midnight, 'Asia/Kathmandu'), '05:45');
  assert.match(formatDate(midnight, 'America/New_York'), /25 Oct 2026/);
});
test('DST fall-back preserves offsets for repeated local times', () => {
  const first = Date.UTC(2026, 9, 25, 0, 30), second = first + 3600000;
  assert.equal(formatTime(first, 'Europe/Berlin'), '02:30');
  assert.equal(formatTime(second, 'Europe/Berlin'), '02:30');
  assert.match(zoneLabel(first, 'Europe/Berlin'), /GMT\+2/);
  assert.match(zoneLabel(second, 'Europe/Berlin'), /GMT\+1/);
});
test('DST spring-forward skips nonexistent local hour', () => {
  assert.equal(formatTime(Date.UTC(2026, 2, 29, 0, 30), 'Europe/Berlin'), '01:30');
  assert.equal(formatTime(Date.UTC(2026, 2, 29, 1, 30), 'Europe/Berlin'), '03:30');
});
test('automatic detection, manual override, and invalid fallback', () => {
  assert.equal(timeZone('local', 'Asia/Dubai'), 'Asia/Dubai');
  assert.equal(timeZone('UTC', 'Asia/Dubai'), 'UTC');
  assert.equal(timeZone('bad-zone', 'Asia/Dubai'), 'Asia/Dubai');
  assert.equal(timeZone('local', 'bad-zone'), 'UTC');
  assert.equal(zones()[0], 'UTC');
  assert.ok(zones().includes('Asia/Dubai'));
});
test('saved preferences survive reload and invalid values use defaults', () => {
  const values = new Map();
  const storage = {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)};
  assert.deepEqual(loadPreferences(storage), {zone: 'local', clockFormat: '24'});
  assert.equal(savePreferences({zone: 'Asia/Dubai', clockFormat: '12'}, storage), true);
  assert.deepEqual(loadPreferences(storage), {zone: 'Asia/Dubai', clockFormat: '12'});
  values.set(SETTINGS_KEY, JSON.stringify({zone: 'invalid', clockFormat: 'evil'}));
  assert.deepEqual(loadPreferences(storage), {zone: 'local', clockFormat: '24'});
  values.set(SETTINGS_KEY, 'broken-json');
  assert.deepEqual(loadPreferences(storage), {zone: 'local', clockFormat: '24'});
});
test('blocked storage does not break the app', () => {
  const storage = {getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }};
  assert.deepEqual(loadPreferences(storage), {zone: 'local', clockFormat: '24'});
  assert.equal(savePreferences({zone: 'UTC', clockFormat: '12'}, storage), false);
});
