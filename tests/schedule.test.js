import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/schedule.js';
import {timeWindow, position, geometry, timelineRows} from '../src/timeline-model.js';
const midnight = Date.UTC(2026, 9, 26), HOUR = 3600000;
const phase = (id, label, startMinute = 0, endMinute = 1440) => ({id, label, startMinute, endMinute});
const track = (id, category, segments = [phase('a', 'Synthetic phase')]) => ({id, name: id, category, segments});

test('UTC phases merge across midnight; unscheduled gaps stay empty', () => {
  const data = {tracks: [track('test', 'Tests', [phase('a', 'Phase', 0, 30), phase('gap', '', 30, 1410), phase('a', 'Phase', 1410, 1440)])]};
  const events = engine.occurrences(data, midnight - 15 * engine.MINUTE, midnight + 15 * engine.MINUTE);
  assert.equal(events.length, 1);
  assert.equal(events[0].start, midnight - 30 * engine.MINUTE);
  assert.equal(events[0].end, midnight + 30 * engine.MINUTE);
  assert.equal(engine.occurrences(data, midnight + 30 * engine.MINUTE, midnight + HOUR).length, 0);
});
test('continuous lanes have no invented start or finish status', () => {
  assert.equal(engine.occurrences({tracks: [track('always', 'Tests')]}, midnight, midnight + HOUR)[0].continuous, true);
});
test('invalid windows are rejected', () => {
  assert.throws(() => engine.occurrences({tracks: []}, midnight, midnight), RangeError);
  assert.throws(() => engine.occurrences({tracks: []}, midnight, midnight + 8 * engine.DAY), RangeError);
  assert.throws(() => timeWindow(midnight, 0), RangeError);
});
test('bar clipping and now-line movement use UTC elapsed time', () => {
  const window = timeWindow(midnight + HOUR, 2);
  assert.equal(position(midnight + HOUR, window), 50);
  assert.ok(position(midnight + HOUR + 1000, window) > 50);
  assert.deepEqual(geometry({start: midnight - HOUR, end: midnight + HOUR / 2}, window), {left: 0, width: 25});
  assert.equal(geometry({start: window.end, end: window.end + HOUR}, window), null);
  assert.equal(timeWindow(midnight, 2, midnight - 2 * HOUR).end, midnight);
});
test('regional day/night immediately precedes its map, including filtered views', () => {
  const data = {tracks: [track('eod-other', 'End of Dragons'), track('eod-sp', 'End of Dragons'), track('voe-ss', 'Visions of Eternity'), track('eod-dn', 'End of Dragons'), track('voe-dn', 'Visions of Eternity'), track('core-dn', 'Core Tyria')]};
  for (const category of ['', 'End of Dragons', 'Visions of Eternity']) {
    const ids = timelineRows(data, timeWindow(midnight), engine, category).map(row => row.track.id);
    for (const [daynight, map] of [['eod-dn', 'eod-sp'], ['voe-dn', 'voe-ss']]) {
      if (ids.includes(map)) assert.equal(ids.indexOf(daynight) + 1, ids.indexOf(map));
    }
    if (category) assert.ok(!ids.includes('core-dn'));
  }
});
test('search and category filters compose without creating events', () => {
  const data = {tracks: [track('a', 'One', [phase('a', 'Alpha', 0, 15)]), track('b', 'Two'), track('one-dn', 'One')]};
  const rows = timelineRows(data, timeWindow(midnight), engine, 'One', 'ALPHA');
  assert.deepEqual(rows.map(row => row.track.id), ['one-dn', 'a']);
  assert.equal(rows[1].events.length, 1);
  assert.deepEqual(timelineRows(data, timeWindow(midnight), engine, 'One', 'missing').map(row => row.track.id), ['one-dn']);
});
