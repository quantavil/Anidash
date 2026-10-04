# Browser checks

These checks use isolated Chromium contexts. The journal test seeds its own browser storage and intercepts MAL requests, so it never changes a real account. Test data is not imported by the app.

Install Python Playwright in a virtual environment, then install Chromium:

```sh
python3 -m venv /tmp/anidash-browser-env
/tmp/anidash-browser-env/bin/pip install playwright
/tmp/anidash-browser-env/bin/playwright install chromium
```

Build and serve the production app in one terminal:

```sh
VITE_MAL_CLIENT_ID=dummy npm run build
VITE_MAL_CLIENT_ID=dummy npm run preview -- --host 127.0.0.1 --port 4173
```

Run checks in another terminal:

```sh
/tmp/anidash-browser-env/bin/python tests/browser/watch-journal.py http://127.0.0.1:4173
/tmp/anidash-browser-env/bin/python tests/browser/offline-shell.py http://127.0.0.1:4173
```

Journal screenshots are saved to `/tmp/anidash-ui-checks`. The journal check covers personal score persistence, episode increment/correction, PTW auto-watch, status changes, filtering, native settings keyboard dismissal, unknown totals, complete totals, long titles, journal/grid switching, Browse cards, clickable status menus, seasonal request limits, and 320/390/820/1440px layouts. The offline check loads once online, disables the network, navigates and reloads `/`, `/browse`, and `/stats`, and checks that the service worker cached only same-origin shell assets.
