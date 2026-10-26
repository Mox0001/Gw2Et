/** Browser timezone detection, validation, and cached Intl formatters. */
const formatters = new Map();
export function isTimeZone(value) {
  if (typeof value !== 'string' || !value) return false;
  try { new Intl.DateTimeFormat('en', {timeZone: value}); return true; }
  catch { return false; }
}

export function detectedZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

export function timeZone(value = 'local', detected = detectedZone()) {
  const fallback = isTimeZone(detected) ? detected : 'UTC';
  return value === 'local' || !isTimeZone(value) ? fallback : value;
}

export function zones(extra = []) {
  // Older browsers still offer common regions and the detected/saved zone.
  const fallback = ['America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin',
    'Africa/Johannesburg', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Singapore',
    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];
  let available = fallback;
  try { available = Intl.supportedValuesOf('timeZone'); } catch {}
  const all = [...new Set(['Asia/Dubai', detectedZone(), ...extra, ...available])];
  return ['UTC', ...all.filter(z => z !== 'UTC' && isTimeZone(z)).sort()];
}

function formatter(kind, zone, clockFormat) {
  const selected = timeZone(zone);
  const key = [kind, selected, clockFormat].join('|');
  if (!formatters.has(key)) {
    const options = kind === 'time'
      ? {hour: '2-digit', minute: '2-digit', hourCycle: clockFormat === '12' ? 'h12' : 'h23'}
      : kind === 'date'
        ? {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}
        : {timeZoneName: 'shortOffset'};
    if (formatters.size > 128) formatters.clear();
    // English UI: explicit AM/PM in 12-hour mode; midnight is 00:00 in 24-hour mode.
    formatters.set(key, new Intl.DateTimeFormat('en-GB', {timeZone: selected, ...options}));
  }
  return formatters.get(key);
}

export function formatTime(instant, zone = 'local', clockFormat = '24') {
  return formatter('time', zone, clockFormat).format(instant).toUpperCase();
}
export function formatDate(instant, zone = 'local') {
  return formatter('date', zone).format(instant);
}
export function zoneLabel(instant, zone = 'local') {
  const selected = timeZone(zone);
  const offset = formatter('offset', selected).formatToParts(instant)
    .find(part => part.type === 'timeZoneName')?.value || 'UTC';
  return `${selected} (${offset})`;
}
