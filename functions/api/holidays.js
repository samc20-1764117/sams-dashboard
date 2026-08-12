// US holidays: federal (Nager.Date) + cultural (computed) — cached in YT_CACHE KV, holiday-* keys.
// Nager.Date: free, no key, no rate limit. Cultural dates are pure rule-based math (never need updates).

const CATALOG = {
  new_years: "New Year's Day",
  mlk: 'Martin Luther King, Jr. Day',
  presidents: 'Presidents Day',
  memorial: 'Memorial Day',
  juneteenth: 'Juneteenth',
  independence: 'Independence Day',
  labor: 'Labor Day',
  columbus: 'Columbus Day',
  veterans: 'Veterans Day',
  thanksgiving: 'Thanksgiving Day',
  christmas: 'Christmas Day',
  valentines: "Valentine's Day",
  st_patricks: "St. Patrick's Day",
  easter: 'Easter',
  cinco_de_mayo: 'Cinco de Mayo',
  mothers_day: "Mother's Day",
  fathers_day: "Father's Day",
  halloween: 'Halloween',
  nye: "New Year's Eve",
};

// Nager's `.name` (not `.localName`) → our key. Nager spells Labor Day "Labour Day".
const FEDERAL_MAP = {
  "New Year's Day": 'new_years',
  'Martin Luther King, Jr. Day': 'mlk',
  'Presidents Day': 'presidents',
  'Memorial Day': 'memorial',
  'Juneteenth National Independence Day': 'juneteenth',
  'Independence Day': 'independence',
  'Labour Day': 'labor',
  'Columbus Day': 'columbus',
  'Veterans Day': 'veterans',
  'Thanksgiving Day': 'thanksgiving',
  'Christmas Day': 'christmas',
};

const pad = n => String(n).padStart(2, '0');
const ds = (year, month1, day) => `${year}-${pad(month1)}-${pad(day)}`;

// nth weekday of a month (month0 = 0-indexed, weekday = 0-indexed Sun-Sat)
function nthWeekday(year, month0, weekday, n) {
  const first = new Date(Date.UTC(year, month0, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}
function lastWeekday(year, month0, weekday) {
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return last.getUTCDate() - offset;
}
// Meeus/Jones/Butcher Gregorian algorithm — deterministic, never changes
function computeEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function computeCultural(year) {
  const easter = computeEaster(year);
  return [
    { key: 'valentines', name: CATALOG.valentines, date: ds(year, 2, 14), source: 'cultural' },
    { key: 'st_patricks', name: CATALOG.st_patricks, date: ds(year, 3, 17), source: 'cultural' },
    { key: 'easter', name: CATALOG.easter, date: ds(year, easter.month, easter.day), source: 'cultural' },
    { key: 'cinco_de_mayo', name: CATALOG.cinco_de_mayo, date: ds(year, 5, 5), source: 'cultural' },
    { key: 'mothers_day', name: CATALOG.mothers_day, date: ds(year, 5, nthWeekday(year, 4, 0, 2)), source: 'cultural' },
    { key: 'fathers_day', name: CATALOG.fathers_day, date: ds(year, 6, nthWeekday(year, 5, 0, 3)), source: 'cultural' },
    { key: 'halloween', name: CATALOG.halloween, date: ds(year, 10, 31), source: 'cultural' },
    { key: 'nye', name: CATALOG.nye, date: ds(year, 12, 31), source: 'cultural' },
  ];
}

// Last-resort local computation — no weekend-observed shifting, only used if
// both the live Nager fetch AND the KV "good" cache are unavailable.
function computeFederalFallback(year) {
  return [
    { key: 'new_years', name: CATALOG.new_years, date: ds(year, 1, 1), source: 'federal' },
    { key: 'mlk', name: CATALOG.mlk, date: ds(year, 1, nthWeekday(year, 0, 1, 3)), source: 'federal' },
    { key: 'presidents', name: CATALOG.presidents, date: ds(year, 2, nthWeekday(year, 1, 1, 3)), source: 'federal' },
    { key: 'memorial', name: CATALOG.memorial, date: ds(year, 5, lastWeekday(year, 4, 1)), source: 'federal' },
    { key: 'juneteenth', name: CATALOG.juneteenth, date: ds(year, 6, 19), source: 'federal' },
    { key: 'independence', name: CATALOG.independence, date: ds(year, 7, 4), source: 'federal' },
    { key: 'labor', name: CATALOG.labor, date: ds(year, 9, nthWeekday(year, 8, 1, 1)), source: 'federal' },
    { key: 'columbus', name: CATALOG.columbus, date: ds(year, 10, nthWeekday(year, 9, 1, 2)), source: 'federal' },
    { key: 'veterans', name: CATALOG.veterans, date: ds(year, 11, 11), source: 'federal' },
    { key: 'thanksgiving', name: CATALOG.thanksgiving, date: ds(year, 11, nthWeekday(year, 10, 4, 4)), source: 'federal' },
    { key: 'christmas', name: CATALOG.christmas, date: ds(year, 12, 25), source: 'federal' },
  ];
}

async function fetchFederal(year) {
  const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/US`);
  if (!res.ok) throw new Error('nager fetch failed: ' + res.status);
  const data = await res.json();
  const seen = new Set(), out = [];
  for (const h of data) {
    const key = FEDERAL_MAP[h.name];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, name: CATALOG[key], date: h.date, source: 'federal' });
  }
  return out;
}

export async function onRequest(context) {
  const _allowedOrigins = ['https://sams-dashboard.pages.dev', 'https://dev.sams-dashboard.pages.dev'];
  const _origin = context.request.headers.get('Origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': _allowedOrigins.includes(_origin) ? _origin : 'https://sams-dashboard.pages.dev',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (context.request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (context.request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const KV = context.env.YT_CACHE;
  const url = new URL(context.request.url);
  const year = parseInt(url.searchParams.get('year'), 10) || new Date().getUTCFullYear();
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  const freshKey = `holiday-${year}-fresh`;
  const goodKey = `holiday-${year}-good`;
  const cooldownKey = `holiday-${year}-cooldown`;

  if (KV && !forceRefresh) {
    const fresh = await KV.get(freshKey, 'json');
    if (fresh) return new Response(JSON.stringify(fresh), { headers: jsonHeaders });
  }

  const cultural = computeCultural(year);

  if (KV && !forceRefresh) {
    const cooldown = await KV.get(cooldownKey);
    if (cooldown) {
      const good = await KV.get(goodKey, 'json');
      if (good) return new Response(JSON.stringify(good), { headers: jsonHeaders });
    }
  }

  try {
    const federal = await fetchFederal(year);
    const result = { year, holidays: [...federal, ...cultural].sort((a, b) => a.date.localeCompare(b.date)), fetchedAt: new Date().toISOString() };
    if (KV) {
      await KV.put(freshKey, JSON.stringify(result), { expirationTtl: 2592000 });
      await KV.put(goodKey, JSON.stringify(result));
    }
    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (e) {
    if (KV) await KV.put(cooldownKey, '1', { expirationTtl: 3600 });
    const good = KV ? await KV.get(goodKey, 'json') : null;
    if (good) return new Response(JSON.stringify(good), { headers: jsonHeaders });
    const fallback = { year, holidays: [...computeFederalFallback(year), ...cultural].sort((a, b) => a.date.localeCompare(b.date)), fetchedAt: new Date().toISOString(), fallback: true };
    return new Response(JSON.stringify(fallback), { headers: jsonHeaders });
  }
}
