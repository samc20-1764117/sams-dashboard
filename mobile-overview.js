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
function renderAll() { mRenderToday(); if (_mCurTab === 'tb') mRenderTB(); }
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
let _mBlockCat = 'Home';

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
  const ids = {add: 'mAddPickOpts', edit: 'mEditPickOpts', block: 'mBlockPickOpts'};
  const myId = ids[which];
  Object.entries(ids).forEach(([k, id]) => { if (k !== which) document.getElementById(id)?.classList.remove('open'); });
  document.getElementById(myId)?.classList.toggle('open');
}

function mSelectCat(which, cat) {
  const map = {
    add:   {dot: 'mAddPickDot',   lbl: 'mAddPickLbl',   opts: 'mAddPickOpts'},
    edit:  {dot: 'mEditPickDot',  lbl: 'mEditPickLbl',  opts: 'mEditPickOpts'},
    block: {dot: 'mBlockPickDot', lbl: 'mBlockPickLbl', opts: 'mBlockPickOpts'},
  };
  const {dot: dotId, lbl: lblId, opts: optId} = map[which] || {};
  if (which === 'add') _mAddCat = cat;
  else if (which === 'edit') _mEditCat = cat;
  else if (which === 'block') _mBlockCat = cat;
  const dotEl = document.getElementById(dotId);
  const lblEl = document.getElementById(lblId);
  if (dotEl) dotEl.style.cssText = _mDotStyle(cat);
  if (lblEl) lblEl.textContent = cat;
  document.getElementById(optId)?.classList.remove('open');
}

