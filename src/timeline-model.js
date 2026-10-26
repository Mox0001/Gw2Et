/* Geometry only: the original UTC occurrence engine remains authoritative. */
export const HOUR = 3600000;
export function timeWindow(now, hours = 2, manualStart = null) {
  if (!Number.isFinite(now) || ![2, 6, 12, 24].includes(hours)) throw new RangeError('Invalid timeline window.');
  const span = hours * HOUR;
  const start = manualStart ?? Math.floor(now / span) * span;
  if (!Number.isFinite(start)) throw new RangeError('Invalid start time.');
  return {start, end: start + span, span};
}
export function position(instant, window) {
  return Math.max(0, Math.min(100, (instant - window.start) / window.span * 100));
}
export function geometry(event, window) {
  if (event.end <= window.start || event.start >= window.end || event.end <= event.start) return null;
  const left = position(event.start, window);
  return {left, width: position(event.end, window) - left};
}
export function ticks(window) {
  const step = 15 * 60000, result = [];
  for (let instant = window.start; instant <= window.end; instant += step) result.push({instant, left: position(instant, window)});
  return result;
}
export function isDayNight(track) {
  return /(?:^|-)dn$/.test(track.id || '') || /day\s*(?:and|&)\s*night/i.test(track.name || '');
}
export function waypoint(value) {
  return typeof value === 'string' && /^\[&[A-Za-z0-9+/]+={0,2}\]$/.test(value.trim()) ? value.trim() : null;
}
export function timelineRows(data, window, engine, category = '', query = '') {
  const term = query.trim().toLocaleLowerCase();
  const tracks = data.tracks.filter(t => !category || (t.category || 'Other') === category);
  const byTrack = new Map(tracks.map(t => [t.id, []]));
  for (const event of engine.occurrences(data, window.start, window.end, tracks.map(t => t.id))) byTrack.get(event.trackId)?.push(event);
  const rows = tracks.map(track => ({track, events: byTrack.get(track.id).filter(event => isDayNight(track) || !term || (track.name + ' ' + event.label).toLocaleLowerCase().includes(term))}));
  const categories = [...new Set(tracks.filter(t => !isDayNight(t)).map(t => t.category || 'Other'))];
  for (const track of tracks) if (!categories.includes(track.category || 'Other')) categories.push(track.category || 'Other');
  return categories.flatMap(group => {
    const members = rows.filter(r => (r.track.category || 'Other') === group);
    const ordered = members.filter(r => !isDayNight(r.track) && (!term || r.events.length));
    const targets = {'eod-dn': 'eod-sp', 'voe-dn': 'voe-ss'};
    for (const row of members.filter(r => isDayNight(r.track)).reverse()) {
      const target = targets[row.track.id];
      const index = target ? ordered.findIndex(r => r.track.id === target) : -1;
      ordered.splice(index < 0 ? 0 : index, 0, row);
    }
    return ordered;
  });
}
