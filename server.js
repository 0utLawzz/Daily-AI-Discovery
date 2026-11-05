import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

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

    // Prepare history item
    const historyItem = {
      date: todayDate,
      name: discovery.name,
      category: discovery.category,
      short_verdict: discovery.short_verdict || (discovery.what_it_does ? discovery.what_it_does.slice(0, 110) + '...' : ''),
      official_url: discovery.official_url || '',
      use_url: discovery.use_url || '',
      android_app_verified: Boolean(discovery.android_app_verified),
      android_play_url: discovery.android_play_url || ''
    };

    // Filter out if existing entry with exact same name or date
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

// Serve static files from workspace root
app.use(express.static(__dirname));

// Serve index.html for root and any non-file fallback routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
