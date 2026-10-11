# V20 official Public API change monitoring

A scheduled GitHub Actions workflow checks weekly on Monday UTC 03:17 and can be started with **Run workflow**.

**Required repository variable:** `OFFICIAL_PUBLIC_API_CSV_URL` must be set to a working, directly downloadable official `https://data.go.kr/` or `https://www.data.go.kr/` CSV URL. The informational dataset page `https://www.data.go.kr/data/15062804/fileData.do` is **not** itself a CSV download link, so do not enter that page as the variable. If unset, the workflow logs a warning and leaves the catalog untouched. Do not paste authentication tokens into a repository variable or commit them into code.

On a valid source: download CSV with bounds, parse/validate every listed API, compare IDs and normalized metadata against the current 13-shard snapshot, record new/modified/removed API IDs, refuse drops over the configured safety limits, run tests, then open/update a **review PR**. **Removals are never silently merged.** Review change report before merge. The existing detail-page-verified file `data/public-apis.json` is not rewritten.

GitHub repository settings must permit GitHub Actions to create pull requests. Scheduled checks alone do not mean the official source is connected or updates were published.

Manual offline test:
```sh
node scripts/public-api-v20.test.mjs
node scripts/update-public-api-csv.mjs /path/to/official.csv YYYY-MM-DD
```
