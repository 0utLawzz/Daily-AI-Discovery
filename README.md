# Daily AI Discovery

> **One useful free or freemium AI discovery, researched every day.**  
> Continuous 24h curation cycle · Zero duplicate ledger · Field-tested quotas · Pakistan & South Asia accessibility audits · Zero sponsors.

![Daily AI Discovery Social Banner](og-image.svg)

---

## Highlights & Features

- **24-Hour Editorial Cycle**: Hand-researched AI tools covering weekly category rotations (Audio, Image, Video, Animation, Developer/CLI, Hidden Gems, Reasoning).
- **Interactive Brutalist UI**: Custom typography, 3x preview image showcase, verified destination badges (Official Website, Direct Sandbox, Google Play Store app verification).
- **Google Sheets Live Sync**: One-click OAuth Google Workspace integration to push curated discoveries directly into your private or team Google Sheets.
- **Daily ChatGPT Automation publishing**: ChatGPT researches exactly one eligible tool per day and commits the verified discovery, history entry, and dated report to GitHub in one atomic commit.
- **Real-Time Sheets URL Regex Validation**: Instant visual badge (`✓ Valid ID format` / `⚠️ Invalid link`) as you paste or type.
- **One-Click CSV & JSON Vault Export**: Download the entire verified discovery dataset instantly to your computer (`.csv` or `.json`).
- **RSS 2.0 & JSON Feed 1.1**: Syndicate discoveries to Feedly, Slack, Discord bots, and RSS readers via `/feed.xml` and `/feed.json`.
- **Pakistan-Verified Filter Switch**: One-click archive filter to reveal tools confirmed to work without regional VPNs or foreign phone numbers.
- **Keyboard Shortcuts**:
  - `1` → Latest Pick
  - `2` → 7-Day Schedule
  - `3` → Historical Vault
  - `4` → Daily Research Tool
  - `/` → Focus Vault Search
  - `Esc` → Blur search input
- **Web Audio SFX Engine**: Micro-synthesizer sound feedback for clicks and confirmations (with persistent mute toggle).
- **Optional Supabase archive**: `schema.sql` is available for a future database-backed archive; it is not required for daily publishing.
- **GitHub Pages publishing**: GitHub Actions validates the data before deploying the static dashboard. Vercel is optional and is not in the daily publishing path.
- **GitHub Community Standards**: MIT License, Contributor Covenant Code of Conduct, security policy, and structured nomination/bug report templates.

---

## Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/0utLawzz/Daily-AI-Discovery.git
cd Daily-AI-Discovery

# Install dependencies
npm install

# Start development server
npm run dev
# Server listening on http://localhost:3000
```

---

## Daily publishing architecture

1. A ChatGPT Automation task runs daily in the `Asia/Karachi` timezone.
2. It researches exactly one tool according to `config/schedule.json`.
3. It checks `data/history.json` to prevent repeats and verifies pricing, free-tier limits, official links, Android availability, Pakistan access, and evidence.
4. It creates one atomic Git commit updating `data/featured.json`, `data/history.json`, and `reports/YYYY-MM-DD.md`.
5. GitHub Actions runs `scripts/validate-data.js`. Only valid data is deployed to GitHub Pages.

**Important:** GitHub Actions does not perform AI research. ChatGPT Automation is the research and publishing controller. GitHub Actions only validates and deploys the commit. See [`AUTOMATION_PUBLISHING.md`](AUTOMATION_PUBLISHING.md) for the exact publishing contract.

## Optional Vercel deployment

The repository contains a legacy Express/Vercel configuration for optional API hosting. It is not required for the ChatGPT-to-GitHub publishing flow. Do not put Supabase service-role keys, Google OAuth tokens, or publishing secrets in browser code or repository files.

---

## Supabase Database Setup

To persist your discoveries in a dedicated PostgreSQL database:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Paste the contents of `schema.sql` and click **Run**.
4. In the app's **Research Tool**, paste your project URL and click **Sync Vault to Supabase** (or set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your `.env`).

---

## Syndication & Feeds

- **RSS 2.0 XML**: `https://your-domain.com/feed.xml`
- **JSON Feed 1.1**: `https://your-domain.com/feed.json`
- **CSV Archive Export**: `https://your-domain.com/api/export/csv`

---

## Project Structure

```text
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── tool_nomination.md
│   ├── pull_request_template.md
│   └── workflows/pages.yml
├── config/
│   └── schedule.json          # Weekly rotation schedule & research rules
├── data/
│   ├── featured.json          # Active featured discovery
│   └── history.json           # Permanent no-repeat historical repository
├── reports/                   # Dated markdown research reports
├── scripts/validate-data.js   # Pre-deployment data integrity checks
├── AUTOMATION_PUBLISHING.md   # ChatGPT Automation publishing contract
├── CODE_OF_CONDUCT.md         # Contributor Covenant v2.1
├── CONTRIBUTING.md            # Editorial guidelines & submission process
├── LICENSE                    # MIT License
├── SECURITY.md                # Security vulnerability disclosure
├── schema.sql                 # Supabase PostgreSQL schema & RLS policies
├── vercel.json                # Vercel serverless deployment config
├── favicon.svg                # Brutalist SVG favicon
├── og-image.svg               # 1200x630 OpenGraph social preview card
├── server.js                  # Express backend & API endpoints
├── index.html                 # Complete single-page dashboard
└── package.json               # Node.js dependencies & scripts
```

---

## GitHub Community Standards

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [MIT License](LICENSE)

---

## License

This project is licensed under the [MIT License](LICENSE).
