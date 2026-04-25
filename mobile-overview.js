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
function renderAll() { mRenderToday(); if (_mCurTab === 'tb') mRenderTB(); if (_mCurTab === 'week') mRenderWeek(); }
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
let _mAddCat       = 'Home';
let _mEditCat      = 'Home';
let _mBlockCat     = 'Home';
let _mWkAddCat     = 'Home';
let _mFullAddCat   = 'Home';
let _mAddImportant    = false;
let _mEditImportant   = false;
let _mFullAddImportant = false;

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
  const ids = {add: 'mAddPickOpts', edit: 'mEditPickOpts', block: 'mBlockPickOpts', wkadd: 'mWkAddPickOpts', fulladd: 'mFullAddPickOpts'};
  const myId = ids[which];
  Object.entries(ids).forEach(([k, id]) => { if (k !== which) document.getElementById(id)?.classList.remove('open'); });
  document.getElementById(myId)?.classList.toggle('open');
}

function mSelectCat(which, cat) {
  const map = {
    add:     {dot: 'mAddPickDot',     lbl: 'mAddPickLbl',     opts: 'mAddPickOpts'},
    edit:    {dot: 'mEditPickDot',    lbl: 'mEditPickLbl',    opts: 'mEditPickOpts'},
    block:   {dot: 'mBlockPickDot',   lbl: 'mBlockPickLbl',   opts: 'mBlockPickOpts'},
    wkadd:   {dot: 'mWkAddPickDot',   lbl: 'mWkAddPickLbl',   opts: 'mWkAddPickOpts'},
    fulladd: {dot: 'mFullAddPickDot', lbl: 'mFullAddPickLbl', opts: 'mFullAddPickOpts'},
  };
  const {dot: dotId, lbl: lblId, opts: optId} = map[which] || {};
  if (which === 'add')         _mAddCat       = cat;
  else if (which === 'edit')   _mEditCat      = cat;
  else if (which === 'block')  _mBlockCat     = cat;
  else if (which === 'wkadd')  _mWkAddCat     = cat;
  else if (which === 'fulladd') _mFullAddCat  = cat;
  const dotEl = document.getElementById(dotId);
  const lblEl = document.getElementById(lblId);
  if (dotEl) dotEl.style.cssText = _mDotStyle(cat);
  if (lblEl) lblEl.textContent = cat;
  document.getElementById(optId)?.classList.remove('open');
}

