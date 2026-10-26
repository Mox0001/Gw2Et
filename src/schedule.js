/* UTC instants are authoritative. Local time is presentation only. */
export const MINUTE = 60_000;
export const DAY = 1440 * MINUTE;

export function occurrences(data, from, to, selectedTracks = null) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 7 * DAY) {
    throw new RangeError('Select a positive timetable window of at most seven days.');
  }
  const selection = selectedTracks ? new Set(selectedTracks) : null;
  const firstDay = Math.floor(from / DAY) * DAY - DAY;
  const lastDay = Math.floor(to / DAY) * DAY + DAY;
  const results = [];
  for (const track of data.tracks || []) {
    if (selection && !selection.has(track.id)) continue;
    const parts = [];
    for (let day = firstDay; day <= lastDay; day += DAY) {
      for (const phase of track.segments || []) {
        const start = day + phase.startMinute * MINUTE,
          end = day + phase.endMinute * MINUTE;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
        parts.push({
          ...phase,
          trackId: track.id,
          trackName: track.name,
          category: track.category,
          start,
          end
        });
      }
    }
    parts.sort((a, b) => a.start - b.start || a.end - b.end);
    const merged = [];
    for (const part of parts) {
      const prior = merged.at(-1);
      if (prior && prior.id === part.id && prior.label === part.label && prior.end === part.start) prior.end = part.end;
      else merged.push({
        ...part
      });
    }
    if (merged.length === 1 && merged[0].start <= from - DAY && merged[0].end >= to + DAY) merged[0].continuous = true;
    results.push(...merged.filter(x => typeof x.label === 'string' && x.label.trim() && x.start < to && x.end > from));
  }
  return results.sort((a, b) => a.start - b.start || a.trackName.localeCompare(b.trackName));
}
