import {loadSchedule} from './data.js';
import {mountTimeline} from './timeline-view.js';

const main = document.querySelector('#timer');
const themeToggle = document.querySelector('#theme-toggle');
function updateThemeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  themeToggle.textContent = light ? 'Dark mode' : 'Light mode';
  themeToggle.setAttribute('aria-pressed', String(light));
}
themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('gw2-event-timers.theme', theme); } catch {}
  updateThemeButton();
});
updateThemeButton();

try {
  const data = await loadSchedule();
  main.replaceChildren();
  mountTimeline(main, data);
} catch (error) {
  main.replaceChildren();
  const heading = document.createElement('h1');
  heading.textContent = 'Unable to load event timers';
  const message = document.createElement('p');
  message.textContent = error.message;
  const help = document.createElement('p');
  help.textContent = 'Serve this folder over HTTP, for example: python -m http.server 8000. Then open http://localhost:8000. Keep data/timers.json alongside the app.';
  const retry = document.createElement('button');
  retry.textContent = 'Try again';
  retry.addEventListener('click', () => location.reload());
  main.append(heading, message, help, retry);
}
