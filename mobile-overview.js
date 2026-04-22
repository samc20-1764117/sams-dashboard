// mobile-overview.js
window._mobileMode = true;

// ── Login overlay ─────────────────────────────────────────────────────────────
function showLoginOverlay() {
  document.getElementById('mLogin').style.display = 'flex';
  document.getElementById('mApp').classList.remove('ready');
  setTimeout(() => document.getElementById('mEmail') && document.getElementById('mEmail').focus(), 100);
}
function hideLoginOverlay() {
  document.getElementById('mLogin').style.display = 'none';
  document.getElementById('mApp').classList.add('ready');
}

// ── Desktop render stubs ──────────────────────────────────────────────────────
function renderAll() { mRenderToday(); }
function renderToday() { mRenderToday(); }
function renderWkCal() {}
function renderWkSummary() {}
function renderRecOv() {}
function renderUnassigned() {}
function renderShopOv() {}
function renderKanban() {}
function renderSummaryMetrics() {}
function renderWeeklyPage() {}
function renderBdayPage() {}
function renderShopFull() {}
function renderDayTB() {}
function setBadge() {}
function renderPupSkillsHighlight() {}
function renderDailyHabits() {}
function updateOvBanner() {}
function _showUndoToast() {}
function _showRedoToast() {}
function selTask() {}
function showCtx() {}
function showWrRuleCtx() {}
function showCtxShop() {}
function showWrScopePicker() {}
function openWrEditModal() {}
function tiDblRec() {}
function tiDblShop() {}
function openWOModal() {}
function dStart() {}
function dEnd() {}

// ── Mobile-only helpers ───────────────────────────────────────────────────────
function isDoneWRRule(ruleId, wkKey) {
  return !!(st.wrOverrides || []).some(o =>
    String(o.rule_id) === String(ruleId) && o.wk_key === wkKey && o.override_type === 'complete' && o.done
  );
}

function togWrRule(ruleId, isDone, wkKey) {
  if (isDone) {
    const ov = {rule_id: String(ruleId), wk_key: wkKey, override_type: 'complete', done: true};
    st.wrOverrides.push(ov);
    if (st.blocks) st.blocks.filter(b => typeof dsToWkKey === 'function' && dsToWkKey(b.ds) === wkKey && (String(b.ruleId) === String(ruleId) || String(b.recId) === String(ruleId))).forEach(b => { b._done = true; });
    save(); mRenderToday();
    sbReqSilent('POST', 'wr_recurring_overrides', ov, '').then(sv => {
      if (sv && sv[0]) { const i = st.wrOverrides.indexOf(ov); if (i > -1) st.wrOverrides[i] = sv[0]; save(); }
    });
  } else {
    const existing = st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === wkKey && o.override_type === 'complete');
    if (!existing) return;
    st.wrOverrides = st.wrOverrides.filter(o => o !== existing);
    if (st.blocks) st.blocks.filter(b => typeof dsToWkKey === 'function' && dsToWkKey(b.ds) === wkKey && (String(b.ruleId) === String(ruleId) || String(b.recId) === String(ruleId))).forEach(b => { b._done = false; });
    save(); mRenderToday();
    if (existing.id) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${existing.id}`);
  }
}

function togRecVirt(recId, done, wkKey) {
  const r = st.recurring.find(x => String(x.id) === String(recId));
  if (!r) return;
  if (!r._doneByWk) r._doneByWk = {};
  if (done) r._doneByWk[wkKey] = true;
  else delete r._doneByWk[wkKey];
  r._done = false;
  if (st.blocks) st.blocks.filter(b => String(b.recId) === String(recId)).forEach(b => b._done = done);
  save(); mRenderToday();
  sbReq('PATCH', 'wr_recurring_rules', {done_by_week: r._doneByWk}, `?id=eq.${recId}`);
}

async function togPupSessionDone(sessId, done) {
  const sess = (st.pupSessions || []).find(s => String(s.id) === String(sessId));
  if (!sess) return;
  const prev = sess.done;
  sess.done = done;
  save(); mRenderToday();
  const ok = await sbReqSilent('PATCH', 'pup_skill_sessions', {done}, `?id=eq.${sessId}`);
  if (!ok) { sess.done = prev; save(); mRenderToday(); }
}

// ── Category picker ───────────────────────────────────────────────────────────
const M_CATS = ['Home', 'My work', 'Work', 'Social', 'Long term'];
let _mAddCat = 'Home';
let _mEditCat = 'Home';

const _EDIT_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 2 2L10 15l-3 1 1-3z"/></svg>`;

function _mDotStyle(cat) {
  const s = gc(cat);
  return `background:${s.bg};border:1.5px solid ${s.d}`;
}

function _mBuildOpts(elId, which) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = M_CATS.map(cat => {
    const s = gc(cat);
    return `<div class="m-cpick-opt" onclick="mSelectCat('${which}','${escHtml(cat)}')">
      <span class="m-cpick-dot" style="background:${s.bg};border:1.5px solid ${s.d}"></span>
      <span>${escHtml(cat)}</span>
    </div>`;
  }).join('');
}

