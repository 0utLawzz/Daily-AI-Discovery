import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
};
const readJson = async (relativePath) => JSON.parse(
  await fs.readFile(path.join(root, relativePath), 'utf8')
);
const normalize = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

try {
  const [featuredFile, history, schedule] = await Promise.all([
    readJson('data/featured.json'),
    readJson('data/history.json'),
    readJson('config/schedule.json')
  ]);
  const latest = featuredFile.latest || featuredFile;

  if (!Array.isArray(history) || history.length === 0) {
    fail('data/history.json must be a non-empty array.');
  }
  if (!latest || typeof latest !== 'object') fail('data/featured.json must contain a latest discovery object.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(latest.date || '')) fail('Latest discovery date must use YYYY-MM-DD.');
  if (featuredFile.updated_at !== latest.date) fail('featured.updated_at must match latest.date.');
  for (const field of ['name', 'developer', 'category', 'short_verdict', 'what_it_does', 'why_try_it', 'free_tier', 'limits', 'signup_pakistan', 'quality_evidence', 'official_url', 'use_url']) {
    if (!String(latest[field] || '').trim()) fail(`Latest discovery is missing required field: ${field}`);
  }
  if (!Array.isArray(latest.sources) || latest.sources.length < 2) {
    fail('Latest discovery must include at least two source URLs.');
  }
  for (const field of ['official_url', 'use_url', 'pricing_url']) {
    if (latest[field] && !/^https:\/\//i.test(latest[field])) fail(`${field} must be an HTTPS URL.`);
  }
  if (typeof latest.android_app_verified !== 'boolean') {
    fail('android_app_verified must be an explicit boolean.');
  }
  if (latest.android_app_verified && !/^https:\/\//i.test(latest.android_play_url || '')) {
    fail('A verified Android app must include its official HTTPS Play Store URL.');
  }
  if (!Array.isArray(schedule.days) || schedule.days.length !== 7 || schedule.timezone !== 'Asia/Karachi') {
    fail('Schedule must define seven days and use Asia/Karachi timezone.');
  }

  const seenDates = new Set();
  const seenNames = new Set();
  for (const item of history) {
    if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) fail(`Invalid history date: ${item.date || '(missing)'}`);
    if (seenDates.has(item.date)) fail(`More than one discovery exists for ${item.date}.`);
    seenDates.add(item.date);

    const key = normalize(item.name);
    if (!key) fail('Every history item must have a name.');
    if (seenNames.has(key)) fail(`Duplicate discovery name in history: ${item.name}`);
    seenNames.add(key);
  }

  const latestHistory = history.find(item =>
    item.date === latest.date && normalize(item.name) === normalize(latest.name)
  );
  if (!latestHistory) fail('The latest featured discovery must also exist in history.json.');

  const reportPath = path.join(root, 'reports', `${latest.date}.md`);
  const report = await fs.readFile(reportPath, 'utf8').catch(() => null);
  if (!report) fail(`Missing dated report: reports/${latest.date}.md`);
  else if (!report.toLowerCase().includes(String(latest.name).toLowerCase())) {
    fail('The latest dated report must mention the featured discovery name.');
  }

  if (process.exitCode) {
    console.error('Data validation failed. GitHub Pages deployment will be blocked.');
    process.exit(1);
  }
  console.log(`✓ Data validation passed: ${history.length} historical discoveries; latest is "${latest.name}" (${latest.date}).`);
} catch (error) {
  console.error('✖ Validation could not complete:', error.message);
  process.exit(1);
}
