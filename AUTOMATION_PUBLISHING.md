# ChatGPT Automation publishing contract

This repository uses ChatGPT Automation as the daily research and publishing controller.

## Responsibilities

- **ChatGPT Automation:** research, source verification, free-tier eligibility checks, duplicate avoidance, Pakistan availability review, and the atomic Git commit.
- **GitHub:** versioned source of truth for featured data, the historical ledger, and dated research reports.
- **GitHub Actions:** validate repository data and deploy the static site to GitHub Pages. Actions do not research or invent discoveries.
- **GitHub Pages:** serve the static dashboard and JSON data.
- **Vercel:** optional legacy Express/API hosting only; not required for the daily workflow.
- **Supabase:** optional future archive/database. Do not use an unrelated existing Supabase project or store credentials in this repository.

## Daily run rules

1. Use the current date in `Asia/Karachi`.
2. Read `config/schedule.json` and select the category for the current weekday. Saturday is the hidden-gems day and may select any category.
3. Select exactly one genuinely useful tool.
4. It must have a usable free tier or freemium plan. Exclude products that require payment before meaningful use. Paid upgrades may exist, but clearly describe what is free and what is paid.
5. Read all of `data/history.json` and compare names, product identity, developer, official domain, and use case. Do not republish a renamed version, model version, or near-duplicate of an existing discovery. If a candidate is too similar, research another candidate.
6. Verify current plan/pricing and quotas from official sources. Also verify the official website, direct try/use URL, Android app through the official Google Play listing (or explicitly state no official app was verified), Pakistan signup/access restrictions when evidence is available, and credible quality/adoption evidence. Never invent quotas, benchmark results, regional access, or app availability.
7. If a claim cannot be verified, say so explicitly. Include at least two source URLs, prioritizing official product/pricing/docs sources.
8. Create a detailed Markdown report at `reports/YYYY-MM-DD.md`. Include the research date, category, developer, what it does, why it is worth trying, free tier, limits, Pakistan access, Android status, quality evidence, official website, direct try link, pricing link when available, and source links.
9. Update `data/featured.json` so `updated_at` and `latest.date` equal today's Pakistan date. The latest object must include: `date`, `date_checked`, `name`, `developer`, `category`, `short_verdict`, `what_it_does`, `why_try_it`, `free_tier`, `limits`, `signup_pakistan`, `quality_evidence`, `android_app_verified` (boolean), `android_status`, `android_play_url` (empty string if not verified), `official_url`, `use_url`, `pricing_url` (empty string if unavailable), and `sources` (array of URLs).
10. Add exactly one summary record for today's date to the beginning of `data/history.json`. Preserve every previous record. Do not replace or delete the historical ledger. The summary record must include `date`, `name`, `category`, `short_verdict`, `official_url`, `use_url`, `android_app_verified`, and `android_play_url`.
11. Publish all three changed files in **one atomic Git commit**. Use the Git data API sequence: read the current `main` ref and commit/tree; create blobs for all three complete files; create one tree based on the current tree; create one commit with the current commit as parent; update `refs/heads/main` with an expected-SHA/lease check. Never force-push. If the expected SHA no longer matches, re-read the latest branch and rebuild the commit against it.
12. After the commit, inspect the GitHub Actions run. Confirm only what the workflow reports: validation passed and Pages deployment succeeded. If validation or deployment fails, report the failure and do not claim the website was updated.
13. If today's date already exists in history, do not publish another discovery. Report that today's entry already exists and stop.
14. Do not add API keys, OAuth tokens, service-role keys, or other secrets to files or commits.

## Important deployment distinction

The daily automation itself performs research and creates the Git commit. That commit triggers `.github/workflows/pages.yml`. The workflow runs `scripts/validate-data.js` before uploading the static site to GitHub Pages. A successful commit alone is not proof of successful deployment.
