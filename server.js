import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { exportToGoogleSheets } from './scripts/exportToGoogleSheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// API: Get featured discovery
app.get('/api/featured', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data/featured.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read featured data', details: err.message });
  }
});

// API: Get history
app.get('/api/history', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read history data', details: err.message });
  }
});

// API: Get schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'config/schedule.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read schedule data', details: err.message });
  }
});

// RSS Feed: /feed.xml and /rss.xml
app.get(['/feed.xml', '/rss.xml'], async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    const history = JSON.parse(raw);
    const domain = req.headers.host ? `${req.protocol}://${req.headers.host}` : 'https://daily-ai-discovery.org';

    const itemsXml = history.slice(0, 30).map(item => {
      const pubDate = item.date ? new Date(item.date).toUTCString() : new Date().toUTCString();
      const title = (item.name || 'AI Discovery').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const category = (item.category || 'AI').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const verdict = (item.short_verdict || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const link = item.official_url || item.use_url || domain;

      return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${item.date || title}-${title.replace(/[^a-zA-Z0-9]/g, '')}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${category}</category>
      <description><![CDATA[<p><strong>Category:</strong> ${category}</p><p><strong>Verdict:</strong> ${verdict}</p><p><a href="${item.official_url || link}">Official Website</a> · <a href="${item.use_url || link}">Try Tool</a></p>]]></description>
    </item>`;
    }).join('');

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Daily AI Discovery — Curated Free &amp; Freemium AI Tools</title>
    <link>${domain}</link>
    <description>One useful free or freemium AI tool researched, stress-tested, and audited every single day. Zero repeats.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${domain}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(rssXml);
  } catch (err) {
    res.status(500).send('<?xml version="1.0"?><error>Failed to generate RSS feed</error>');
  }
});

// JSON Feed: /feed.json
app.get('/feed.json', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    const history = JSON.parse(raw);
    const domain = req.headers.host ? `${req.protocol}://${req.headers.host}` : 'https://daily-ai-discovery.org';

    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Daily AI Discovery',
      home_page_url: domain,
      feed_url: `${domain}/feed.json`,
      description: 'One useful free or freemium AI tool researched every day.',
      items: history.map(item => ({
        id: item.name,
        url: item.use_url || item.official_url || domain,
        title: item.name,
        summary: item.short_verdict,
        date_published: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        tags: [item.category]
      }))
    };
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate JSON feed' });
  }
});

