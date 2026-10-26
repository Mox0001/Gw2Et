import test from 'node:test';
import assert from 'node:assert/strict';
import {copyWaypointCode} from '../src/clipboard.js';
const code = '[&BPcAAAA=]';
test('copies the exact waypoint using the browser API', async () => {
  let written;
  assert.equal(await copyWaypointCode(code, {clipboard: {writeText: async text => { written = text; }}}), 'copied');
  assert.equal(written, code);
});
test('denied clipboard permission falls back to the selected code', async () => {
  let selected = false;
  assert.equal(await copyWaypointCode(code, {clipboard: {writeText: async () => { throw Error('denied'); }}, selectField: () => { selected = true; }, legacyCopy: () => selected}), 'copied');
});
test('unavailable browser clipboard leaves a manual-copy fallback', async () => {
  let selected = false;
  assert.equal(await copyWaypointCode(code, {clipboard: null, selectField: () => { selected = true; }, legacyCopy: () => false}), 'manual');
  assert.equal(selected, true);
});
test('invalid codes never reach the clipboard', async () => {
  let called = false;
  assert.equal(await copyWaypointCode('<script>', {clipboard: {writeText: async () => { called = true; }}}), 'invalid');
  assert.equal(called, false);
});