function mTogglePick(which) {
  const myId = which === 'add' ? 'mAddPickOpts' : 'mEditPickOpts';
  const otherId = which === 'add' ? 'mEditPickOpts' : 'mAddPickOpts';
  document.getElementById(otherId)?.classList.remove('open');
  document.getElementById(myId)?.classList.toggle('open');
}

function mSelectCat(which, cat) {
  const dotId = which === 'add' ? 'mAddPickDot' : 'mEditPickDot';
  const lblId = which === 'add' ? 'mAddPickLbl' : 'mEditPickLbl';
  const optId = which === 'add' ? 'mAddPickOpts' : 'mEditPickOpts';
  if (which === 'add') _mAddCat = cat;
  else _mEditCat = cat;
  const dotEl = document.getElementById(dotId);
  const lblEl = document.getElementById(lblId);
  if (dotEl) dotEl.style.cssText = _mDotStyle(cat);
  if (lblEl) lblEl.textContent = cat;
  document.getElementById(optId)?.classList.remove('open');
}

function mInitPickers() {
  _mBuildOpts('mAddPickOpts', 'add');
  _mBuildOpts('mEditPickOpts', 'edit');
  mSelectCat('add', 'Home');
  // Close pickers on outside tap
  document.addEventListener('click', e => {
    if (!e.target.closest('.m-cpick')) {
      document.getElementById('mAddPickOpts')?.classList.remove('open');
      document.getElementById('mEditPickOpts')?.classList.remove('open');
    }
  }, true);
}