// CSV Export Endpoint: /api/export/csv
app.get('/api/export/csv', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    const history = JSON.parse(raw);

    const headers = ['Date', 'Name', 'Category', 'Short Verdict', 'Official URL', 'Try URL', 'Android App Verified', 'Play Store URL'];
    const rows = history.map(item => [
      `"${(item.date || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.short_verdict || '').replace(/"/g, '""')}"`,
      `"${(item.official_url || '').replace(/"/g, '""')}"`,
      `"${(item.use_url || '').replace(/"/g, '""')}"`,
      `"${Boolean(item.android_app_verified)}"`,
      `"${(item.android_play_url || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="daily_ai_discoveries.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// Supabase Integration Endpoint: /api/supabase/sync
app.post('/api/supabase/sync', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || req.body.supabaseUrl;
    const supabaseKey = process.env.SUPABASE_KEY || req.body.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({
        error: 'Supabase URL and Key are required. Provide them in the request body or set SUPABASE_URL and SUPABASE_KEY in environment variables.',
        instructions: 'Run schema.sql in your Supabase SQL editor to create the discoveries table.'
      });
    }

    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    const history = JSON.parse(raw);

    // Call Supabase REST API directly (PostgREST upsert)
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/discoveries?on_conflict=name`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(history.map(item => ({
        date: item.date || new Date().toISOString().split('T')[0],
        name: item.name,
        category: item.category,
        short_verdict: item.short_verdict || '',
        official_url: item.official_url || '',
        use_url: item.use_url || '',
        android_app_verified: Boolean(item.android_app_verified),
        android_play_url: item.android_play_url || '',
        synced_at: new Date().toISOString()
      })))
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Supabase returned ${response.status}: ${errText}` });
    }

    res.json({ success: true, message: `Successfully synced ${history.length} discovery records to Supabase!` });
  } catch (err) {
    res.status(500).json({ error: 'Supabase sync failed: ' + err.message });
  }
});

// API: Check duplicate
app.post('/api/research/check-duplicate', async (req, res) => {
  try {
    const { name, url } = req.body;
    const raw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
    const history = JSON.parse(raw);
    const normalizedName = (name || '').toLowerCase().trim();
    const existing = history.find(item => {
      const itemName = (item.name || '').toLowerCase().trim();
      const itemUrl = (item.official_url || '').toLowerCase().trim();
      return (normalizedName && itemName.includes(normalizedName)) || (url && itemUrl && itemUrl.includes((url || '').toLowerCase().trim()));
    });
    res.json({ isDuplicate: !!existing, match: existing || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check duplicates', details: err.message });
  }
});

// API: Publish / Update Daily Discovery
app.post('/api/research/publish', async (req, res) => {
  try {
    const discovery = req.body;
    if (!discovery || !discovery.name || !discovery.category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const todayDate = discovery.date || new Date().toISOString().split('T')[0];
    discovery.date = todayDate;
    discovery.date_checked = discovery.date_checked || todayDate;

    // 1. Update data/featured.json
    const featuredData = {
      updated_at: todayDate,
      latest: discovery
    };
    await fs.writeFile(
      path.join(__dirname, 'data/featured.json'),
      JSON.stringify(featuredData, null, 2),
      'utf8'
    );

    // 2. Update data/history.json
    let history = [];
    try {
      const historyRaw = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
      history = JSON.parse(historyRaw);
    } catch {
      history = [];
    }

    const historyItem = {
      date: todayDate,
      name: discovery.name,
      category: discovery.category,
      short_verdict: discovery.short_verdict || (discovery.what_it_does ? discovery.what_it_does.slice(0, 110) + '...' : ''),
      official_url: discovery.official_url || '',
      use_url: discovery.use_url || '',
      android_app_verified: Boolean(discovery.android_app_verified),
      android_play_url: discovery.android_play_url || '',
      signup_pakistan: discovery.signup_pakistan || ''
    };

    const updatedHistory = [historyItem, ...history.filter(h => h.name.toLowerCase() !== discovery.name.toLowerCase() && h.date !== todayDate)];
    await fs.writeFile(
      path.join(__dirname, 'data/history.json'),
      JSON.stringify(updatedHistory, null, 2),
      'utf8'
    );

    // 3. Write markdown report in /reports/YYYY-MM-DD.md
    const reportContent = `# Daily AI Discovery — ${todayDate}

## ${discovery.name}

**Developer:** ${discovery.developer || 'Independent'}  
**Category:** ${discovery.category}  
**Date checked:** ${todayDate}  
**Verdict:** ${discovery.short_verdict || 'A newly vetted discovery.'}

### What it does
${discovery.what_it_does || 'No summary provided.'}

### Why it is worth trying
${discovery.why_try_it || 'Streamlined workflow and accessible free tier.'}

### Free tier and limits
- ${discovery.free_tier || 'Free quota details documented.'}
- Limits: ${discovery.limits || 'Standard free tier limits apply.'}

### Signup and Pakistan availability
${discovery.signup_pakistan || 'Global signup supported.'}

### Quality evidence
${discovery.quality_evidence || 'Independent product testing completed.'}

### Links
- **Official website:** ${discovery.official_url || 'N/A'}
- **Try / create:** ${discovery.use_url || discovery.official_url || 'N/A'}
${discovery.android_play_url ? `- **Official Google Play app:** ${discovery.android_play_url}\n` : ''}
${discovery.pricing_url ? `- **Pricing details:** ${discovery.pricing_url}\n` : ''}

**Android availability:** ${discovery.android_status || (discovery.android_app_verified ? 'Official Android app verified.' : 'No official Android app verified.')}
`;
    try {
      await fs.writeFile(path.join(__dirname, `reports/${todayDate}.md`), reportContent, 'utf8');
    } catch (e) {
      console.warn('Could not write markdown report:', e.message);
    }

    res.json({ success: true, message: 'Discovery published successfully', data: featuredData });
  } catch (err) {
    console.error('Error publishing discovery:', err);
    res.status(500).json({ error: 'Failed to publish discovery', details: err.message });
  }
});

// API: Export published research to Google Sheets using Google Sheets API v4
app.post('/api/export-to-sheets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Missing authorized Google Workspace access token. Please sign in with Google.' });
    }

    const { spreadsheetId, sheetName, exportAll, discovery } = req.body;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID or URL is required.' });
    }

    let discoveries = [];
    if (exportAll) {
      const rawHistory = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
      discoveries = JSON.parse(rawHistory);
    } else if (discovery) {
      discoveries = [discovery];
    } else {
      const rawFeatured = await fs.readFile(path.join(__dirname, 'data/featured.json'), 'utf8');
      const featured = JSON.parse(rawFeatured);
      discoveries = [featured.latest || featured];
    }

    const result = await exportToGoogleSheets({
      spreadsheetId,
      accessToken: token,
      discoveries,
      sheetName
    });

    res.json(result);
  } catch (err) {
    console.error('Export to Google Sheets error:', err);
    res.status(500).json({ error: err.message || 'Failed to export data to Google Sheets.' });
  }
});

// Serve static files from workspace root
app.use(express.static(__dirname));

// Serve index.html for root and any non-file fallback routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
