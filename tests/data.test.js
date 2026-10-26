import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSchedule, loadSchedule, SCHEDULE_URL} from '../src/data.js';
const data = JSON.parse(readFileSync(SCHEDULE_URL));
test('the bundled preserved schedule passes schema validation', () => {
  assert.equal(validateSchedule(data), data);
  assert.equal(data.tracks.length, 44);
  assert.equal(data.source.capture, '20260920230502');
});
test('invalid segments and duplicate track ids fail clearly', () => {
  const track = {id: 'test', name: 'Test', segments: [{id: 'a', label: 'Test', startMinute: 60, endMinute: 30}]};
  assert.throws(() => validateSchedule({tracks: [track]}), /Invalid UTC segment/);
  track.segments = [];
  assert.throws(() => validateSchedule({tracks: [track, track]}), /unique id/);
  assert.throws(() => validateSchedule({tracks: []}), /non-empty/);
});
test('HTTP errors produce a useful loading failure', async () => {
  await assert.rejects(loadSchedule(async () => ({ok: false, status: 404})), /HTTP 404/);
});
test('assets work under a GitHub repository subpath', () => {
  const source = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');
  const relative = source.match(/new URL\('([^']+)', import.meta.url\)/)[1];
  assert.equal(new URL(relative, 'https://example.github.io/gw2-event-timers/src/data.js').href,
    'https://example.github.io/gw2-event-timers/data/timers.json');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!match[1].startsWith('/'), `Root-relative URL would break a project site: ${match[1]}`);
  }
});
