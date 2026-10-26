import {timeWindow, position, geometry, ticks, isDayNight, waypoint, WINDOW_HOURS, PIXELS_PER_HOUR} from './timeline-model.js';
import {timelineRows} from './timeline-model.js';
import * as T from './time.js';
import * as schedule from './schedule.js';
import {loadPreferences, savePreferences} from './preferences.js';
import {copyWaypointCode} from './clipboard.js';

const element = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text != null) result.textContent = text;
  if (className) result.className = className;
  return result;
};
const pageLink = (text, title) => {
  const result = element('a', text);
  result.href = 'https://wiki.guildwars2.com/wiki/' + encodeURIComponent(title || text);
  result.target = '_blank';
  result.rel = 'noopener noreferrer';
  return result;
};

export function mountTimeline(main, data) {
  const root = element('section', null, 'event-timeline');
  main.append(root);
  root.append(element('p', 'ARCHIVED UTC SCHEDULE · LOCAL DISPLAY', 'eyebrow'), element('h1', 'Event timers'));
  const sourceDate = data.source?.capture ? `${data.source.capture.slice(0, 4)}-${data.source.capture.slice(4, 6)}-${data.source.capture.slice(6, 8)}` : data.source?.revisionDate || 'not recorded';
  root.append(element('p', `Schedule source: ${sourceDate}. Times repeat from the preserved UTC schedule, later game changes are not included.`, 'note'));
  const controls = element('div', null, 'timer-controls');
  const zone = element('select'), clockFormat = element('select'), category = element('select'), horizon = element('select'), query = element('input');
  const preferences = loadPreferences();
  const autoOption = new Option(`Automatic (device) · ${T.detectedZone()}`, 'local');
  zone.append(autoOption);
  for (const value of T.zones([preferences.zone])) {
    zone.append(new Option(value === 'Asia/Dubai' ? 'Asia/Dubai · GMT+4' : value, value));
  }
  zone.value = preferences.zone;
  clockFormat.append(new Option('24 hours', '24'), new Option('12 hours · AM/PM', '12'));
  clockFormat.value = preferences.clockFormat;
  category.append(new Option('All event groups', ''));
  for (const value of [...new Set(data.tracks.filter(t => !isDayNight(t)).map(t => t.category || 'Other'))]) category.append(new Option(value, value));
  for (const value of WINDOW_HOURS) horizon.append(new Option(value + ' hours', String(value)));
  horizon.value = '2';
  query.type = 'search';
  query.placeholder = 'Filter event names…';
  for (const [name, input] of [['Time zone', zone], ['Clock format', clockFormat], ['Group', category], ['Window', horizon], ['Search', query]]) {
    const label = element('label', name);
    input.setAttribute('aria-label', name);
    label.append(input); controls.append(label);
  }
  root.append(controls);
  root.append(element('p', 'Automatic uses your device time zone. To use another region, including your VPN location, choose it from the Time zone dropdown.', 'note'));
  const toolbar = element('div', null, 'timeline-toolbar'), navigation = element('div', null, 'timeline-navigation');
  const previous = element('button', '← Previous'), current = element('button', 'Now'), next = element('button', 'Next →');
  previous.type = current.type = next.type = 'button';
  previous.setAttribute('aria-label', 'Previous time window'); next.setAttribute('aria-label', 'Next time window');
  navigation.append(previous, current, next);
  const clock = element('p', '', 'timeline-clock');
  toolbar.append(navigation, clock); root.append(toolbar);
  const range = element('p', '', 'timeline-range muted'); root.append(range);
  const detail = element('section', null, 'timeline-detail');
  detail.setAttribute('aria-label', 'Selected event details');
  const message = element('p', 'Select an event for its full timing and waypoint. Click a waypoint code to copy it.', 'muted');
  detail.append(message); root.append(detail);
  const copyStatus = element('p', '', 'timeline-copy-status');
  copyStatus.setAttribute('role', 'status'); copyStatus.setAttribute('aria-live', 'polite');
  root.append(copyStatus);
  const scroll = element('div', null, 'timeline-scroll');
  scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Horizontal event timeline. Scroll sideways for more times.');
  root.append(scroll);
  const panLeft = element('button', '← Scroll left'), panRight = element('button', 'Scroll right →');
  panLeft.type = panRight.type = 'button';
  navigation.append(panLeft, panRight);
  panLeft.onclick = () => { scroll.scrollLeft -= scroll.clientWidth * 0.75; };
  panRight.onclick = () => { scroll.scrollLeft += scroll.clientWidth * 0.75; };

  root.append(element('p', 'The red line is the current time. Event blocks keep their original UTC schedule; every displayed time uses your selected time zone. Missing waypoint codes are left unavailable.', 'timeline-help muted'));

  let manualStart = null, windowRange, board, nowLayer, nowLabel, selected = null, selectedStatus = null, rendered = [], timer;
  let disposed = false;
  const timeLabels = new Map();
  const collapsedGroups = new Set();
  let displayZone = T.timeZone(zone.value);
  const fullTime = instant => {
    const minute = Math.floor(instant / 60000) * 60000;
    const key = `${displayZone}:${clockFormat.value}:${minute}`;
    if (!timeLabels.has(key)) {
      if (timeLabels.size > 2048) timeLabels.clear();
      timeLabels.set(key, `${T.formatDate(minute, displayZone)} · ${T.formatTime(minute, displayZone, clockFormat.value)} · ${T.zoneLabel(minute, displayZone)}`);
    }
    return timeLabels.get(key);
  };
  const eventStatus = (event, now) => event.continuous ? 'Continuous' : now < event.start ? `Starts in ${Math.ceil((event.start - now) / 60000)} min` : now < event.end ? `Active · ${Math.ceil((event.end - now) / 60000)} min left` : 'Finished';

  function showEvent(event) {
    selected = event;
    const body = element('div', null, 'timeline-detail-body');
    body.append(element('strong', event.label), element('span', event.trackName, 'muted'));
    body.append(element('span', event.continuous ? 'Continuous phase' : `${fullTime(event.start)} → ${fullTime(event.end)}`, 'timeline-detail-time'));
    selectedStatus = element('span', eventStatus(event, Date.now()), 'timeline-detail-state');
    body.append(selectedStatus);
    const actions = element('div', null, 'timeline-detail-actions'), code = waypoint(event.chatLink);
    if (code) {
      const field = element('input'); field.value = code; field.readOnly = true;
      field.setAttribute('aria-label', 'Waypoint code'); field.onclick = () => field.select();
      const copy = element('button', 'Copy waypoint'); copy.type = 'button'; copy.onclick = () => copyWaypoint(event);
      actions.append(field, copy);
    } else actions.append(element('span', 'No waypoint in the preserved schedule.', 'muted'));
    actions.append(pageLink('Open event page ↗', event.page || event.trackName));
    detail.replaceChildren(body, actions);
    for (const item of rendered) item.button.setAttribute('aria-pressed', String(item.event === event));
  }

  async function copyWaypoint(event) {
    const code = waypoint(event.chatLink);
    if (!code) return;
    showEvent(event);
    const result = await copyWaypointCode(code, {
      selectField: () => {
        const field = detail.querySelector('input');
        field?.focus(); field?.select();
      },
    });
    copyStatus.textContent = result === 'copied'
      ? `Waypoint copied: ${code}`
      : 'Select the waypoint field above and press Ctrl+C (or Command+C).';

  }

  function draw(center = false) {
    const now = Date.now();
    autoOption.text = `Automatic (device) · ${T.detectedZone()}`;
    displayZone = T.timeZone(zone.value);
    windowRange = timeWindow(now, Number(horizon.value), manualStart);
    range.textContent = `${fullTime(windowRange.start)} → ${fullTime(windowRange.end)}`;
    current.classList.toggle('following-now', manualStart === null);
    current.setAttribute('aria-pressed', String(manualStart === null));
    const oldScroll = {left: scroll.scrollLeft, top: scroll.scrollTop};
    board = element('div', null, 'timeline-board');
    board.style.setProperty('--plot-min', `${Number(horizon.value) * PIXELS_PER_HOUR}px`);
    board.style.setProperty('--tick-count', String(Number(horizon.value) * 4));
    const axis = element('div', null, 'timeline-axis timeline-row'), axisName = element('div', displayZone === 'UTC' ? 'UTC' : 'SELECTED TIME', 'timeline-name timeline-axis-name'), axisPlot = element('div', null, 'timeline-plot');
    for (const tick of ticks(windowRange)) {
      const label = element('span', T.formatTime(tick.instant, displayZone, clockFormat.value), 'timeline-tick');
      label.style.left = tick.left + '%'; label.title = fullTime(tick.instant);
      if (tick.left === 0) label.classList.add('first-tick');
      if (tick.left === 100) label.classList.add('last-tick');
      axisPlot.append(label);
    }
    nowLabel = element('span', '', 'timeline-now-label'); axisPlot.append(nowLabel);
    axis.append(axisName, axisPlot); board.append(axis);
    const rows = timelineRows(data, windowRange, schedule, category.value, query.value);
    let group = null, colorIndex = -1;
    rendered = [];
    for (const row of rows) {
      const daylight = isDayNight(row.track), name = row.track.category || 'Other';
      if (group !== name) {
        group = name; colorIndex++;
        const groupRow = element('div', null, 'timeline-group');
        const toggle = element('button', '', 'timeline-group-name timeline-group-toggle');
        toggle.type = 'button';
        const updateToggle = () => {
          const expanded = !collapsedGroups.has(name);
          toggle.textContent = `${expanded ? '▾' : '▸'} ${name}`;
          toggle.setAttribute('aria-expanded', String(expanded));
          toggle.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${name}`);
        };
        toggle.onclick = () => {
          if (collapsedGroups.has(name)) collapsedGroups.delete(name);
          else collapsedGroups.add(name);
          for (const lane of board.querySelectorAll('.timeline-lane')) {
            if (lane.dataset.group === name) lane.hidden = collapsedGroups.has(name);
          }
          updateToggle();
        };
        updateToggle();
        groupRow.append(toggle); board.append(groupRow);
      }
      const lane = element('section', null, `timeline-row timeline-lane timeline-tone-${colorIndex % 6}${daylight ? ' timeline-daynight' : ''}`);
      lane.setAttribute('aria-label', row.track.name);
      lane.dataset.group = name;
      lane.hidden = collapsedGroups.has(name);
      const label = element('div', null, 'timeline-name'); label.append(pageLink(row.track.name, row.track.page || row.track.name));
      const plot = element('div', null, 'timeline-plot');
      for (const event of row.events) {
        const placement = geometry(event, windowRange);
        if (!placement) continue;
        const bar = element('div', null, 'timeline-event');
        bar.style.left = placement.left + '%'; bar.style.width = placement.width + '%';
        const compact = placement.width / 100 * Number(horizon.value) * PIXELS_PER_HOUR < 72;
        bar.classList.toggle('is-short', compact);
        bar.classList.toggle('is-wide', placement.width / 100 * Number(horizon.value) * PIXELS_PER_HOUR >= 200);
        if (daylight) {
          const phase = /dawn/i.test(event.label) ? 'dawn' : /dusk/i.test(event.label) ? 'dusk' : /night/i.test(event.label) ? 'night' : 'day';
          bar.classList.add('timeline-' + phase);
        }
        const button = element('button', event.label, 'timeline-event-name'); button.type = 'button';
        const timing = event.continuous ? 'Continuous phase' : `${fullTime(event.start)} → ${fullTime(event.end)}`;
        button.setAttribute('aria-label', `${event.label}. ${timing}. Show event details.`);
        button.setAttribute('aria-pressed', 'false'); button.onclick = () => showEvent(event);
        bar.title = `${event.label}\n${timing}${waypoint(event.chatLink) ? '\n' + waypoint(event.chatLink) : ''}`;
        bar.append(button);
        const code = waypoint(event.chatLink);
        if (code && !daylight) {
          const copy = element('button', compact ? '⧉' : code, 'timeline-waypoint'); copy.type = 'button';
          copy.setAttribute('aria-label', `Copy waypoint ${code} for ${event.label}`);
          copy.title = 'Copy waypoint ' + code; copy.onclick = () => copyWaypoint(event); bar.append(copy);
        }
        plot.append(bar); rendered.push({event, bar, button});
      }
      lane.append(label, plot); board.append(lane);
    }
    if (!rows.some(r => !isDayNight(r.track) && r.events.length)) {
      const empty = element('div', 'No matching events in this time window. Day/night remains visible above.', 'timeline-empty'); board.append(empty);
    }
    nowLayer = element('div', null, 'timeline-now-layer'); nowLayer.setAttribute('aria-hidden', 'true');
    nowLayer.append(element('div', null, 'timeline-now-line')); board.append(nowLayer);
    scroll.replaceChildren(board);
    scroll.scrollLeft = oldScroll.left; scroll.scrollTop = oldScroll.top;
    if (selected) {
      const match = rendered.find(x => x.event.trackId === selected.trackId && x.event.id === selected.id && x.event.start === selected.start);
      if (match) showEvent(match.event);
      else { selected = null; selectedStatus = null; detail.replaceChildren(message); }
    }
    tick();
    if (center) requestAnimationFrame(() => {
      if (!root.isConnected) return;
      const labelWidth = axisName.getBoundingClientRect().width;
      const plotWidth = axisPlot.getBoundingClientRect().width;
      scroll.scrollLeft = Math.max(0, plotWidth * position(Date.now(), windowRange) / 100 - (scroll.clientWidth - labelWidth) / 2);
    });
  }

  function tick() {
    if (disposed || !main.contains(root)) { dispose(); return; }
    const now = Date.now();
    if (manualStart === null && (now < windowRange.start || now >= windowRange.end)) { draw(true); return; }
    clock.textContent = 'Now: ' + fullTime(now);
    const visible = now >= windowRange.start && now < windowRange.end;
    nowLayer.hidden = nowLabel.hidden = !visible;
    const left = position(now, windowRange) + '%';
    nowLayer.firstElementChild.style.left = left; nowLabel.style.left = left;
    nowLabel.textContent = 'NOW ' + T.formatTime(now, displayZone, clockFormat.value);
    for (const {event, bar} of rendered) {
      bar.classList.toggle('is-active', event.start <= now && now < event.end);
      bar.classList.toggle('is-past', event.end <= now);
    }
    if (selectedStatus) selectedStatus.textContent = eventStatus(selected, now);
  }
  function dispose() {
    disposed = true; clearInterval(timer); clearTimeout(searchTimer);
    document.removeEventListener('visibilitychange', refreshVisible);
  }
  function refreshVisible() { if (!document.hidden && !disposed) draw(); }
  zone.onchange = clockFormat.onchange = () => {
    savePreferences({zone: zone.value, clockFormat: clockFormat.value});
    timeLabels.clear();
    draw();
  };
  let searchTimer;
  category.onchange = () => draw();
  query.oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => draw(), 120); };
  horizon.onchange = () => { manualStart = null; draw(true); };
  previous.onclick = () => { manualStart = windowRange.start - windowRange.span; draw(); };
  next.onclick = () => { manualStart = windowRange.end; draw(); };
  current.onclick = () => { manualStart = null; draw(true); };
  draw(true);
  timer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', refreshVisible);
  return dispose;
}