function mInitPickers() {
  _mBuildOpts('mAddPickOpts',     'add');
  _mBuildOpts('mEditPickOpts',    'edit');
  _mBuildOpts('mBlockPickOpts',   'block');
  _mBuildOpts('mWkAddPickOpts',   'wkadd');
  _mBuildOpts('mFullAddPickOpts', 'fulladd');
  mSelectCat('add',     'Home');
  mSelectCat('block',   'Home');
  mSelectCat('wkadd',   'Home');
  mSelectCat('fulladd', 'Home');
  document.addEventListener('click', e => {
    if (!e.target.closest('.m-cpick')) {
      ['mAddPickOpts','mEditPickOpts','mBlockPickOpts','mWkAddPickOpts','mFullAddPickOpts'].forEach(id => {
        document.getElementById(id)?.classList.remove('open');
      });
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

  const inner = `<div class="m-row${t.done ? ' m-done' : ''}${ov ? ' m-ov' : ''}">
    ${noCheck
      ? `<span class="m-row-icon">📅</span>`
      : `<label class="m-chk-wrap"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="${onchange}"></label>`
    }
    <span class="m-row-name${t.done ? ' done' : ''}">${safeName}</span>
    ${dot}
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
  if (progEl && _mCurTab === 'today') progEl.textContent = doneCount + '/' + sorted.length;
  const el = document.getElementById('mTodayList');
  if (!el) return;
  el.innerHTML = sorted.length ? sorted.map(mTaskRow).join('') : '<div class="m-empty">All done ✓</div>';
}

// ── Add task ──────────────────────────────────────────────────────────────────
function mToggleAddFlag() {
  _mAddImportant = !_mAddImportant;
  const btn = document.getElementById('mAddFlagBtn');
  if (btn) btn.classList.toggle('flagged', _mAddImportant);
}

async function mAddTask() {
  const inp = document.getElementById('mNewTask');
  const n = inp.value.trim();
  if (!n) return;
  const cat = _mAddCat;
  const ds = d2s(getDayDate(0));
  const important = _mAddImportant;
  const t = {id: 'l-' + Date.now(), name: n, category: cat, due_date: ds, done: false, important};
  st.tasks.push(t);
  save();
  inp.value = '';
  _mAddImportant = false;
  document.getElementById('mAddFlagBtn')?.classList.remove('flagged');
  mRenderToday();
  const sv = await sbReq('POST', 'tasks', {name: n, category: cat, due_date: ds, done: false, important});
  if (sv && sv[0]) {
    const i = st.tasks.findIndex(x => x.id === t.id);
    if (i > -1) st.tasks[i] = sv[0];
    save();
  }
}

// ── Edit task sheet ───────────────────────────────────────────────────────────
let _mEditId = null;

function mToggleEditImp() {
  _mEditImportant = !_mEditImportant;
  const btn = document.getElementById('mEditImpBtn');
  if (btn) { btn.textContent = _mEditImportant ? 'on' : 'off'; btn.classList.toggle('on', _mEditImportant); }
}

function mOpenEdit(id) {
  const t = st.tasks.find(x => String(x.id) === String(id));
  if (!t) return;
  _mEditId = String(id);
  _mEditImportant = !!t.important;
  document.getElementById('mEditName').value = t.name || '';
  document.getElementById('mEditDue').value = t.due_date || '';
  mSelectCat('edit', t.category || 'Home');
  const btn = document.getElementById('mEditImpBtn');
  if (btn) { btn.textContent = _mEditImportant ? 'on' : 'off'; btn.classList.toggle('on', _mEditImportant); }
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
  const due_date = document.getElementById('mEditDue').value || null;
  const important = _mEditImportant;
  if (!name) return;
  const id = _mEditId;
  t.name = name;
  t.category = category;
  t.due_date = due_date;
  t.important = important;
  save();
  mCloseEdit();
  mRenderToday();
  await sbReq('PATCH', 'tasks', {name, category, due_date, important}, `?id=eq.${id}`);
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

// ── Full add sheet (today, all fields) ───────────────────────────────────────
function mToggleFullAddImp() {
  _mFullAddImportant = !_mFullAddImportant;
  const btn = document.getElementById('mFullAddImpBtn');
  if (btn) { btn.textContent = _mFullAddImportant ? 'on' : 'off'; btn.classList.toggle('on', _mFullAddImportant); }
}

function mOpenFullAdd() {
  _mFullAddImportant = false;
  document.getElementById('mFullAddName').value = '';
  document.getElementById('mFullAddDue').value = d2s(getDayDate(0));
  mSelectCat('fulladd', 'Home');
  const btn = document.getElementById('mFullAddImpBtn');
  if (btn) { btn.textContent = 'off'; btn.classList.remove('on'); }
  document.getElementById('mFullAddBackdrop').classList.add('open');
  document.getElementById('mFullAddSheet').classList.add('open');
  setTimeout(() => document.getElementById('mFullAddName').focus(), 300);
}

function mCloseFullAdd() {
  document.getElementById('mFullAddBackdrop').classList.remove('open');
  document.getElementById('mFullAddSheet').classList.remove('open');
  document.getElementById('mFullAddPickOpts')?.classList.remove('open');
}

async function mSaveFullAdd() {
  const name = document.getElementById('mFullAddName').value.trim();
  if (!name) return;
  const category = _mFullAddCat;
  const due_date = document.getElementById('mFullAddDue').value || d2s(getDayDate(0));
  const important = _mFullAddImportant;
  const t = {id: 'l-' + Date.now(), name, category, due_date, done: false, important};
  st.tasks.push(t);
  save();
  mCloseFullAdd();
  mRenderToday();
  const sv = await sbReq('POST', 'tasks', {name, category, due_date, done: false, important});
  if (sv && sv[0]) {
    const i = st.tasks.findIndex(x => x.id === t.id);
    if (i > -1) st.tasks[i] = sv[0];
    save();
  }
}

// ── Delete by id (swipe-to-delete) ───────────────────────────────────────────
async function mDeleteById(id) {
  st.tasks = st.tasks.filter(x => String(x.id) !== String(id));
  save();
  mRenderToday();
  await sbReq('DELETE', 'tasks', null, `?id=eq.${id}`);
}

// ── Double-tap to edit ────────────────────────────────────────────────────────
let _dtap = {t: 0, id: null};
function _isDblTap(id) {
  const now = Date.now();
  const dbl = now - _dtap.t < 350 && _dtap.id === id;
  _dtap = {t: now, id};
  return dbl;
}

function mInitTodayDblTap() {
  const list = document.getElementById('mTodayList');
  if (!list || list._dblTapInited) return;
  list._dblTapInited = true;
  let tapStartX = 0, tapStartY = 0;
  list.addEventListener('touchstart', e => {
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }, {passive: true});
  list.addEventListener('touchend', e => {
    const outer = e.target.closest('.m-row-outer[data-tid]');
    if (!outer) return;
    const ct = e.changedTouches[0];
    if (Math.abs(ct.clientX - tapStartX) > 10 || Math.abs(ct.clientY - tapStartY) > 10) return;
    if (_isDblTap(outer.dataset.tid)) mOpenEdit(outer.dataset.tid);
  }, {passive: true});
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
  const ptr  = document.getElementById('mPTR');
  const lbl  = document.getElementById('mPTRLbl');
  if (!main || !ptr) return;
  const THRESHOLD = 65;
  let startY = 0, active = false, triggered = false;

  main.addEventListener('touchstart', e => {
    if (_mCurTab !== 'today') return;
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

// ── Tab switching ─────────────────────────────────────────────────────────────
let _mCurTab = 'tb';

function mShowTab(tab) {
  _mCurTab = tab;
  const pages = {today: 'mTodayPage', tb: 'mTBPage', week: 'mWeekPage'};
  Object.entries(pages).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === tab ? '' : 'none';
  });
  const isToday = tab === 'today';
  document.getElementById('mAddBar').style.display = isToday ? '' : 'none';
  document.getElementById('mApp').style.paddingBottom = isToday
    ? 'calc(162px + env(safe-area-inset-bottom))'
    : 'calc(52px + env(safe-area-inset-bottom))';
  document.querySelectorAll('.m-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'today' && i === 0) || (tab === 'tb' && i === 1) || (tab === 'week' && i === 2));
  });
  const titles = {today: 'Today', tb: 'Timeblock', week: 'Week'};
  const titleEl = document.getElementById('mHeaderTitle');
  if (titleEl) titleEl.textContent = titles[tab] || '';
  const progEl = document.getElementById('mProgress');
  if (progEl) progEl.style.display = isToday ? '' : 'none';
  document.getElementById('mMain').style.padding = isToday ? '12px 16px' : '0';

  if (tab === 'tb')   { _mTBOffset = 0; mRenderTB(); _mScrollNow(); }
  else if (tab === 'week') { _mWeekOffset = 0; mRenderWeek(); }
  else { _mSetDate(); }
}

// ── Timeblock constants ───────────────────────────────────────────────────────
const M_TB_START = 6 * 60;   // 6am
const M_TB_END   = 22 * 60;  // 10pm
const M_PX       = 0.75;     // px per minute → 45px per hour, ~720px total

function _mTStr(m) {
  const h = Math.floor(m / 60), mn = m % 60;
  const hd = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const suf = h >= 12 ? 'p' : 'a';
  return mn ? `${hd}:${String(mn).padStart(2, '0')}${suf}` : `${hd}${suf}`;
}

let _mTBOffset = 0; // day offset (0=today, -1=yesterday, +1=tomorrow)

// ── Timeblock rendering ───────────────────────────────────────────────────────
function mRenderTB() {
  // Update date label for displayed day
  const d    = getDayDate(_mTBOffset);
  const lbl  = document.getElementById('mDateLbl');
  if (lbl) {
    const opts = {weekday: 'short', month: 'short', day: 'numeric'};
    const prefix = _mTBOffset === 0 ? 'Today · ' : _mTBOffset === -1 ? 'Yesterday · ' : _mTBOffset === 1 ? 'Tomorrow · ' : '';
    lbl.textContent = prefix + d.toLocaleDateString('en-US', opts);
  }
  mRenderUnassigned();
  mRenderTimeline();
}

function mRenderUnassigned() {
  const bar = document.getElementById('mUnassignedBar');
  if (!bar) return;
  const ds = d2s(getDayDate(_mTBOffset));
  // Regular tasks due this day
  const dayTasks = st.tasks.filter(t =>
    t.due_date && t.due_date.split('T')[0] === ds && !t.done && t.category !== 'Weekly Goals'
  );
  const blockedIds = new Set((st.blocks || []).filter(b => b.ds === ds && b.taskId).map(b => String(b.taskId)));
  const blockedRecIds = new Set((st.blocks || []).filter(b => b.ds === ds && b.recId).map(b => String(b.recId)));
  const unassigned = dayTasks.filter(t => !blockedIds.has(String(t.id)));

  // Recurring virtual tasks due this day without blocks or auto-placement
  const dsDate = new Date(ds + 'T00:00:00');
  const today2 = new Date(); today2.setHours(0, 0, 0, 0);
  const dsDow2 = (dsDate.getDay() + 6) % 7;
  const todDow2 = (today2.getDay() + 6) % 7;
  const dsMon2 = new Date(dsDate); dsMon2.setDate(dsDate.getDate() - dsDow2);
  const todMon2 = new Date(today2); todMon2.setDate(today2.getDate() - todDow2);
  const wOff2 = Math.round((dsMon2 - todMon2) / (7 * 86400000));
  const recUnassigned = getRecurringWeekTasks(wOff2).filter(v => {
    if (v.due_date !== ds || v.done) return false;
    const r = st.recurring.find(x => String(x.id) === String(v._recId));
    if (!r) return false;
    if (blockedRecIds.has(String(r.id))) return false;
    if (r.default_start_time) return false; // has auto-placement
    return true;
  });

  const allUnassigned = [
    ...unassigned.map(t => ({ id: t.id, name: t.name, category: t.category, isRec: false })),
    ...recUnassigned.map(v => ({ id: 'rec-' + v._recId, name: v.name, category: v.category, isRec: true }))
  ];

  if (!allUnassigned.length) {
    bar.innerHTML = '<span class="m-chip-empty">No unassigned tasks</span>';
    return;
  }
  bar.innerHTML = allUnassigned.map(t => {
    const s   = gc(t.category || '');
    const sel = _mSelectedChipId === String(t.id);
    return `<button class="m-chip${sel ? ' selected' : ''}" onclick="mSelectChip('${t.id}')" style="--cdot:${s.bg};--cborder:${s.d}">${escHtml(t.name)}</button>`;
  }).join('');
}

function mRenderTimeline() {
  const labels = document.getElementById('mTLLabels');
  const col    = document.getElementById('mTLCol');
  if (!labels || !col) return;

  const totalH = (M_TB_END - M_TB_START) * M_PX;
  labels.style.height = totalH + 'px';
  col.style.height    = totalH + 'px';

  // Hour labels + lines
  const hrs = [];
  for (let m = M_TB_START; m <= M_TB_END; m += 60) {
    const y   = (m - M_TB_START) * M_PX;
    const h   = m / 60;
    const lbl = h === 12 ? '12pm' : h > 12 ? (h - 12) + 'pm' : h + 'am';
    const key = h === 8 || h === 16;
    const lblCss = key
      ? 'font-size:11px;color:var(--text);font-weight:700;width:40px;padding-right:6px;text-align:right;flex-shrink:0;line-height:1;margin-top:-7px'
      : 'font-size:10px;color:var(--sub);width:40px;padding-right:6px;text-align:right;flex-shrink:0;line-height:1;margin-top:-6px';
    const lineCss = key
      ? 'flex:1;border-top:1.5px solid rgba(124,106,247,.25)'
      : 'flex:1;border-top:1px solid var(--border)';
    hrs.push(`<div style="position:absolute;top:${y}px;left:0;right:0;display:flex;align-items:center;pointer-events:none">
      <span style="${lblCss}">${lbl}</span>
      <div style="${lineCss}"></div>
    </div>`);
  }
  labels.innerHTML = hrs.join('');

  // Blocks for displayed day
  const ds = d2s(getDayDate(_mTBOffset));
  const todayBlocks = (st.blocks || []).filter(b => b.ds === ds).sort((a, b) => a.sm - b.sm);
  let html = todayBlocks.map(b => {
    const y    = (b.sm - M_TB_START) * M_PX;
    const hPx  = Math.max(b.dur * M_PX, 28);
    const s    = gc(b.cat || '');
    const timeRange = `${_mTStr(b.sm)}–${_mTStr(b.sm + b.dur)}`;
    return `<div class="m-tl-block" data-bid="${b.id}" style="top:${y}px;height:${hPx}px;background:${s.bg};border:1px solid rgba(255,255,255,.55);border-left:3px solid ${s.d}">
      <div style="overflow:hidden;flex:1;min-width:0;pointer-events:none">
        <div class="m-tl-block-name" style="color:${s.t}">${escHtml(b.title || '')}</div>
      </div>
      <span class="m-tl-block-time" style="color:${s.d};pointer-events:none">${timeRange}</span>
    </div>`;
  }).join('');

  // Auto blocks
  if (cfg.showAutoTB) {
    const dow = new Date(ds + 'T00:00:00').getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    if (isWeekday) {
      (st.autoTimeblocks || []).filter(a => a.is_enabled).forEach(a => {
        const ov = (st.autoTBOverrides || []).find(o => String(o.base_id) === String(a.id) && o.date === ds);
        if (ov && (ov.start_time === null || ov.start_time === undefined)) return;
        const startTime = ov ? ov.start_time : a.start_time;
        const endTime = ov ? ov.end_time : a.end_time;
        const [sh, sm2] = (startTime || '00:00').split(':');
        const [eh, em] = (endTime || '00:30').split(':');
        const startMin = parseInt(sh) * 60 + parseInt(sm2 || 0);
        const endMin = parseInt(eh) * 60 + parseInt(em || 0);
        const dur = Math.max(15, endMin - startMin);
        const y = (startMin - M_TB_START) * M_PX;
        const hPx = Math.max(dur * M_PX, 28);
        html += `<div class="m-tl-block m-auto-block" style="top:${y}px;height:${hPx}px;background:rgba(124,106,247,.12);border:1px dashed rgba(124,106,247,.35);border-left:3px solid rgba(124,106,247,.5)">
          <div style="overflow:hidden;flex:1;min-width:0;pointer-events:none">
            <div class="m-tl-block-name" style="color:rgba(124,106,247,.8)">${escHtml(a.label || '')}</div>
          </div>
          <span class="m-tl-block-time" style="color:rgba(124,106,247,.6);pointer-events:none">${_mTStr(startMin)}–${_mTStr(startMin + dur)}</span>
        </div>`;
      });
    }
  }

  // Recurring auto blocks
  const dsDate = new Date(ds + 'T00:00:00');
  const today2 = new Date(); today2.setHours(0, 0, 0, 0);
  const dsDow = (dsDate.getDay() + 6) % 7;
  const todDow = (today2.getDay() + 6) % 7;
  const dsMon = new Date(dsDate); dsMon.setDate(dsDate.getDate() - dsDow);
  const todMon = new Date(today2); todMon.setDate(today2.getDate() - todDow);
  const wOff = Math.round((dsMon - todMon) / (7 * 86400000));
  const wkKey = dsToWkKey(ds);
  const virtTasks = getRecurringWeekTasks(wOff);
  virtTasks.forEach(v => {
    if (v.due_date !== ds || v.done) return;
    const r = st.recurring.find(x => String(x.id) === String(v._recId));
    if (!r || !r.default_start_time) return;
    if ((st.blocks || []).some(b => b.ds === ds && String(b.recId) === String(r.id))) return;
    const tbOv = r._dateOverrides && r._dateOverrides['tb::' + wkKey];
    if (tbOv === '__skip__') return;
    const startTime = tbOv && tbOv.start ? tbOv.start : r.default_start_time;
    const endTime = tbOv && tbOv.end ? tbOv.end : r.default_end_time;
    const [sh, sm2] = (startTime || '00:00').split(':');
    const [eh, em] = (endTime || '00:30').split(':');
    const startMin = parseInt(sh) * 60 + parseInt(sm2 || 0);
    const endMin = parseInt(eh) * 60 + parseInt(em || 0);
    const dur = Math.max(15, endMin - startMin);
    const y = (startMin - M_TB_START) * M_PX;
    const hPx = Math.max(dur * M_PX, 28);
    html += `<div class="m-tl-block m-rec-auto-block" style="top:${y}px;height:${hPx}px;background:rgba(124,106,247,.08);border:1px dashed rgba(124,106,247,.3);border-left:3px solid rgba(124,106,247,.4)">
      <div style="overflow:hidden;flex:1;min-width:0;pointer-events:none">
        <div class="m-tl-block-name" style="color:rgba(124,106,247,.7)">${escHtml(v.name || '')}</div>
      </div>
      <span class="m-tl-block-time" style="color:rgba(124,106,247,.5);pointer-events:none">${_mTStr(startMin)}–${_mTStr(startMin + dur)}</span>
    </div>`;
  });

  col.innerHTML = html;

  // Now line (only for today)
  if (_mTBOffset === 0) {
    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= M_TB_START && nowMin <= M_TB_END) {
      const nowEl = document.createElement('div');
      nowEl.className = 'm-tl-now';
      nowEl.style.top = ((nowMin - M_TB_START) * M_PX) + 'px';
      col.appendChild(nowEl);
    }
  }

  // Click handler: open block edit or create new block
  col.onclick = e => {
    if (_mDragJustEnded) return;
    const blockEl = e.target.closest('.m-tl-block');
    if (blockEl) { mOpenBlockEdit(blockEl.dataset.bid); return; }
    const rect    = col.getBoundingClientRect();
    const rawMin  = Math.round((e.clientY - rect.top) / M_PX) + M_TB_START;
    const snapMin = Math.round(rawMin / 15) * 15;
    const sm      = Math.max(M_TB_START, Math.min(M_TB_END - 30, snapMin));
    mOpenNewBlock(sm);
  };
}

function _mScrollNow() {
  const scroll = document.getElementById('mTLScroll');
  if (!scroll) return;
  if (_mTBOffset !== 0) { scroll.scrollTop = 0; return; }
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin >= M_TB_START && nowMin <= M_TB_END) {
    const y = (nowMin - M_TB_START) * M_PX;
    setTimeout(() => { scroll.scrollTop = Math.max(0, y - 100); }, 50);
  }
}

// ── Day swipe navigation on timeline ─────────────────────────────────────────
function mInitTBSwipe() {
  const scroll = document.getElementById('mTLScroll');
  if (!scroll || scroll._tbSwipeInited) return;
  scroll._tbSwipeInited = true;

  let startX = 0, startY = 0;

  scroll.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive: true});

  scroll.addEventListener('touchend', e => {
    if (_mDragBlock) return; // don't navigate while dragging a block
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) _mTBOffset++; // swipe left → next day
    else         _mTBOffset--; // swipe right → previous day
    mRenderTB();
    _mScrollNow();
  }, {passive: true});
}

// ── Block drag (longpress + drag up/down to change time) ─────────────────────
let _mDragBlock    = null;
let _mDragJustEnded = false;

function mInitBlockDrag() {
  const col = document.getElementById('mTLCol');
  if (!col || col._dragInited) return;
  col._dragInited = true;

  let pressTimer  = null;
  let touchStartY = 0;
  let touchStartX = 0;

  col.addEventListener('touchstart', e => {
    const blockEl = e.target.closest('.m-tl-block');
    if (!blockEl) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;

    pressTimer = setTimeout(() => {
      pressTimer = null;
      const bid = blockEl.dataset.bid;
      const b   = (st.blocks || []).find(x => String(x.id) === bid);
      if (!b) return;
      _mDragBlock = {el: blockEl, b, origSm: b.sm, startY: touchStartY};
      blockEl.style.opacity   = '0.7';
      blockEl.style.transform = 'scale(1.02)';
      blockEl.style.boxShadow = '0 6px 24px rgba(0,0,0,.18)';
      blockEl.style.zIndex    = '5';
      // Lock scroll so vertical drag doesn't scroll the container
      const scrl = document.getElementById('mTLScroll');
      if (scrl) scrl.style.overflowY = 'hidden';
    }, 480);
  }, {passive: true});

  col.addEventListener('touchmove', e => {
    if (pressTimer) {
      // Cancel longpress if finger moved before threshold
      if (Math.abs(e.touches[0].clientY - touchStartY) > 8 ||
          Math.abs(e.touches[0].clientX - touchStartX) > 8) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      return;
    }
    if (!_mDragBlock) return;
    const dy    = e.touches[0].clientY - _mDragBlock.startY;
    const dMin  = Math.round((dy / M_PX) / 15) * 15; // snap to 15 min
    const newSm = Math.max(M_TB_START, Math.min(M_TB_END - _mDragBlock.b.dur, _mDragBlock.origSm + dMin));
    _mDragBlock.b.sm       = newSm;
    _mDragBlock.el.style.top = ((newSm - M_TB_START) * M_PX) + 'px';
  }, {passive: true});

  col.addEventListener('touchend', async () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!_mDragBlock) return;

    const {el, b} = _mDragBlock;
    _mDragBlock = null;

    // Restore styles
    el.style.opacity   = '';
    el.style.transform = '';
    el.style.boxShadow = '';
    el.style.zIndex    = '';

    // Unlock scroll
    const scrl = document.getElementById('mTLScroll');
    if (scrl) scrl.style.overflowY = '';

    // Suppress the click that fires after touchend
    _mDragJustEnded = true;
    setTimeout(() => { _mDragJustEnded = false; }, 300);

    const finalSm = b.sm;
    save();
    mRenderTimeline();
    const hh = Math.floor(finalSm / 60);
    const mm = finalSm % 60;
    await sbUpdateBlock(b.id, {
      start_minutes: finalSm,
      start_time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`
    });
  }, {passive: true});
}

