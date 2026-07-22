# User Journey Screenshots

Screenshots captured from the app running locally in mock mode, following the
[User Journey](../../README.md#user-journey-ui-walkthrough) in the main README
(`docker compose up --build`, then browse to http://localhost:3000):

| File | What it shows |
|------|----------------|
| `01-login.png` | Login page (with demo credentials card) |
| `02-logs-dashboard.png` | Logs dashboard after signing in as `admin` |
| `03-search.png` | Prefix search (`archive/`) with filtered results |
| `04-download-toast.png` | Success toast after downloading a log file |
| `05-presign-modal.png` | "Temporary access link" modal with URL + expiry |
| `06-dark-mode.png` | Dashboard in dark mode (toggle in navbar) |

Captured automatically with Playwright (headless Chromium) against the mock
provider — the whole journey takes ~2 minutes and needs no cloud credentials.