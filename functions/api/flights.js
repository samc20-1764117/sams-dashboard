// Flights importer: reads airline confirmation emails from ONE Gmail label ("Travel"), parses
// United + Southwest itineraries, and upserts today-forward legs into Supabase `flights` as
// review_state='pending'. Gmail is read-only and only touched on a button press / once-a-day
// auto check; a KV `fresh` marker + error `cooldown` (same pattern as yt.js) stop it looping.
const SB_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo'; // public anon key (same one shipped in core.js); the cron RPCs are guarded by a secret, not this key
const ORIGINS = ['https://sams-dashboard.pages.dev', 'https://dev.sams-dashboard.pages.dev'];
const REDIRECT = 'https://sams-dashboard.pages.dev/api/flights?mode=auth-callback';
const LABEL_MATCH = /travel/i;            // the "✈️ Travel" label
const FROM_Q = 'from:(united.com OR southwest.com OR ifly.southwest.com)';
const MAX_MSGS = 25;                      // CPU guard (Cloudflare free plan has a tight per-request cap)

const TZ = {};
[['America/Chicago', 'AUS DFW DAL IAH HOU SAT STL MSP ORD MDW MCI MSY BHM BNA OKC MEM MKE OMA'],
 ['America/Denver', 'DEN SLC ABQ ELP BOI'], ['America/Phoenix', 'PHX'],
 ['America/Los_Angeles', 'LAX SFO SEA SAN LAS PDX SJC OAK SMF SNA BUR'],
 ['America/New_York', 'JFK LGA EWR BOS DCA IAD BWI PHL ATL MCO MIA FLL TPA CLT DTW CLE PIT RDU CVG IND'],
 ['Pacific/Honolulu', 'HNL OGG']].forEach(([z, l]) => l.split(' ').forEach(a => TZ[a] = z));

const json = (o, h, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });

