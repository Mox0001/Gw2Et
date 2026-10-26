# GW2 Event Timers

A standalone horizontal event timetable with click-to-copy waypoints. Plain HTML,
CSS, and native JavaScript modules: no PHP, MediaWiki, build step, account, API key,
or application server. Works on a static host, including GitHub Pages project URLs.

## Start locally

Extract this folder, open a terminal inside it, and run:

```sh
python -m http.server 8000
```

On Windows, `py -m http.server 8000` is also suitable. Open
<http://localhost:8000>. Keep the terminal running. Do not double-click index.html:
`file://` pages cannot reliably load JSON and JavaScript modules. Python is only
serving static files, not running application code. The included browser modules
use `.js` extensions for compatibility with simple Windows static servers.

## Put it on GitHub Pages

1. Create a repository and upload the **contents** of this folder. `index.html`,
   `.nojekyll`, `src/`, `styles/`, and `data/` belong at the repository root.
2. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**,
   then **main** and **/(root)**. Click **Save**.
3. Open the URL shown by GitHub after deployment. No npm install or build command
   is needed. The relative asset paths support `https://USER.github.io/REPOSITORY/`.

[Official GitHub Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
Publishing is optional: GitHub Pages normally makes the site public, including
when the source repository is private. For the original private/self-hosted use,
keep using the local server or your own access-controlled static host.

## Controls

- **Time zone:** defaults to `Automatic · <your browser's zone>`. Detection uses
  `Intl.DateTimeFormat`; it needs no location permission or IP lookup. Choose UTC,
  Europe/Berlin , or another named region to override it. The named regions use
  the browser's daylight-saving rules. The clock and event details include the
  effective UTC offset to distinguish repeated hours when clocks change.
- **Clock format:** choose 24 hours or 12 hours with AM/PM. Default: 24 hours.
  Timezone and format are saved in this browser. If storage is blocked, controls
  still work for the current visit. Automatic mode detects the zone again on load.
- **Group, window, and search:** combine filters to find events. Day/night stays
  with its expansion. Cantha appears immediately before Seitung Province; Castora
  immediately before Shipwreck Strand. Search keeps the selected groups' day/night
  rows. Previous/Next browse fixed windows; Now resumes following the current time.
- **Waypoints:** click the code on a block or select an event and use Copy waypoint.
  If clipboard permission is unavailable, select the displayed code and press
  Ctrl+C / Command+C. On a phone, long-press the field to copy. HTTPS (GitHub Pages)
  or localhost provides the best browser clipboard support. Missing codes remain
  unavailable; the app does not invent waypoints.
- **Theme:** dark on the first visit, even when the operating system prefers light.
  The Light mode button saves your explicit preference.

The red line advances every second according to the viewer's device clock. Enable
automatic date/time on the device for accurate results. Times repeat from UTC
source data and are converted for display only. Changing the display timezone
does not move the underlying events. Date and offset are visible in full event
details and tick tooltips; this matters around midnight and daylight-saving changes.

## Small, testable architecture

| File | Responsibility |
| --- | --- |
| `index.html` | Accessible shell and relative asset URLs |
| `styles/base.css`, `styles/timeline.css` | Dark/light variables, responsive controls, horizontal lanes |
| `src/app.js`, `src/theme.js` | Startup, loading errors, saved theme |
| `src/data.js` | Relative JSON loading and schema validation |
| `src/schedule.js` | UTC occurrence expansion and midnight joining |
| `src/time.js` | Browser zone detection and 12/24-hour formatting |
| `src/preferences.js` | Validated settings and safe localStorage access |
| `src/timeline-model.js` | Pure geometry, filtering, regional row order |
| `src/timeline-view.js` | DOM rendering and interaction wiring |
| `src/clipboard.js` | Clipboard API with selected-text fallback |
| `data/timers.json` | Preserved schedule plus source metadata |
| `tests/*.test.js` | Time, schedule, filtering, data and clipboard tests |

Rendering uses DOM `textContent` for dataset labels, never HTML injection. There
are no third-party JavaScript packages, fonts, analytics, CDNs, or runtime API
requests. Once assets are loaded, the open page keeps ticking without network
access. This is not a service-worker offline app: offline reload requires a local
server serving the included files. Event links open the official wiki in a new tab
and require that website to be available.

## Run the checks

With Node.js 20 or newer:

```sh
npm test
```

No dependency installation is needed. The tests use Node's built-in test runner.
They cover UTC midnight joining, continuous lanes, clipping, regional ordering,
search, timezone overrides, fractional offsets, both DST transitions, midnight/noon
in both formats, persisted/blocked storage, data validation, repository subpaths,
and clipboard success/denial/manual fallback.

For a browser smoke test, select UTC, switch to 12-hour display, then choose
Asia/Dubai; confirm a four-hour change in the labels while the same events remain
in place. Reload to check saved settings. Test both expansion filters, Previous /
Now / Next, a waypoint copy into a text editor, keyboard focus, and a narrow screen.

## Data maintenance and provenance

The bundled file is copied unchanged from the working local reader: 44 tracks,
2,075 UTC segments, with a recorded Wayback capture of **2026-09-20 23:05:02 UTC**.
It is an archived schedule, not live event telemetry, and may miss later game
changes. The October 14 layout reference does not change this dataset's capture
date. The official ArenaNet API is not used to fabricate or replace this timetable.

To maintain the schedule, replace `data/timers.json` with verified data using the
same schema, update its source metadata and `ATTRIBUTION.md`, run `npm test`, and
commit the reviewed change. The bundled-data test deliberately checks the current
capture and track count: update those expectations when intentionally changing
the source. No crawler, live scraper, or AI content generator is included.

Each track has a unique string `id`, `name`, `category`, `page`, and `segments`.
Each segment has an `id`, `label`, `startMinute`, `endMinute`, and optional
`chatLink` and `page`. Minutes are UTC within a day, with `0 <= start < end <= 1440`.
Split a phase crossing midnight into two same-id pieces at 1440/0; the engine joins
matching contiguous pieces. Empty labels represent unscheduled gaps. Preserve
track IDs `eod-dn`, `eod-sp`, `voe-dn`, and `voe-ss` for the requested row placement.
Changes are made in source control; this standalone timer has no page editor.

Code is licensed separately from the preserved schedule. See `LICENSE` and
`ATTRIBUTION.md`. This repository is a timer, not a full wiki mirror.