function mInitPickers() {
  _mBuildOpts('mAddPickOpts', 'add');
  _mBuildOpts('mEditPickOpts', 'edit');
  _mBuildOpts('mBlockPickOpts', 'block');
  mSelectCat('add', 'Home');
  mSelectCat('block', 'Home');
  document.addEventListener('click', e => {
    if (!e.target.closest('.m-cpick')) {
      document.getElementById('mAddPickOpts')?.classList.remove('open');
      document.getElementById('mEditPickOpts')?.classList.remove('open');
      document.getElementById('mBlockPickOpts')?.classList.remove('open');
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
  if (progEl && _mCurTab === 'today') progEl.textContent = doneCount + '/' + sorted.length;
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
let _mCurTab = 'today';

function mShowTab(tab) {
  _mCurTab = tab;
  const isToday = tab === 'today';
  document.getElementById('mTodayPage').style.display = isToday ? '' : 'none';
  document.getElementById('mTBPage').style.display = isToday ? 'none' : '';
  document.getElementById('mAddBar').style.display = isToday ? '' : 'none';
  document.getElementById('mApp').style.paddingBottom = isToday
    ? 'calc(162px + env(safe-area-inset-bottom))'
    : 'calc(52px + env(safe-area-inset-bottom))';
  document.querySelectorAll('.m-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', (isToday && i === 0) || (!isToday && i === 1));
  });
  const titleEl = document.getElementById('mHeaderTitle');
  if (titleEl) titleEl.textContent = isToday ? 'Today' : 'Timeblock';
  const progEl = document.getElementById('mProgress');
  if (progEl) progEl.style.display = isToday ? '' : 'none';
  // Adjust mMain padding for TB (no horizontal padding needed)
  document.getElementById('mMain').style.padding = isToday ? '12px 16px' : '0';
  if (!isToday) { mRenderTB(); _mScrollNow(); }
}

// ── Timeblock constants ───────────────────────────────────────────────────────
const M_TB_START = 6 * 60;   // 6am in minutes
const M_TB_END   = 22 * 60;  // 10pm in minutes
const M_PX       = 1.5;      // px per minute (90px per hour)

// ── Timeblock rendering ───────────────────────────────────────────────────────
function mRenderTB() {
  mRenderUnassigned();
  mRenderTimeline();
}

function mRenderUnassigned() {
  const bar = document.getElementById('mUnassignedBar');
  if (!bar) return;
  const ds = d2s(getDayDate(0));
  const todayRegular = mGetTodayTasks().filter(t => !t._virtual && !t._type && !t.done);
  const blockedIds = new Set((st.blocks || []).filter(b => b.ds === ds && b.taskId).map(b => String(b.taskId)));
  const unassigned = todayRegular.filter(t => !blockedIds.has(String(t.id)));

  if (!unassigned.length) {
    bar.innerHTML = '<span class="m-chip-empty">No unassigned tasks</span>';
    return;
  }
  bar.innerHTML = unassigned.map(t => {
    const s = gc(t.category || '');
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
    const y  = (m - M_TB_START) * M_PX;
    const h  = m / 60;
    const lbl = h === 12 ? '12pm' : h > 12 ? (h - 12) + 'pm' : h + 'am';
    hrs.push(`<div style="position:absolute;top:${y}px;left:0;right:0;display:flex;align-items:center;pointer-events:none">
      <span style="font-size:10px;color:var(--sub);width:40px;padding-right:6px;text-align:right;flex-shrink:0;line-height:1;margin-top:-7px">${lbl}</span>
      <div style="flex:1;border-top:1px solid var(--border)"></div>
    </div>`);
  }
  labels.innerHTML = hrs.join('');

  // Today's blocks
  const ds = d2s(getDayDate(0));
  const todayBlocks = (st.blocks || []).filter(b => b.ds === ds).sort((a, b) => a.sm - b.sm);
  const blockHtml = todayBlocks.map(b => {
    const y   = (b.sm - M_TB_START) * M_PX;
    const h   = Math.max(b.dur * M_PX, 28);
    const s   = gc(b.cat || '');
    const smH = Math.floor(b.sm / 60);
    const smM = b.sm % 60;
    const timeLbl = `${smH > 12 ? smH - 12 : smH}:${String(smM).padStart(2, '0')}${smH >= 12 ? 'pm' : 'am'}`;
    return `<div class="m-tl-block" style="top:${y}px;height:${h}px;background:${s.bg};border-left:3px solid ${s.d};color:${s.t}" onclick="event.stopPropagation();mOpenBlockEdit('${b.id}')">
      <div style="overflow:hidden;flex:1">
        <div style="font-size:11px;color:${s.d};font-weight:500;margin-bottom:1px">${timeLbl}</div>
        <div class="m-tl-block-name" style="color:${s.t}">${escHtml(b.title || '')}</div>
      </div>
    </div>`;
  }).join('');

  // Now line
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowHtml = (nowMin >= M_TB_START && nowMin <= M_TB_END)
    ? `<div class="m-tl-now" style="top:${(nowMin - M_TB_START) * M_PX}px"></div>`
    : '';

  col.innerHTML = blockHtml + nowHtml;

  // Tap to create block
  col.onclick = e => {
    if (e.target.closest('.m-tl-block')) return;
    const rect   = col.getBoundingClientRect();
    const rawMin = Math.round((e.clientY - rect.top) / M_PX) + M_TB_START;
    const snapMin = Math.round(rawMin / 15) * 15;
    const sm = Math.max(M_TB_START, Math.min(M_TB_END - 30, snapMin));
    mOpenNewBlock(sm);
  };
}

function _mScrollNow() {
  const scroll = document.getElementById('mTLScroll');
  if (!scroll) return;
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin >= M_TB_START && nowMin <= M_TB_END) {
    const y = (nowMin - M_TB_START) * M_PX;
    setTimeout(() => { scroll.scrollTop = Math.max(0, y - 120); }, 50);
  }
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

  // Pre-fill from selected chip
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
  const ds  = d2s(getDayDate(0));
  const cat = _mBlockCat;

  if (_mEditBlockId) {
    const b = (st.blocks || []).find(x => String(x.id) === _mEditBlockId);
    if (!b) { mCloseBlock(); return; }
    b.title = name; b.sm = sm; b.dur = _mBlockDur; b.cat = cat;
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
  mInitSwipe();
  mInitPTR();
  const authed = await checkAuth();
  if (!authed) return;
  hideLoginOverlay();
  await syncAll();
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}

document.addEventListener('DOMContentLoaded', mInit);
