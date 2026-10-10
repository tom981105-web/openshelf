# Official Open API bulk source (review-only)

Source: https://www.data.go.kr/data/15062804/fileData.do

Use the latest monthly **공공데이터활용지원센터_공공데이터포털 목록개방현황** CSV supplied directly by the official portal. It is not downloaded from a third-party mirror. The importer never changes published `data/public-apis.json` and never assumes that CSV listing means successful API invocation or verified detail-page content.

Run after downloading the CSV:

```bash
node scripts/import-public-api-csv.mjs /path/to/official.csv data/public-api-csv-review.json
node scripts/import-public-api-csv.test.mjs
```

The importer accepts only exact 8-digit IDs, API rows, and official `https://www.data.go.kr/data/<id>/openapi.do` URLs, de-duplicates against the existing published catalog, handles quoted CSV fields including commas/newlines, and records `metadata-only` verification level. Files with changed header schema fail closed.

**Publishing policy:** Do NOT merge its review-only candidates into the public catalog automatically. Before publishing, fetch and parse each official detail page and verify name/provider/ID, using `scripts/refresh-public-apis.mjs` or equivalent. Use a staging/verification queue and preserve failures for later retry. Run `node public-api.test.mjs` and GitHub Actions before merging. The currently running V16 PR #51 may add records concurrently; always rebase and de-duplicate against latest main before processing candidates.