// ── Chip selection ────────────────────────────────────────────────────────────
let _mSelectedChipId = null;

function mSelectChip(taskId) {
  _mSelectedChipId = (_mSelectedChipId === String(taskId)) ? null : String(taskId);
  mRenderUnassigned();
}

// ── Block sheet ───────────────────────────────────────────────────────────────
let _mEditBlockId = null;
let _mBlockDur    = 60;

function mOpenNewBlock(sm) {
  _mEditBlockId = null;
  _mBlockDur    = 60;
  document.getElementById('mBlockSheetTitle').textContent = 'Add Block';
  document.getElementById('mBlockDel').style.display = 'none';

  const hh = Math.floor(sm / 60);
  const mm = sm % 60;
  document.getElementById('mBlockTime').value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  if (_mSelectedChipId) {
    const t = st.tasks.find(x => String(x.id) === _mSelectedChipId);
    if (t) {
      document.getElementById('mBlockName').value = t.name || '';
      mSelectCat('block', t.category || 'Home');
    } else {
      document.getElementById('mBlockName').value = '';
      mSelectCat('block', _mBlockCat);
    }
  } else {
    document.getElementById('mBlockName').value = '';
    mSelectCat('block', _mBlockCat);
  }

  _mUpdateDurBtns();
  document.getElementById('mBlockBackdrop').classList.add('open');
  document.getElementById('mBlockSheet').classList.add('open');
  setTimeout(() => document.getElementById('mBlockName').focus(), 300);
}