// ── text helpers ──
function b64(s) { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
function htmlToText(h) {
  return h.replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function bodyText(part) {
  let plain = '', html = '';
  (function walk(p) {
    if (p.mimeType === 'text/plain' && p.body && p.body.data) plain += b64(p.body.data) + ' ';
    else if (p.mimeType === 'text/html' && p.body && p.body.data) html += b64(p.body.data) + ' ';
    (p.parts || []).forEach(walk);
  })(part);
  return (html ? htmlToText(html) : plain).replace(/\s+/g, ' ').trim();
}
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const pad = n => String(n).padStart(2, '0');
function to24(t) { const m = t.match(/(\d{1,2}):(\d{2})\s?([AP])M/i); if (!m) return null; let h = +m[1] % 12; if (m[3].toUpperCase() === 'P') h += 12; return pad(h) + ':' + m[2]; }
const local = (ds, t) => ds + 'T' + to24(t) + ':00';
function bumpDay(ds) { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

// ── parsers (text is whitespace-collapsed) → array of legs ──
function parseUnited(t, subject) {
  const code = (t.match(/confirmation number\s*:?\s*([A-Z0-9]{6})/i) || subject.match(/\b([A-Z0-9]{6})\s*$/) || [])[1];
  if (!code) return [];
  const pax = (t.match(/Travelers\s+(.+?)\s+Frequent flyer/i) || [])[1] || null;
  const seats = {}; for (const m of t.matchAll(/\b([A-Z]{3}) to ([A-Z]{3}):\s*(\d{1,2}[A-Z])\b/g)) seats[m[1] + m[2]] = m[3];
  const legs = [];
  // Walk "Mon DD, YYYY" headers; each following time/airport/UA block belongs to that date.
  const re = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})|(\d{1,2}:\d{2} [AP]M) (\d{1,2}:\d{2} [AP]M) ([A-Z]{3}) (?:\d+h )?(?:\d+m )?([A-Z]{3})[\s\S]*?\bUA (\d{1,4})\b/g;
  let ds = null, m;
  while ((m = re.exec(t))) {
    if (m[1]) { if (MON[m[1]]) ds = `${m[3]}-${pad(MON[m[1]])}-${pad(+m[2])}`; continue; }
    if (!ds) continue;
    const arrDs = to24(m[5]) < to24(m[4]) ? bumpDay(ds) : ds;
    legs.push({ confirmation_code: code, airline: 'United', flight_number: 'UA ' + m[8], origin: m[6], destination: m[7],
      depart_local: local(ds, m[4]), arrive_local: local(arrDs, m[5]), passenger: pax, seat: seats[m[6] + m[7]] || null });
  }
  return legs;
}
function parseSouthwest(t, subject) {
  const code = (t.match(/Confirmation\s*#\s*([A-Z0-9]{6})/i) || subject.match(/\(([A-Z0-9]{6})\)/) || [])[1];
  if (!code) return [];
  const pax = (t.match(/PASSENGER\s+(.+?)\s+RAPID REWARDS/i) || [])[1] || null;
  const seats = {}; for (const m of t.matchAll(/\b([A-Z]{3}) - ([A-Z]{3}) (\d{1,2}[A-Z])\b/g)) seats[m[1] + m[2]] = m[3];
  const legs = [];
  const re = /Flight \d+: \w+, (\d{2})\/(\d{2})\/(\d{4})[\s\S]*?WN #\s*(\d+)[\s\S]*?DEPARTS ([A-Z]{3}) (\d{1,2}:\d{2}\s?[AP]M)[\s\S]*?ARRIVES ([A-Z]{3}) (\d{1,2}:\d{2}\s?[AP]M)/g;
  for (const m of t.matchAll(re)) {
    const ds = `${m[3]}-${m[1]}-${m[2]}`;
    const arrDs = to24(m[8]) < to24(m[6]) ? bumpDay(ds) : ds;
    legs.push({ confirmation_code: code, airline: 'Southwest', flight_number: 'WN ' + (+m[4]), origin: m[5], destination: m[7],
      depart_local: local(ds, m[6]), arrive_local: local(arrDs, m[8]), passenger: pax, seat: seats[m[5] + m[7]] || null });
  }
  return legs;
}

// Reads new mail from the Travel label and returns today-forward legs (shared by the manual
// button and the 6am cron). Throws on any Gmail/token error; callers set their own cooldown.
async function scanGmail(KV, cid, csec, refresh, today) {
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: cid, client_secret: csec, refresh_token: refresh, grant_type: 'refresh_token' }),
    });
    const tk = await tr.json();
    if (!tk.access_token) throw new Error('token: ' + (tk.error || 'unknown'));
    const G = p => fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + tk.access_token } }).then(r => { if (!r.ok) throw new Error('gmail ' + r.status); return r.json(); });

    // Resolve + cache the label id (one labels.list call ever, not per sync)
    let labelId = await KV.get('fl-label');
    if (!labelId) {
      const ls = (await G('labels')).labels || [];
      const l = ls.find(x => LABEL_MATCH.test(x.name));
      if (!l) throw new Error('Travel label not found');
      labelId = l.id; await KV.put('fl-label', labelId);
    }
    // Only mail newer than the last check (first run: a year back — flights are booked ahead)
    const last = await KV.get('fl-last');
    const since = last ? new Date(new Date(last).getTime() - 2 * 86400000) : new Date(Date.now() - 365 * 86400000);
    const q = `${FROM_Q} after:${since.getUTCFullYear()}/${pad(since.getUTCMonth() + 1)}/${pad(since.getUTCDate())}`;
    const list = await G(`messages?labelIds=${encodeURIComponent(labelId)}&q=${encodeURIComponent(q)}&maxResults=${MAX_MSGS}`);

    const legs = []; let unreadable = 0;
    for (const { id } of (list.messages || [])) {
      const m = await G(`messages/${id}?format=full`);
      const hdr = n => ((m.payload.headers || []).find(h => h.name.toLowerCase() === n) || {}).value || '';
      const subject = hdr('subject'), from = hdr('from').toLowerCase();
      const text = bodyText(m.payload);
      const got = from.includes('united.com') ? parseUnited(text, subject) : from.includes('southwest.com') ? parseSouthwest(text, subject) : [];
      if (!got.length) { if (/confirmation|itinerary|booking|going to/i.test(subject) && !/seat|credit|check.?in/i.test(subject)) unreadable++; continue; }
      got.forEach(l => legs.push({ ...l, _msg: id }));
    }

    // Today-forward by FLIGHT date (not email date)
    const fresh = legs.filter(l => l.depart_local.slice(0, 10) >= today);
    for (const l of fresh) { l.depart_tz = TZ[l.origin] || null; l.arrive_tz = TZ[l.destination] || null; }

  return { fresh, scanned: (list.messages || []).length, unreadable };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const KV = env.YT_CACHE;
  const creds = async () => ({
    cid: env.GCP_CLIENT_ID || (KV && await KV.get('oauth-client-id')),
    csec: env.GCP_CLIENT_SECRET || (KV && await KV.get('oauth-client-secret')),
  });

  // ── OAuth start/callback (always via production, like yt.js) ──
  if (mode === 'auth-start') {
    const { cid } = await creds();
    if (!cid) return Response.redirect('https://sams-dashboard.pages.dev/api/flights?mode=auth-start', 302);
    return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: cid, redirect_uri: REDIRECT, response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly', access_type: 'offline', prompt: 'consent',
    }), 302);
  }
  if (mode === 'auth-callback') {
    const code = url.searchParams.get('code');
    if (url.searchParams.get('error') || !code || !KV) return new Response('<h2>Gmail connection was not completed</h2>', { headers: { 'Content-Type': 'text/html' } });
    const { cid, csec } = await creds();
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: cid, client_secret: csec, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    });
    const td = await tr.json();
    if (!td.refresh_token) return new Response('<h2>No refresh token returned</h2><p>Try again from the dashboard.</p>', { headers: { 'Content-Type': 'text/html' } });
    await KV.put('gmail-oauth-refresh', td.refresh_token);
    return new Response('<h2>Gmail connected</h2><p>Taking you back to the dashboard…</p><script>setTimeout(()=>{location.href="/"},1200)</script>', { headers: { 'Content-Type': 'text/html' } });
  }

  // ── Daily cron (GitHub Actions, 6am Central) ── no user session, so it is guarded by a shared
  // secret checked INSIDE Supabase (flights_cron_ok); rows are written via the SECURITY DEFINER
  // RPC flights_cron_apply. Same Gmail scope/label/sender limits as the manual path.
  if (mode === 'cron') {
    const secret = request.headers.get('X-Cron-Secret') || '';
    const rpc = (fn, args) => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(args) }).then(r => r.json());
    if (!secret || (await rpc('flights_cron_ok', { p_secret: secret })) !== true) return json({ error: 'unauthorized' }, cors, 401);
    if (!KV) return json({ error: 'KV not bound' }, cors, 500);
    if (await KV.get('fl-cron-cool')) return json({ skipped: 'cooldown' }, cors);
    const refresh = await KV.get('gmail-oauth-refresh');
    if (!refresh) { await KV.put('fl-err', 'not_connected'); return json({ error: 'not_connected' }, cors, 409); }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    try {
      const { cid, csec } = await creds();
      const r = await scanGmail(KV, cid, csec, refresh, today);
      const res = await rpc('flights_cron_apply', { p_secret: secret, p_legs: r.fresh });
      if (res && res.message) throw new Error('apply: ' + res.message);
      await KV.put('fl-last', new Date().toISOString());
      await KV.delete('fl-err');
      await KV.put('fl-cron-cool', '1', { expirationTtl: 3600 }); // never twice within an hour
      return json({ ...res, scanned: r.scanned, unreadable: r.unreadable }, cors);
    } catch (e) {
      await KV.put('fl-err', String(e.message || e).slice(0, 120));
      await KV.put('fl-cron-cool', '1', { expirationTtl: 600 });
      return json({ error: String(e.message || e) }, cors, 500);
    }
  }

  // Everything below requires a signed-in dashboard user (Supabase JWT) — this endpoint can read
  // the inbox, so it must never be callable anonymously.
  const auth = request.headers.get('Authorization') || '';
  const apikey = request.headers.get('apikey') || '';
  const who = auth && apikey ? await fetch(SB_URL + '/auth/v1/user', { headers: { Authorization: auth, apikey } }) : null;
  if (!who || !who.ok) return json({ error: 'unauthorized' }, cors, 401);

  if (mode === 'status') {
    return json({ connected: !!(KV && await KV.get('gmail-oauth-refresh')), lastSync: KV ? await KV.get('fl-last') : null, lastError: KV ? await KV.get('fl-err') : null }, cors);
  }
  if (mode !== 'sync' || request.method !== 'POST') return json({ error: 'bad request' }, cors, 400);
  if (!KV) return json({ error: 'KV not bound' }, cors, 500);

  const force = url.searchParams.get('force') === '1';
  const today = url.searchParams.get('today') || new Date().toISOString().slice(0, 10);
  if (await KV.get('fl-cool')) return json({ skipped: 'cooldown' }, cors);
  if (!force && await KV.get('fl-fresh')) return json({ skipped: 'fresh' }, cors);
  const refresh = await KV.get('gmail-oauth-refresh');
  if (!refresh) return json({ error: 'not_connected' }, cors, 409);

  try {
    const { cid, csec } = await creds();
    const { fresh, scanned, unreadable } = await scanGmail(KV, cid, csec, refresh, today);

    // Upsert by (code, flight, depart date, passenger) — repeat emails update, never duplicate
    const H = { Authorization: auth, apikey, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    const codes = [...new Set(fresh.map(l => l.confirmation_code))];
    const existing = codes.length ? await fetch(`${SB_URL}/rest/v1/flights?confirmation_code=in.(${codes.join(',')})&select=*`, { headers: H }).then(r => r.json()) : [];
    let added = 0, updated = 0;
    const seen = new Set();
    for (const l of fresh) {
      const key = [l.confirmation_code, l.flight_number, l.depart_local.slice(0, 10), l.passenger || ''].join('|');
      if (seen.has(key)) continue; seen.add(key);
      const ex = existing.find(e => e.confirmation_code === l.confirmation_code && e.flight_number === l.flight_number && String(e.depart_local).slice(0, 10) === l.depart_local.slice(0, 10) && (e.passenger || '') === (l.passenger || ''));
      const { _msg, ...row } = l;
      if (ex) {
        const ids = [...new Set([...(ex.gmail_msg_ids || []), _msg])];
        const patch = ex.user_edited ? { gmail_msg_ids: ids } : { ...row, gmail_msg_ids: ids, status: ex.status === 'cancelled' ? 'cancelled' : 'confirmed', updated_at: new Date().toISOString() };
        await fetch(`${SB_URL}/rest/v1/flights?id=eq.${ex.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
        updated++;
      } else {
        await fetch(`${SB_URL}/rest/v1/flights`, { method: 'POST', headers: H, body: JSON.stringify({ ...row, source: 'gmail', review_state: 'pending', gmail_msg_ids: [_msg] }) });
        added++;
      }
    }
    await KV.put('fl-last', new Date().toISOString());
    await KV.delete('fl-err');
    await KV.put('fl-fresh', '1', { expirationTtl: 20 * 3600 });
    await KV.put('fl-cool', '1', { expirationTtl: 120 }); // min 2 min between manual presses
    return json({ added, updated, unreadable, scanned }, cors);
  } catch (e) {
    await KV.put('fl-cool', '1', { expirationTtl: 600 }); // error cooldown — never retry in a loop
    return json({ error: String(e.message || e) }, cors, 500);
  }
}
