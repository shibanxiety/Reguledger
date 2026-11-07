# ReguLedger
Static site plus a scheduled collector.
- `index.html` loads `data/records.json`.
- `scripts/fetch-updates.mjs`, run by `.github/workflows/update.yml` every 6 hours, adds new items from official feeds to `data/candidates.json` as unreviewed.
- To publish a candidate: open the official document, then copy it into `data/records.json` with its reference number, dates, status, summary and official URL (`u`). Commit to `main` and Vercel redeploys.
- Set `v` to "Official source located and checked" only after you have opened the official document.
