import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts raw Google Sheet ID from URL or bare ID string.
 * Supports URLs like:
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
 * - Raw SPREADSHEET_ID
 */
export function extractSpreadsheetId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Validate bare ID characters
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Exports one or more daily AI discoveries into a user-specified Google Sheet using Sheets API v4.
 *
 * @param {Object} options
 * @param {string} options.spreadsheetId - Target Google Sheet ID or URL
 * @param {string} options.accessToken - Valid OAuth Bearer token with spreadsheets scope
 * @param {Array<Object>|Object} options.discoveries - Array or single discovery object
 * @param {string} [options.sheetName] - Optional tab name; auto-detects first tab if omitted
 * @returns {Promise<Object>} Export outcome and metadata
 */
export async function exportToGoogleSheets({ spreadsheetId, accessToken, discoveries, sheetName }) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('A valid Google Spreadsheet ID or Sheet URL is required.');
  }
  if (!accessToken) {
    throw new Error('An authorized Google Workspace access token is required to write to Sheets.');
  }

  const items = Array.isArray(discoveries) ? discoveries : [discoveries];
  if (!items.length) {
    throw new Error('No discovery records provided to export.');
  }

  // 1. Fetch spreadsheet metadata to discover actual tab names (avoid hardcoding Sheet1)
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    let errMsg = `Failed to access Google Sheet (${metaRes.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error && errJson.error.message) {
        errMsg = errJson.error.message;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const metadata = await metaRes.json();
  const targetSheetName = sheetName || (metadata.sheets?.[0]?.properties?.title) || 'Sheet1';
  const spreadsheetTitle = metadata.properties?.title || 'Daily AI Discoveries';

  // 2. Check if the sheet already has headers
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheetName)}!A1:Z1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const checkData = await checkRes.json();
  const hasExistingHeaders = Boolean(checkData.values && checkData.values.length > 0 && checkData.values[0].length > 0);

  const headerRow = [
    'Date Checked',
    'Tool Name',
    'Developer',
    'Category',
    'Short Verdict',
    'What It Does',
    'Free Quota & Limits',
    'Regional & Pakistan Notes',
    'Official Website',
    'Try Workspace URL',
    'Google Play App',
    'Quality & Adoption Signals'
  ];

  // 3. Build data rows
  const dataRows = items.map(item => [
    item.date || item.date_checked || new Date().toISOString().split('T')[0],
    item.name || item.tool_name || '',
    item.developer || '',
    item.category || '',
    item.short_verdict || '',
    item.what_it_does || '',
    `${item.free_tier || ''} ${item.limits ? '· Limits: ' + item.limits : ''}`.trim(),
    item.signup_pakistan || 'Global signup',
    item.official_url || item.website || '',
    item.use_url || item.try_url || '',
    item.android_app_verified && item.android_play_url ? item.android_play_url : 'No official app verified',
    item.quality_evidence || ''
  ]);

  const rowsToAppend = hasExistingHeaders ? dataRows : [headerRow, ...dataRows];

  // 4. Append rows via Google Sheets API v4
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: targetSheetName,
      majorDimension: 'ROWS',
      values: rowsToAppend
    })
  });

  if (!appendRes.ok) {
    const appendErrText = await appendRes.text();
    let appendErrMsg = `Failed to append rows to sheet (${appendRes.status})`;
    try {
      const errJson = JSON.parse(appendErrText);
      if (errJson.error && errJson.error.message) {
        appendErrMsg = errJson.error.message;
      }
    } catch {}
    throw new Error(appendErrMsg);
  }

  const appendResult = await appendRes.json();

  return {
    success: true,
    spreadsheetId: cleanId,
    spreadsheetTitle,
    sheetName: targetSheetName,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    rowsAppended: items.length,
    headersCreated: !hasExistingHeaders,
    updates: appendResult.updates || {}
  };
}

// Support running directly as CLI script: node scripts/exportToGoogleSheets.js <spreadsheetId-or-url> [accessToken]
if (process.argv[1] && process.argv[1].endsWith('exportToGoogleSheets.js')) {
  const targetId = process.argv[2];
  const token = process.argv[3] || process.env.GOOGLE_ACCESS_TOKEN;

  if (!targetId || !token) {
    console.log(`
Usage:
  node scripts/exportToGoogleSheets.js <SPREADSHEET_ID_OR_URL> <ACCESS_TOKEN>

Example:
  node scripts/exportToGoogleSheets.js "https://docs.google.com/spreadsheets/d/1BxiMVs.../edit" "ya29.a0..."
    `);
    process.exit(1);
  }

  try {
    const rawFeatured = await fs.readFile(path.join(__dirname, '../data/featured.json'), 'utf8');
    const featured = JSON.parse(rawFeatured);
    const item = featured.latest || featured;

    console.log(`Exporting "${item.name}" to Google Sheet ${targetId}...`);
    const result = await exportToGoogleSheets({
      spreadsheetId: targetId,
      accessToken: token,
      discoveries: [item]
    });

    console.log('✅ Export succeeded!');
    console.log(`Title: ${result.spreadsheetTitle}`);
    console.log(`Rows added: ${result.rowsAppended}`);
    console.log(`URL: ${result.spreadsheetUrl}`);
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    process.exit(1);
  }
}
