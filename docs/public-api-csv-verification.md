# V16.2 official CSV verification

Use uploaded official CSV (2026-09-30) through `node scripts/import-public-api-csv.mjs SOURCE.csv data/public-api-csv-review.json`. This is an **unpublished metadata-only** staging file; do not merge it into `data/public-apis.json`.

Run `node scripts/verify-public-api-csv.mjs data/public-api-csv-review.json 100` to verify up to 100 official detail pages, compare actual ID, API name and provider, and append only passing entries. It skips existing IDs and stores failures in `data/public-api-csv-verify-state.json`. Use `node public-api.test.mjs` before committing. Reconcile with currently running V16 PR #51 before merging any generated data. Never claim CSV-only records are official-detail-verified or live-call-tested.

For large source files keep review data local or as a GitHub Actions artifact, not in the public Pages deployment.
