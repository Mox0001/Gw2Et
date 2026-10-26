// Runs in <head> before CSS to prevent a flash of the wrong saved theme.
// No saved preference always means dark, regardless of the operating system.
(() => {
  let theme = 'dark';
  try { if (localStorage.getItem('gw2-event-timers.theme') === 'light') theme = 'light'; } catch {}
  document.documentElement.dataset.theme = theme;
})();
