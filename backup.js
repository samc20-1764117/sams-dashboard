#!/usr/bin/env node
// Sam's Dashboard — Auto Backup (runs via cron at 8am daily)
// Saves to backup_auto.json, overwrites each time.

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo';

const TABLES = [
  'tasks',
  'recurring_tasks',
  'shopping_list',
  'travel',
  'birthdays',
  'pup_skills',
  'time_blocks',
  'auto_timeblocks',
  'auto_timeblock_overrides'
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
