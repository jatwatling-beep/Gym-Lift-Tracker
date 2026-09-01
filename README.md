# Gym Lift Tracker

A tiny installable app for tracking your gym lifts. No server, no account —
everything you log is stored on your device (`localStorage`), and it works
offline once installed.

Comes pre-loaded with four lifts: **Squat, Bench Press, Clean, Snatch**.
Add more any time with the **+** button.

## Install it on your phone

The app is a [PWA](https://web.dev/progressive-web-apps/), so "installing"
it means opening it once in your phone's browser and adding it to your home
screen — no App Store needed.

1. This repo auto-deploys to GitHub Pages on every push to `main` (see
   `.github/workflows/deploy-pages.yml`). One-time setup: in the repo on
   GitHub, go to **Settings → Pages** and set **Source** to **GitHub
   Actions**. After that, pushes to `main` publish automatically.
2. On your phone, open the published URL (shown on the **Settings → Pages**
   screen, or under the "deploy" job in the **Actions** tab — looks like
   `https://<your-username>.github.io/<repo-name>/`).
3. **iPhone (Safari):** tap the Share icon → **Add to Home Screen**.
   **Android (Chrome):** tap the ⋮ menu → **Install app** (or **Add to Home
   screen**).
4. Open it from your home screen like any other app. It'll keep working
   without a signal — your data lives on the phone, not in the cloud.

## Local development

No build step. Just open `index.html` in a browser, or serve the folder
locally, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Data

Everything (lifts + logged sets) is saved to `localStorage` on-device.
Clearing your browser's site data for this app will erase it, so it isn't a
backup — but nothing ever leaves your phone either.
