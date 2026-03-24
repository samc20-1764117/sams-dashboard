#!/usr/bin/env node
// Sam's Dashboard — Restore from backup
// Usage: node restore.js backup_auto.json
//        node restore.js backup_manual.json
//
// WARNING: This DELETES all existing rows then re-inserts from the backup file.
// Only run this if you need to restore to a new Supabase database.
// Update SUPABASE_URL and SUPABASE_KEY below if restoring to a new project.

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo';

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node restore.js <backup_file.json>');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(path.resolve(backupFile), 'utf8'));
console.log(`Restoring backup from: ${backup.exported_at}`);

function request(method, table, body, query = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}${query}`, SUPABASE_URL);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function restoreTable(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ${table}: skipped (no data)`);
    return;
  }

  // Delete all existing rows
  const del = await request('DELETE', table, null, '?id=neq.00000000-0000-0000-0000-000000000000');
  if (del.status >= 400) {
    console.error(`  ✗ ${table} delete failed (${del.status}): ${del.body}`);
    return;
  }

  // Insert in chunks of 100
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ins = await request('POST', table, chunk);
    if (ins.status >= 400) {
      console.error(`  ✗ ${table} insert failed (${ins.status}): ${ins.body}`);
      return;
    }
  }
  console.log(`  ✓ ${table} restored (${rows.length} rows)`);
}

async function run() {
  for (const [table, rows] of Object.entries(backup.tables)) {
    await restoreTable(table, rows);
  }
  console.log('\nRestore complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