// ── Sort today ────────────────────────────────────────────────────────────────
function mSortToday(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    const aOv = isOv(a.due_date) && !a.done, bOv = isOv(b.due_date) && !b.done;
    if (aOv && !bOv) return -1;
    if (!aOv && bOv) return 1;
    const typeOrd = t => t._type === 'travel' ? 0 : t._type === 'birthday' ? 1 : t._isWrRule || t._isWrec || (t._virtual && t._recId) ? 3 : t._type === 'shop' ? 4 : 2;
    const diff = typeOrd(a) - typeOrd(b);
    if (diff !== 0) return diff;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// ── Gather today's tasks ──────────────────────────────────────────────────────
function mGetTodayTasks() {
  const ds = d2s(getDayDate(0));

  const ts = st.tasks.filter(t => {
    if (!t.due_date || t.category === 'Weekly Goals') return false;
    const tds = t.due_date.split('T')[0];
    if (tds === ds) return true;
    if (isOv(t.due_date) && !t.done) return true;
    return false;
  });

  const allRecVirt = [];
  for (let w = 0; w >= -4; w--) {
    getRecurringWeekTasks(w).forEach(v => {
      const _rec = st.recurring.find(x => String(x.id) === String(v._recId));
      if (_rec && _rec._dateOverrides) {
        for (let sw = w; sw <= 0; sw++) {
          if (_rec._dateOverrides[getWkKey(sw)] === '__skip__') return;
        }
      }
      if (!allRecVirt.find(x => x._recId === v._recId)) allRecVirt.push(v);
    });
  }

  const _wrecSeen = new Set();
  const wrecToday = [];
  for (let _w = 0; _w >= -4; _w--) {
    const _wkKey = getWkKey(_w);
    st.recurring
      .filter(r =>
        (r.is_weekly_reset === true || r.is_weekly_reset === 'true') &&
        r._dateOverrides && r._dateOverrides[_wkKey] &&
        r._dateOverrides[_wkKey] !== '__skip__' &&
        (r._dateOverrides[_wkKey] === ds || r._dateOverrides[_wkKey] < ds) &&
        !_wrecSeen.has(String(r.id))
      )
      .forEach(r => {
        _wrecSeen.add(String(r.id));
        const _isDone = !!(r._doneByWk && r._doneByWk[_wkKey]);
        wrecToday.push({id: 'rec-virt-' + r.id, name: r.name, category: 'Recurring', due_date: r._dateOverrides[_wkKey], done: _isDone, _recId: r.id, _virtual: true, _wkKey: _wkKey, _isWrec: true});
      });
  }

  const _wrRulesSeen = new Set();
  const wrRulesToday = [];
  for (let _w = 0; _w >= -4; _w--) {
    const _wkKey = getWkKey(_w);
    st.wrRules
      .filter(r =>
        r._dateOverrides && r._dateOverrides[_wkKey] &&
        r._dateOverrides[_wkKey] !== '__skip__' &&
        !(st.wrOverrides || []).some(o => String(o.rule_id) === String(r.id) && o.wk_key === _wkKey && o.override_type === 'skip') &&
        (r._dateOverrides[_wkKey] === ds || (r._dateOverrides[_wkKey] < ds && !isDoneWRRule(r.id, _wkKey))) &&
        !_wrRulesSeen.has(String(r.id))
      )
      .forEach(r => {
        _wrRulesSeen.add(String(r.id));
        const _isDone = isDoneWRRule(r.id, _wkKey);
        wrRulesToday.push({id: 'wrrule-virt-' + r.id, name: r.name, category: 'Recurring', due_date: r._dateOverrides[_wkKey], done: _isDone, _ruleId: r.id, _virtual: true, _wkKey: _wkKey, _isWrRule: true});
      });
  }

  const shopToday = st.shopping
    .filter(s => !s.done && s.due_date && (s.due_date === ds || isOv(s.due_date)))
    .map(s => ({id: 'shop-cal-' + s.id, name: s.name, category: 'Shopping', due_date: s.due_date, done: false, _shopId: s.id, _virtual: true, _type: 'shop'}));

  const pupSessToday = (st.pupSessions || [])
    .filter(s => s.day_date === ds || (isOv(s.day_date) && !s.done))
    .map(s => {
      const skill = (st.pup_skills || []).find(x => String(x.id) === String(s.skill_id));
      if (!skill) return null;
      return {id: 'pup-sess-' + s.id, name: (skill.pup ? skill.pup + ': ' : '') + skill.skill, category: 'Recurring', due_date: s.day_date, done: s.done, _pupSessId: s.id, _skillId: s.skill_id, _virtual: true, _type: 'pup'};
    }).filter(Boolean);

  return mSortToday([
    ...ts,
    ...allRecVirt.filter(v => v.due_date === ds || (isOv(v.due_date) && !v.done)),
    ...wrecToday,
    ...wrRulesToday,
    ...shopToday,
    ...pupSessToday,
    ...getExtrasForDate(ds)
  ]);
}

// ── Task row ──────────────────────────────────────────────────────────────────
function mTaskRow(t) {
  const ov = isOv(t.due_date) && !t.done;
  const catKey = t._isWrRule || t._isWrec ? 'weekly_reset' : t._type === 'shop' ? 'shopping' : t._type === 'travel' ? 'travel' : t._type === 'birthday' ? 'birthday' : (t.category || '');
  const s = ov ? OV : gc(catKey);
  const noCheck = t._type === 'travel' || t._type === 'birthday';
  const canEdit = !t._virtual && !t._type;

  let onchange = '';
  if (t._isWrRule) onchange = `togWrRule('${t._ruleId}',this.checked,'${t._wkKey}')`;
  else if (t._isWrec) onchange = `togRec('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._virtual && t._recId) onchange = `togRecVirt('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._type === 'shop') onchange = `togShop('${t._shopId}',this.checked)`;
  else if (t._type === 'pup') onchange = `togPupSessionDone('${t._pupSessId}',this.checked)`;
  else if (!t._virtual) onchange = `toggleTask('${t.id}',this.checked)`;

  const safeName = escHtml(t.name || '');
  const dot = `<span class="m-cat-dot" style="background:${s.bg};border:1.5px solid ${s.d};flex-shrink:0;width:10px;height:10px;border-radius:50%;display:inline-block"></span>`;
  const editBtn = canEdit ? `<button class="m-edit-btn" onclick="event.stopPropagation();mOpenEdit('${t.id}')" aria-label="Edit">${_EDIT_SVG}</button>` : '';

  const inner = `<div class="m-row${t.done ? ' m-done' : ''}${ov ? ' m-ov' : ''}">
    ${noCheck
      ? `<span class="m-row-icon">📅</span>`
      : `<label class="m-chk-wrap"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="${onchange}"></label>`
    }
    <span class="m-row-name${t.done ? ' done' : ''}">${safeName}</span>
    ${dot}
    ${editBtn}
  </div>`;

  return `<div class="m-row-outer"${canEdit ? ` data-tid="${t.id}"` : ''}>
    ${canEdit ? '<div class="m-del-hint">✕</div>' : ''}
    ${inner}
  </div>`;
}

// ── Render today ──────────────────────────────────────────────────────────────
function mRenderToday() {
  const sorted = mGetTodayTasks();
  const doneCount = sorted.filter(t => t.done).length;
  const progEl = document.getElementById('mProgress');
  if (progEl) progEl.textContent = doneCount + '/' + sorted.length;
  const el = document.getElementById('mTodayList');
  if (!el) return;
  el.innerHTML = sorted.length ? sorted.map(mTaskRow).join('') : '<div class="m-empty">All done ✓</div>';
}

// ── Add task ──────────────────────────────────────────────────────────────────
async function mAddTask() {
  const inp = document.getElementById('mNewTask');
  const n = inp.value.trim();
  if (!n) return;
  const cat = _mAddCat;
  const ds = d2s(getDayDate(0));
  const t = {id: 'l-' + Date.now(), name: n, category: cat, due_date: ds, done: false, important: false};
  st.tasks.push(t);
  save();
  inp.value = '';
  mRenderToday();
  const sv = await sbReq('POST', 'tasks', {name: n, category: cat, due_date: ds, done: false});
  if (sv && sv[0]) {
    const i = st.tasks.findIndex(x => x.id === t.id);
    if (i > -1) st.tasks[i] = sv[0];
    save();
  }
}

// ── Edit task sheet ───────────────────────────────────────────────────────────
let _mEditId = null;

function mOpenEdit(id) {
  const t = st.tasks.find(x => String(x.id) === String(id));
  if (!t) return;
  _mEditId = String(id);
  document.getElementById('mEditName').value = t.name || '';
  mSelectCat('edit', t.category || 'Home');
  document.getElementById('mEditBackdrop').classList.add('open');
  document.getElementById('mEditSheet').classList.add('open');
  setTimeout(() => document.getElementById('mEditName').focus(), 300);
}

function mCloseEdit() {
  _mEditId = null;
  document.getElementById('mEditBackdrop').classList.remove('open');
  document.getElementById('mEditSheet').classList.remove('open');
  document.getElementById('mEditPickOpts')?.classList.remove('open');
}

async function mSaveEditTask() {
  if (!_mEditId) return;
  const t = st.tasks.find(x => String(x.id) === String(_mEditId));
  if (!t) return;
  const name = document.getElementById('mEditName').value.trim();
  const category = _mEditCat;
  if (!name) return;
  const id = _mEditId;
  t.name = name;
  t.category = category;
  save();
  mCloseEdit();
  mRenderToday();
  await sbReq('PATCH', 'tasks', {name, category}, `?id=eq.${id}`);
}

async function mDeleteEditTask() {
  if (!_mEditId) return;
  const id = _mEditId;
  st.tasks = st.tasks.filter(x => String(x.id) !== String(id));
  save();
  mCloseEdit();
  mRenderToday();
  await sbReq('DELETE', 'tasks', null, `?id=eq.${id}`);
}

// ── Delete by id (swipe-to-delete) ───────────────────────────────────────────
async function mDeleteById(id) {
  st.tasks = st.tasks.filter(x => String(x.id) !== String(id));
  save();
  mRenderToday();
  await sbReq('DELETE', 'tasks', null, `?id=eq.${id}`);
}

// ── Swipe-to-delete ───────────────────────────────────────────────────────────
let _sw = null;
function mInitSwipe() {
  const list = document.getElementById('mTodayList');
  if (!list || list._swipeInited) return;
  list._swipeInited = true;
  const THRESHOLD = 90;

  list.addEventListener('touchstart', e => {
    const outer = e.target.closest('.m-row-outer[data-tid]');
    if (!outer) return;
    _sw = {outer, row: outer.querySelector('.m-row'), startX: e.touches[0].clientX, startY: e.touches[0].clientY, decided: false, dx: 0};
  }, {passive: true});

  list.addEventListener('touchmove', e => {
    if (!_sw) return;
    const dx = e.touches[0].clientX - _sw.startX;
    const dy = e.touches[0].clientY - _sw.startY;
    if (!_sw.decided) {
      if (Math.abs(dy) > Math.abs(dx) + 3) { _sw = null; return; }
      if (Math.abs(dx) > 6) _sw.decided = true;
      else return;
    }
    if (dx > 0) return;
    _sw.dx = Math.max(-(THRESHOLD + 30), dx);
    _sw.row.style.transform = `translateX(${_sw.dx}px)`;
    _sw.outer.classList.toggle('ptr-ready', _sw.dx <= -THRESHOLD);
  }, {passive: true});

  list.addEventListener('touchend', () => {
    if (!_sw) return;
    const {outer, row, dx} = _sw; _sw = null;
    if (dx <= -THRESHOLD) {
      row.style.transition = 'transform .18s';
      row.style.transform = 'translateX(-110%)';
      outer.style.transition = 'opacity .18s';
      outer.style.opacity = '0';
      setTimeout(() => mDeleteById(outer.dataset.tid), 190);
    } else {
      row.style.transition = 'transform .2s';
      row.style.transform = '';
      outer.classList.remove('ptr-ready');
      setTimeout(() => row.style.transition = '', 200);
    }
  }, {passive: true});
}

// ── Pull-to-refresh ───────────────────────────────────────────────────────────
function mInitPTR() {
  const main = document.getElementById('mMain');
  const ptr = document.getElementById('mPTR');
  const lbl = document.getElementById('mPTRLbl');
  if (!main || !ptr) return;
  const THRESHOLD = 65;
  let startY = 0, active = false, triggered = false;

  main.addEventListener('touchstart', e => {
    if (main.scrollTop <= 0) { startY = e.touches[0].clientY; active = true; triggered = false; }
  }, {passive: true});

  main.addEventListener('touchmove', e => {
    if (!active) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { active = false; return; }
    const pull = Math.min(dy * 0.5, THRESHOLD * 1.1);
    ptr.style.height = pull + 'px';
    ptr.style.opacity = String(Math.min(pull / THRESHOLD, 1));
    triggered = pull >= THRESHOLD;
    ptr.classList.toggle('ptr-ready', triggered);
    if (lbl) lbl.textContent = triggered ? 'Release to refresh' : 'Pull to refresh';
  }, {passive: true});

  main.addEventListener('touchend', async () => {
    if (!active) return;
    active = false;
    if (triggered) {
      ptr.classList.add('ptr-loading');
      ptr.classList.remove('ptr-ready');
      ptr.style.height = '44px';
      await syncAll(true);
      mRenderToday();
    }
    ptr.style.height = '0';
    ptr.style.opacity = '0';
    ptr.classList.remove('ptr-loading', 'ptr-ready');
    if (lbl) lbl.textContent = 'Pull to refresh';
  }, {passive: true});
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function mDoLogin() {
  const email = document.getElementById('mEmail').value.trim();
  const pass = document.getElementById('mPass').value;
  const err = document.getElementById('mLoginErr');
  err.style.display = 'none';
  if (!email || !pass) { err.textContent = 'Enter email and password.'; err.style.display = 'block'; return; }
  await doLogin_m(email, pass);
}
async function doLogin_m(email, pass) {
  const err = document.getElementById('mLoginErr');
  if (!_sbClient) _initSbClient();
  const {data, error} = await _sbClient.auth.signInWithPassword({email, password: pass});
  if (error) { err.textContent = error.message; err.style.display = 'block'; return; }
  _authToken = data.session.access_token;
  hideLoginOverlay();
  await syncAll();
}

// ── Date label ────────────────────────────────────────────────────────────────
function _mSetDate() {
  const lbl = document.getElementById('mDateLbl');
  if (lbl) lbl.textContent = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function mInit() {
  load();
  _mSetDate();
  mInitPickers();
  mInitSwipe();
  mInitPTR();
  const authed = await checkAuth();
  if (!authed) return;
  hideLoginOverlay();
  await syncAll();
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}

document.addEventListener('DOMContentLoaded', mInit);
