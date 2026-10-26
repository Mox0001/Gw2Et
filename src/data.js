export const SCHEDULE_URL = new URL('../data/timers.json', import.meta.url);

/** Fail with a useful message before a malformed edited dataset reaches the UI. */
export function validateSchedule(data) {
  if (!Array.isArray(data?.tracks) || !data.tracks.length) {
    throw new Error('The schedule must contain a non-empty tracks array.');
  }
  const ids = new Set();
  for (const track of data.tracks) {
    if (!track || typeof track.id !== 'string' || !track.id || ids.has(track.id) ||
        typeof track.name !== 'string' || !Array.isArray(track.segments)) {
      throw new Error('Each track needs a unique id, a name, and a segments array.');
    }
    ids.add(track.id);
    for (const phase of track.segments) {
      if (!phase || !['string', 'number'].includes(typeof phase.id) ||
          typeof phase.label !== 'string' || !Number.isFinite(phase.startMinute) ||
          !Number.isFinite(phase.endMinute) || phase.startMinute < 0 ||
          phase.endMinute > 1440 || phase.startMinute >= phase.endMinute) {
        throw new Error(`Invalid UTC segment in track ${track.id}. Use minutes from 0 through 1440.`);
      }
    }
  }
  return data;
}
export async function loadSchedule(fetcher = globalThis.fetch) {
  const response = await fetcher(SCHEDULE_URL);
  if (!response.ok) throw new Error(`Schedule could not be loaded (HTTP ${response.status}).`);
  return validateSchedule(await response.json());
}
