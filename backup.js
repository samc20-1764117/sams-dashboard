#!/usr/bin/env node
// Sam's Dashboard — Auto Backup (runs via cron at 8am daily)
// Saves to backup_auto.json, overwrites each time.

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';
// Load service role key from .env (bypasses RLS, never committed to git)
const envPath = path.join(__dirname, '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const envMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
const SUPABASE_KEY = envMatch ? envMatch[1].trim() : '';
if (!SUPABASE_KEY || SUPABASE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env first');
  process.exit(1);
}

const TABLES = [
  'tasks',
  'shopping_list',
  'travel',
  'birthdays',
  'pup_skills',
  'time_blocks',
  'auto_timeblocks',
  'auto_timeblock_overrides',
  'packing_templates',
  'packing_items',
  'ideas'
];

const MODE = process.argv[2] === 'manual' ? 'manual' : 'auto';
const OUT_FILE = path.join(__dirname, `backup_${MODE}.json`);

function fetchTable(table) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}?select=*`, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse ${table}: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const backup = {
    exported_at: new Date().toISOString(),
    mode: MODE,
    tables: {}
  };

  for (const table of TABLES) {
    try {
      backup.tables[table] = await fetchTable(table);
      console.log(`✓ ${table} (${backup.tables[table].length} rows)`);
    } catch (e) {
      console.error(`✗ ${table}: ${e.message}`);
      backup.tables[table] = null;
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(backup, null, 2));
  console.log(`\nSaved to ${OUT_FILE}`);
}

run().catch(e => { console.error(e); process.exit(1); });