function mOpenBlockEdit(blockId) {
  const b = (st.blocks || []).find(x => String(x.id) === String(blockId));
  if (!b) return;
  _mEditBlockId = String(blockId);
  _mBlockDur    = b.dur || 60;
  document.getElementById('mBlockSheetTitle').textContent = 'Edit Block';
  document.getElementById('mBlockDel').style.display = '';
  document.getElementById('mBlockName').value = b.title || '';
  const hh = Math.floor(b.sm / 60);
  const mm = b.sm % 60;
  document.getElementById('mBlockTime').value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  mSelectCat('block', b.cat || 'Home');
  _mUpdateDurBtns();
  document.getElementById('mBlockBackdrop').classList.add('open');
  document.getElementById('mBlockSheet').classList.add('open');
}

function mSetDur(mins) {
  _mBlockDur = mins;
  _mUpdateDurBtns();
}

function _mUpdateDurBtns() {
  document.querySelectorAll('.m-dur-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.dur) === _mBlockDur);
  });
}

function mCloseBlock() {
  _mEditBlockId = null;
  document.getElementById('mBlockBackdrop').classList.remove('open');
  document.getElementById('mBlockSheet').classList.remove('open');
  document.getElementById('mBlockPickOpts')?.classList.remove('open');
}

async function mSaveBlock() {
  const name    = document.getElementById('mBlockName').value.trim();
  const timeVal = document.getElementById('mBlockTime').value;
  if (!name || !timeVal) return;
  const [hh, mm] = timeVal.split(':').map(Number);
  const sm  = hh * 60 + mm;
  const ds  = d2s(getDayDate(_mTBOffset));
  const cat = _mBlockCat;

  if (_mEditBlockId) {
    const b = (st.blocks || []).find(x => String(x.id) === _mEditBlockId);
    if (!b) { mCloseBlock(); return; }
    b.title = name; b.sm = sm; b.dur = _mBlockDur; b.cat = cat; b.ds = ds;
    save(); mCloseBlock(); mRenderTB();
    await sbUpdateBlock(_mEditBlockId, {
      title: name,
      start_minutes: sm,
      start_time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`,
      duration_minutes: _mBlockDur,
      category: cat
    });
  } else {
    const taskId = _mSelectedChipId || null;
    const b = {id: 'lb-' + Date.now(), title: name, ds, sm, dur: _mBlockDur, cat, taskId, recId: null, shopId: null, _done: false};
    if (!st.blocks) st.blocks = [];
    st.blocks.push(b);
    save();
    _mSelectedChipId = null;
    mCloseBlock(); mRenderTB();
    await sbSaveBlock(b);
  }
}

async function mDeleteBlock() {
  if (!_mEditBlockId) return;
  const id = _mEditBlockId;
  st.blocks = (st.blocks || []).filter(x => String(x.id) !== String(id));
  save(); mCloseBlock(); mRenderTB();
  await sbDeleteBlock(id);
}

// ── Week view ─────────────────────────────────────────────────────────────────
let _mWeekOffset = 0;

const _WK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function mWeekPrev() { _mWeekOffset--; mRenderWeek(); }
function mWeekNext() { _mWeekOffset++; mRenderWeek(); }

function mGetDayTasks(ds, weekOff) {
  const today = d2s(getDayDate(0));
  const isToday = ds === today;

  const regular = st.tasks.filter(t => {
    if (!t.due_date || t.category === 'Weekly Goals') return false;
    const tds = t.due_date.split('T')[0];
    if (tds === ds) return true;
    if (isToday && isOv(t.due_date) && !t.done) return true;
    return false;
  });

  const recVirt = getRecurringWeekTasks(weekOff).filter(v => v.due_date === ds);

  const shopItems = st.shopping
    .filter(s => !s.done && s.due_date && (s.due_date === ds || (isToday && isOv(s.due_date))))
    .map(s => ({id: 'shop-' + s.id, name: s.name, category: 'Shopping', due_date: s.due_date, done: false, _shopId: s.id, _virtual: true, _type: 'shop'}));

  return [...regular, ...recVirt, ...shopItems].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function mWkTaskRow(t) {
  const ov      = isOv(t.due_date) && !t.done;
  const catKey  = t._type === 'shop' ? 'shopping' : (t._virtual && t._recId) ? 'recurring' : (t.category || '');
  const s       = ov ? OV : gc(catKey);
  const canDrag = !t._virtual && !t._type;

  let onchange = '';
  if (t._type === 'shop')          onchange = `togShop('${t._shopId}',this.checked)`;
  else if (t._virtual && t._recId) onchange = `togRecVirt('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (!t._virtual)            onchange = `toggleTask('${t.id}',this.checked)`;

  const dot = `<span style="width:8px;height:8px;border-radius:50%;background:${s.bg};border:1.5px solid ${s.d};flex-shrink:0;display:inline-block"></span>`;
  const chk = onchange
    ? `<label style="display:flex;align-items:center;justify-content:center;width:22px;height:32px;flex-shrink:0;cursor:pointer"><input type="checkbox"${t.done ? ' checked' : ''} onchange="${onchange}" style="width:16px;height:16px;accent-color:var(--accent)"></label>`
    : `<span style="width:22px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">📅</span>`;

  const dragAttrs = canDrag ? ` data-tid="${t.id}" data-tname="${escHtml(t.name || '')}"` : '';

  return `<div class="m-wk-row${ov ? ' m-ov' : ''}"${dragAttrs}>
    ${chk}
    <span style="flex:1;font-size:13px;line-height:1.3;${t.done ? 'text-decoration:line-through;opacity:.4' : ''}${ov ? ';color:#dc2626' : ''}">${escHtml(t.name || '')}</span>
    ${dot}
  </div>`;
}

function mRenderWeek() {
  const dates  = getWkDates(_mWeekOffset);
  const today  = d2s(getDayDate(0));
  const start  = dates[0].toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const end    = dates[6].toLocaleDateString('en-US', {month: 'short', day: 'numeric'});

  // Range label
  const rangeLbl = document.getElementById('mWeekRangeLbl');
  if (rangeLbl) {
    rangeLbl.textContent = _mWeekOffset === 0 ? 'This Week'
      : _mWeekOffset === -1 ? 'Last Week'
      : _mWeekOffset === 1  ? 'Next Week'
      : `${start} – ${end}`;
  }
  // Header date label
  const dateLbl = document.getElementById('mDateLbl');
  if (dateLbl) dateLbl.textContent = `${start} – ${end}`;

  const html = dates.map((d, i) => {
    const ds      = d2s(d);
    const isToday = ds === today;
    const isPast  = !isToday && ds < today;
    const dateStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    const tasks   = mGetDayTasks(ds, _mWeekOffset);
    const doneC   = tasks.filter(t => t.done).length;

    return `<div class="m-wk-day${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}" data-ds="${ds}">
      <div class="m-wk-hd">
        <div class="m-wk-hd-left">
          <span class="m-wk-dname">${_WK_DAYS[i]}</span>
          <span class="m-wk-ddate">${dateStr}</span>
          ${isToday ? '<span class="m-wk-today-dot"></span>' : ''}
        </div>
        <div class="m-wk-hd-right">
          ${tasks.length ? `<span class="m-wk-cnt">${doneC}/${tasks.length}</span>` : ''}
          <button class="m-wk-add" onclick="mWkAddTask('${ds}')">+</button>
        </div>
      </div>
      ${tasks.length
        ? tasks.map(mWkTaskRow).join('')
        : '<div class="m-wk-empty">—</div>'
      }
    </div>`;
  }).join('');

  document.getElementById('mWeekList').innerHTML = html;
}

// ── Week: add task for specific day ──────────────────────────────────────────
let _mWkAddDs = null;

function mWkAddTask(ds) {
  _mWkAddDs = ds;
  const d   = new Date(ds + 'T12:00:00');
  const lbl = d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
  document.getElementById('mWkAddTitle').textContent = `Add — ${lbl}`;
  document.getElementById('mWkAddName').value = '';
  mSelectCat('wkadd', 'Home');
  document.getElementById('mWkAddBackdrop').classList.add('open');
  document.getElementById('mWkAddSheet').classList.add('open');
  setTimeout(() => document.getElementById('mWkAddName').focus(), 300);
}

function mCloseWkAdd() {
  _mWkAddDs = null;
  document.getElementById('mWkAddBackdrop').classList.remove('open');
  document.getElementById('mWkAddSheet').classList.remove('open');
  document.getElementById('mWkAddPickOpts')?.classList.remove('open');
}

async function mSaveWkTask() {
  if (!_mWkAddDs) return;
  const n = document.getElementById('mWkAddName').value.trim();
  if (!n) return;
  const cat = _mWkAddCat;
  const ds  = _mWkAddDs;
  const t   = {id: 'l-' + Date.now(), name: n, category: cat, due_date: ds, done: false, important: false};
  st.tasks.push(t);
  save();
  mCloseWkAdd();
  mRenderWeek();
  const sv = await sbReq('POST', 'tasks', {name: n, category: cat, due_date: ds, done: false});
  if (sv && sv[0]) {
    const i = st.tasks.findIndex(x => x.id === t.id);
    if (i > -1) st.tasks[i] = sv[0];
    save();
  }
}

// ── Week drag: hold + drag row to a different day ─────────────────────────────
let _mWkDrag = null;

function _mWkDragMove(e) {
  if (!_mWkDrag) return;
  e.preventDefault(); // block scroll while dragging
  const touch = e.touches[0];
  _mWkDrag.ghost.style.left = touch.clientX + 'px';
  _mWkDrag.ghost.style.top  = (touch.clientY - 44) + 'px';

  // Auto-scroll #mMain when near top/bottom edges
  const main = document.getElementById('mMain');
  if (main) {
    const mr = main.getBoundingClientRect();
    const EDGE = 80, SPEED = 8;
    if (touch.clientY > mr.bottom - EDGE)      main.scrollTop += SPEED;
    else if (touch.clientY < mr.top + EDGE)    main.scrollTop -= SPEED;
  }

  // ghost has pointer-events:none so elementFromPoint hits through it
  const el       = document.elementFromPoint(touch.clientX, touch.clientY);
  const dayEl    = el?.closest('.m-wk-day[data-ds]');
  const targetDs = dayEl?.dataset.ds || null;

  document.querySelectorAll('.m-wk-day[data-ds]').forEach(d => {
    d.classList.toggle('m-wk-drop-target',
      !!targetDs && d.dataset.ds === targetDs && targetDs !== _mWkDrag.origDs);
  });
  _mWkDrag.currentTargetDs = targetDs;
}

function mInitWkDrag() {
  const list = document.getElementById('mWeekList');
  if (!list || list._wkDragInited) return;
  list._wkDragInited = true;

  let pressTimer  = null;
  let touchStartX = 0, touchStartY = 0;

  list.addEventListener('touchstart', e => {
    const rowEl = e.target.closest('.m-wk-row[data-tid]');
    if (!rowEl) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    pressTimer = setTimeout(() => {
      pressTimer = null;
      const tid    = rowEl.dataset.tid;
      const tname  = rowEl.dataset.tname;
      const dayEl  = rowEl.closest('.m-wk-day[data-ds]');
      const origDs = dayEl?.dataset.ds;
      if (!origDs) return;

      const ghost = document.createElement('div');
      ghost.textContent = tname;
      ghost.style.cssText = [
        'position:fixed', 'pointer-events:none', 'z-index:500',
        `background:var(--accent)`, 'color:#fff',
        'padding:8px 16px', 'border-radius:20px',
        'font-size:13px', 'font-weight:600',
        'box-shadow:0 8px 28px rgba(0,0,0,.28)',
        'max-width:240px', 'white-space:nowrap',
        'overflow:hidden', 'text-overflow:ellipsis',
        `left:${touchStartX}px`, `top:${touchStartY - 44}px`,
        'transform:translateX(-50%)',
      ].join(';');
      document.body.appendChild(ghost);
      rowEl.style.opacity = '0.3';

      _mWkDrag = {tid, origDs, ghost, rowEl, currentTargetDs: origDs};
      document.addEventListener('touchmove', _mWkDragMove, {passive: false});
    }, 480);
  }, {passive: true});

  list.addEventListener('touchmove', e => {
    if (!pressTimer) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 8 ||
        Math.abs(e.touches[0].clientY - touchStartY) > 8) {
      clearTimeout(pressTimer); pressTimer = null;
    }
  }, {passive: true});

  list.addEventListener('touchend', async e => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!_mWkDrag) {
      // double-tap to edit
      const rowEl = e.target.closest('.m-wk-row[data-tid]');
      if (rowEl) {
        const ct = e.changedTouches[0];
        if (Math.abs(ct.clientX - touchStartX) <= 10 && Math.abs(ct.clientY - touchStartY) <= 10) {
          if (_isDblTap(rowEl.dataset.tid)) mOpenEdit(rowEl.dataset.tid);
        }
      }
      return;
    }
    document.removeEventListener('touchmove', _mWkDragMove);

    const {tid, origDs, ghost, rowEl, currentTargetDs} = _mWkDrag;
    _mWkDrag = null;
    ghost.remove();
    rowEl.style.opacity = '';
    document.querySelectorAll('.m-wk-day').forEach(d => d.classList.remove('m-wk-drop-target'));

    if (currentTargetDs && currentTargetDs !== origDs) {
      const t = st.tasks.find(x => String(x.id) === String(tid));
      if (t) {
        t.due_date = currentTargetDs;
        save();
        mRenderWeek();
        await sbReq('PATCH', 'tasks', {due_date: currentTargetDs}, `?id=eq.${tid}`);
      }
    }
  }, {passive: true});
}

// ── Week swipe navigation ─────────────────────────────────────────────────────
function mInitWeekSwipe() {
  const page = document.getElementById('mWeekPage');
  if (!page || page._weekSwipeInited) return;
  page._weekSwipeInited = true;

  let startX = 0, startY = 0;

  page.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive: true});

  page.addEventListener('touchend', e => {
    if (_mWkDrag) return; // don't navigate while dragging a task
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) mWeekNext();
    else         mWeekPrev();
  }, {passive: true});
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function mDoLogin() {
  const email = document.getElementById('mEmail').value.trim();
  const pass  = document.getElementById('mPass').value;
  const err   = document.getElementById('mLoginErr');
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
  mInitTodayDblTap();
  mInitSwipe();
  mInitPTR();
  mInitTBSwipe();
  mInitBlockDrag();
  mInitWeekSwipe();
  mInitWkDrag();
  const authed = await checkAuth();
  if (!authed) return;
  hideLoginOverlay();
  await syncAll();
  mShowTab('tb');
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}

document.addEventListener('DOMContentLoaded', mInit);
