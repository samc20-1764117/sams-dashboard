// mobile-overview.js
// If old cached HTML is loaded (no inline _BUILD), redirect to cache-busted URL
if(!window._BUILD&&!sessionStorage._mBust){sessionStorage._mBust='1';location.href='/mobile.html?_='+Date.now();}
window._mobileMode = true;

// ── Login overlay ─────────────────────────────────────────────────────────────
let _mLoggedIn = false;
function showLoginOverlay(event) {
  // On mobile, ignore transient null-session events during token refresh
  // Only show login if we were never logged in, or on explicit SIGNED_OUT
  if (_mLoggedIn && event !== 'SIGNED_OUT') return;
  document.getElementById('mLogin').style.display = 'flex';
  document.getElementById('mApp').classList.remove('ready');
  setTimeout(() => document.getElementById('mEmail') && document.getElementById('mEmail').focus(), 100);
}
function hideLoginOverlay() {
  _mLoggedIn = true;
  document.getElementById('mLogin').style.display = 'none';
  document.getElementById('mApp').classList.add('ready');
}

// ── Desktop render stubs ──────────────────────────────────────────────────────
function renderAll() {
  mRenderToday();
  if (_mCurTab === 'tb') mRenderTB();
  if (_mCurTab === 'week') mRenderWeek();
  if (_mCurTab === 'month') _mRenderMonthWeeks(false);
  if (_mCurTab === 'shop') mRenderShop();
  if (document.getElementById('mMealsSheet')?.classList.contains('open')) mRenderMeals();
  if (document.getElementById('mFullListSheet')?.classList.contains('open')) mRenderFullList();
}
function renderToday() { mRenderToday(); }
function renderWkCal() {}
function renderWkSummary() {}
function renderRecOv() {}
function renderUnassigned() {}
function renderShopOv() { if (_mCurTab === 'shop') mRenderShop(); }
function renderKanban() {}
function renderSummaryMetrics() {}
function renderWeeklyPage() {}
function renderBdayPage() {}
function renderShopFull() { if (_mCurTab === 'shop') mRenderShop(); }
function renderDayTB() {}
function setBadge() {}
function renderPupSkillsHighlight() {}
function renderDailyHabits() {}
function updateOvBanner() {}
// Snackbar undo/redo (modern contextual pattern): every pushUndo shows a pill above
// the nav with an UNDO action; undoing offers REDO the same way. No permanent buttons.
function _mSnack(msg, btnLabel, btnFn) {
  let el = document.getElementById('mSnack');
  if (!el) { el = document.createElement('div'); el.id = 'mSnack'; document.body.appendChild(el); }
  window._mSnackAction = btnFn;
  el.innerHTML = `<span>${escHtml(msg)}</span>` + (btnLabel ? `<button onclick="document.getElementById('mSnack').classList.remove('show');(_mSnackAction||function(){})()">${btnLabel}</button>` : '');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 5000);
}
function _showUndoToast(msg) { _mSnack(msg || 'Done', 'UNDO', () => mUndo()); }
function _showRedoToast() {}

// Reload button: tap = reload, hold (~1.5s) = undo last action (works past the snackbar window)
let _mReloadLP = null, _mReloadDidLP = false;
function mReloadTap() {
  if (_mReloadDidLP) { _mReloadDidLP = false; return; } // click after a long-press: swallow
  location.reload(true);
}
document.addEventListener('touchstart', e => {
  const b = e.target.closest('.m-reload-btn');
  if (!b) return;
  _mReloadDidLP = false;
  _mReloadLP = setTimeout(() => {
    _mReloadLP = null;
    _mReloadDidLP = true;
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch(x) {} }
    mUndo();
  }, 1500);
}, {passive: true});
['touchend', 'touchmove', 'touchcancel'].forEach(ev => document.addEventListener(ev, () => {
  if (_mReloadLP) { clearTimeout(_mReloadLP); _mReloadLP = null; }
}, {passive: true}));
function selTask() {}
function showCtx() {}
function showWrRuleCtx() {}
function showCtxShop() {}
function showWrScopePicker() {}
function openWrEditModal() {}
function tiDblRec() {}
function tiDblShop(e, id) { if (id) mOpenShopEdit(id); }
function openWOModal() {}
function dStart() {}
function dEnd() {}

// ── Mobile video step tasks (no localStorage dependency) ─────────────────────
const _M_VID_STEP_LABELS = {step_build:'Build', step_vo:'VO', step_cut:'Cut', step_thumbnail:'Th', step_description:'Des'};
const _M_VID_STEPS = ['step_build','step_vo','step_cut','step_thumbnail','step_description'];

function _mReconstructVidStepBlocks() {
  // Match blocks to video steps by title (mobile equivalent of desktop _vidStepReconstructBlocks)
  (st.blocks || []).filter(bl => !bl._vidStepVid && bl.cat === 'Videos' && !bl._vidId).forEach(bl => {
    (st.videos || []).forEach(v => {
      if (v.is_deleted) return;
      _M_VID_STEPS.forEach(step => {
        const lbl = (_M_VID_STEP_LABELS[step] || step.replace('step_','')) + ': ' + (v.topic || v.title);
        if (bl.title === lbl) { bl._vidStepVid = String(v.id); bl._vidStepName = step; }
      });
    });
  });
}

// Day map synced from desktop via client_kv table (core.js _kvSyncMaps)
function _mVidStepMap() { try { return JSON.parse(localStorage._vidStepDayMap || '{}'); } catch(e) { return {}; } }
function _mVidDayMap() { try { return JSON.parse(localStorage._vidDayMap || '{}'); } catch(e) { return {}; } }
function _mVidStepMapSet(m) { localStorage._vidStepDayMap = JSON.stringify(m); }

// Done state for one step instance on one day (mirrors desktop _vidStepComputeDone)
function _mVidStepDone(vidId, step, ds, entry) {
  if (step !== 'step_thumbnail' && step !== 'step_description') {
    const dayBlocks = (st.blocks || []).filter(bl => String(bl._vidStepVid) === String(vidId) && bl._vidStepName === step && bl.ds === ds);
    if (dayBlocks.length) return dayBlocks.every(bl => bl._done);
    const e = entry || _mVidStepMap()[vidId + '::' + step];
    return !!(e && e.doneDays && e.doneDays[ds]);
  }
  return !!(entry && entry.done);
}

function _mVidStepTasksForDay(ds) {
  // Mirrors desktop: daymap entries (primary + extraDays) + blocks not covered by the map.
  // When ds is today, also pulls overdue (past, undone) instances — like desktop's WithOverdue.
  _mReconstructVidStepBlocks();
  const today = d2s(getDayDate(0));
  const isToday = ds === today;
  const m = _mVidStepMap();
  const tasks = []; const seen = new Set();
  const push = (vidId, step, day, isDone) => {
    const v = (st.videos || []).find(x => String(x.id) === String(vidId) && !x.is_deleted);
    if (!v || v[step] === 'na') return;
    const done = v[step] === 'done' || isDone;
    const label = _M_VID_STEP_LABELS[step] || step.replace('step_','');
    tasks.push({id: 'vidstep-' + vidId + '-' + step + '-' + day, name: label + ': ' + (v.topic || v.title), category: 'Videos', due_date: day, done, _vidId: vidId, _vidStep: step, _virtual: true, _type: 'vidstep'});
  };
  // 1. Daymap instances
  Object.entries(m).forEach(([key, val]) => {
    const [vidId, step] = key.split('::');
    const consider = (day, entry) => {
      const dk = key + '::' + day;
      if (seen.has(dk)) return;
      const v = (st.videos || []).find(x => String(x.id) === String(vidId) && !x.is_deleted);
      if (!v) return;
      const isDone = v[step] === 'done' || _mVidStepDone(vidId, step, day, entry);
      if (isToday) { if (day > today) return; if (isDone && day < today) return; } // overdue carry, hide done-past
      else if (day !== ds) return;
      seen.add(dk);
      push(vidId, step, day, isDone);
    };
    consider(val.ds, val);
    (val.extraDays || []).forEach(ed => consider(ed, null));
  });
  // 2. Blocks on this day (or ≤ today when today) not covered by the map
  (st.blocks || []).filter(bl => bl._vidStepVid && bl._vidStepName && (isToday ? bl.ds <= ds : bl.ds === ds)).forEach(bl => {
    const dk = bl._vidStepVid + '::' + bl._vidStepName + '::' + bl.ds;
    if (seen.has(dk)) return;
    const v = (st.videos || []).find(x => String(x.id) === String(bl._vidStepVid) && !x.is_deleted);
    if (!v) return;
    const isDone = v[bl._vidStepName] === 'done' || _mVidStepDone(bl._vidStepVid, bl._vidStepName, bl.ds, m[bl._vidStepVid + '::' + bl._vidStepName]);
    if (isToday && isDone && bl.ds < ds) return;
    seen.add(dk);
    push(bl._vidStepVid, bl._vidStepName, bl.ds, isDone);
  });
  return tasks;
}

// ── Mobile video step toggle ─────────────────────────────────────────────────
function mToggleVidStep(vidId, step, checked, forDay) {
  const v = (st.videos || []).find(x => String(x.id) === String(vidId) && !x.is_deleted);
  if (!v) return;
  if (step === 'step_thumbnail' || step === 'step_description') {
    // Thumbnail & Description: toggle the actual video stage field
    v[step] = checked ? 'done' : 'not_started';
    save();
    sbReqSilent('PATCH', 'videos', {[step]: v[step]}, `?id=eq.${v.id}`);
    // Also sync any linked timeblock block + daymap done flag
    const stBlk = (st.blocks || []).find(bl => String(bl._vidStepVid) === String(vidId) && bl._vidStepName === step);
    if (stBlk) { stBlk._done = checked; sbUpdateBlock(stBlk.id, {done: checked}); }
    const m = _mVidStepMap(); const e = m[vidId + '::' + step];
    if (e) { e.done = checked; _mVidStepMapSet(m); }
  } else {
    // Build/VO/Cut: toggle blocks for the tapped day (or all if no day given)
    const all = (st.blocks || []).filter(bl => String(bl._vidStepVid) === String(vidId) && bl._vidStepName === step);
    const dayBlocks = forDay ? all.filter(bl => bl.ds === forDay) : all;
    if (dayBlocks.length) {
      dayBlocks.forEach(bl => { bl._done = checked; sbUpdateBlock(bl.id, {done: checked}); });
    } else if (forDay) {
      // Calendar-only instance (no block): per-day done lives in the synced daymap
      const m = _mVidStepMap(); const key = vidId + '::' + step; const e = m[key];
      if (e) {
        if (!e.doneDays) e.doneDays = {};
        if (checked) e.doneDays[forDay] = true; else delete e.doneDays[forDay];
        if (!Object.keys(e.doneDays).length) delete e.doneDays;
        _mVidStepMapSet(m);
      }
    }
    // Stage-level done flag: all blocks done
    const m2 = _mVidStepMap(); const e2 = m2[vidId + '::' + step];
    if (e2) { e2.done = all.length > 0 && all.every(bl => bl._done); _mVidStepMapSet(m2); }
    save();
  }
  renderAll();
}

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
  save(); renderAll();  // renderAll (not just Today) so the Week tab refreshes live too
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
// Match desktop sort: birthday, done last, travel, overdue, important, timeblock order, then type priority
function _mTaskTypePri(t) {
  if (t._type === 'birthday' || t._type === 'holiday') return 1;
  const cat = (t.category || '').toLowerCase();
  if (cat === 'home') return 2;
  if (cat === 'my work') return 3;
  if (cat === 'work') return 4;
  if (cat === 'social') return 5;
  if (t._type === 'vid') return 5.5;
  if (t._type === 'vidstep') return 5.6;
  if (t._type === 'fin-cancel') return 6.5;
  if (t._type === 'shop') return 7;
  if (t._type === 'pup') return 8;
  if (t._isWrec || t._isWrRule) return 9;
  if (t._virtual) return 6;
  return 5;
}
function mSortToday(tasks) {
  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();
  return mSortDayTasks(tasks, ds);
}
// Shared day sort — exact port of desktop sortTasksForDay (used by Today, Week, Month)
function mSortDayTasks(tasks, ds) {
  const blks = (st.blocks || []).filter(b => b.ds === ds);
  function tbSm(t) {
    let b = null;
    if (t._type === 'pup' && t._pupSessId) b = blks.find(x => String(x._pupSessId) === String(t._pupSessId));
    else if (t._type === 'vidstep') b = blks.find(x => String(x._vidStepVid) === String(t._vidId) && x._vidStepName === t._vidStep);
    else if (t._vidId) b = blks.find(x => String(x._vidId) === String(t._vidId));
    else if (t._shopId) b = blks.find(x => String(x.shopId) === String(t._shopId));
    else if (t._ruleId) b = blks.find(x => String(x.ruleId) === String(t._ruleId) || String(x.recId) === String(t._ruleId));
    else if (t._recId) b = blks.find(x => String(x.recId) === String(t._recId));
    else if (!t._virtual) b = blks.find(x => String(x.taskId) === String(t.id));
    return b ? b.sm : null;
  }
  return [...tasks].sort((a, b) => {
    const aB = a._type === 'birthday' || a._type === 'holiday', bB = b._type === 'birthday' || b._type === 'holiday';
    if (aB && !bB) return -1; if (!aB && bB) return 1;
    if (a.done && !b.done) return 1; if (!a.done && b.done) return -1;
    const aT = a._type === 'travel' && !a.done, bT = b._type === 'travel' && !b.done;
    if (aT && !bT) return -1; if (!aT && bT) return 1;
    const aO = isOv(a.due_date) && !a.done, bO = isOv(b.due_date) && !b.done;
    if (aO && !bO) return -1; if (!aO && bO) return 1;
    const aI = (a.important || a._type === 'fin-cancel') && !a.done, bI = (b.important || b._type === 'fin-cancel') && !b.done;
    if (aI && !bI) return -1; if (!aI && bI) return 1;
    const aSm = tbSm(a), bSm = tbSm(b);
    if (aSm !== null && bSm === null) return -1;
    if (aSm === null && bSm !== null) return 1;
    if (aSm !== null && bSm !== null) return aSm - bSm;
    return _mTaskTypePri(a) - _mTaskTypePri(b) || (a.name || '').localeCompare(b.name || '');
  });
}

// ── Gather today's tasks ──────────────────────────────────────────────────────
function mGetTodayTasks() {
  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();

  const ts = st.tasks.filter(t => {
    if (!t.due_date || t.category === 'Weekly Goals') return false;
    const tds = t.due_date.split('T')[0];
    if (tds === ds) return true;
    if (_mTodayOffset === 0 && isOv(t.due_date) && !t.done) return true;
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
      // Match desktop dedup exactly: same recId+wkKey = same instance; different wkKey
      // (e.g. a moved/carried occurrence) = a separate instance, not collapsed together.
      const _dedupKey = v._recId + '::' + (v._wkKey || '');
      const existing = allRecVirt.findIndex(x => (x._recId + '::' + (x._wkKey || '')) === _dedupKey);
      if (existing >= 0) {
        const ev = allRecVirt[existing];
        const evFuture = !isOv(ev.due_date) && !ev.done;
        const vFuture = !isOv(v.due_date) && !v.done;
        if (vFuture && !evFuture) allRecVirt[existing] = v;
      } else {
        allRecVirt.push(v);
      }
    });
  }

  // WR recurring — 4-week lookback, matching desktop exactly: the override value must
  // still be within/after the current week (>= getWkKey(0)) and not skip/move-overridden,
  // otherwise a stale past-week override falsely reads as overdue.
  const _wrecSeen = new Set();
  const wrecToday = [];
  for (let _w = 0; _w >= -4; _w--) {
    const _wkKey = getWkKey(_w);
    st.recurring
      .filter(r =>
        (r.is_weekly_reset === true || r.is_weekly_reset === 'true') &&
        r._dateOverrides && r._dateOverrides[_wkKey] &&
        r._dateOverrides[_wkKey] !== '__skip__' &&
        !(st.wrOverrides || []).some(o => String(o.rule_id) === String(r.id) && o.wk_key === _wkKey && (o.override_type === 'skip' || o.override_type === 'move')) &&
        (r._dateOverrides[_wkKey] === ds || (_mTodayOffset === 0 && r._dateOverrides[_wkKey] < ds && r._dateOverrides[_wkKey] >= getWkKey(0) && !(r._doneByWk && r._doneByWk[_wkKey]))) &&
        !_wrecSeen.has(r.id + '::' + _wkKey)
      )
      .forEach(r => {
        _wrecSeen.add(r.id + '::' + _wkKey);
        const _isDone = !!(r._doneByWk && r._doneByWk[_wkKey]);
        wrecToday.push({id: 'rec-virt-' + r.id, name: r.name, category: 'Recurring', due_date: r._dateOverrides[_wkKey], done: _isDone, important: !!r.important, _recId: r.id, _virtual: true, _wkKey: _wkKey, _isWrec: true});
      });
  }

  // WR rules — same 4-week lookback + stale-override guard as WR recurring above
  const _wrRulesSeen = new Set();
  const wrRulesToday = [];
  for (let _w = 0; _w >= -4; _w--) {
    const _wkKey = getWkKey(_w);
    st.wrRules
      .filter(r =>
        r._dateOverrides && r._dateOverrides[_wkKey] &&
        r._dateOverrides[_wkKey] !== '__skip__' &&
        !(st.wrOverrides || []).some(o => String(o.rule_id) === String(r.id) && o.wk_key === _wkKey && (o.override_type === 'skip' || o.override_type === 'move')) &&
        (r._dateOverrides[_wkKey] === ds || (_mTodayOffset === 0 && r._dateOverrides[_wkKey] < ds && r._dateOverrides[_wkKey] >= getWkKey(0) && !isDoneWRRule(r.id, _wkKey))) &&
        !_wrRulesSeen.has(r.id + '::' + _wkKey)
      )
      .forEach(r => {
        _wrRulesSeen.add(r.id + '::' + _wkKey);
        const _isDone = isDoneWRRule(r.id, _wkKey);
        wrRulesToday.push({id: 'wrrule-virt-' + r.id, name: r.name, category: 'Recurring', due_date: r._dateOverrides[_wkKey], done: _isDone, important: !!r.important, _ruleId: r.id, _virtual: true, _wkKey: _wkKey, _isWrRule: true});
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

  // Video step tasks — only steps with blocks on this day (matches desktop _vidStepDayMap)
  const vidStepToday = _mVidStepTasksForDay(ds);

  // Video tasks — day-map assignment (synced via client_kv) or a direct _vidId block on this day
  const _vdmT = _mVidDayMap();
  const _vidOnTB = new Set((st.blocks || []).filter(b => b.ds === ds && b._vidId).map(b => String(b._vidId)));
  const vidToday = (st.videos || []).filter(v => {
    if (v.is_deleted || v.status === 'published') return false;
    if (_vdmT[String(v.id)] === ds) return true;
    if (_vidOnTB.has(String(v.id))) return true;
    return false;
  }).map(v => ({id: 'vid-ov-' + v.id, name: v.topic || v.title, category: 'Videos', due_date: ds, done: false, _vidId: v.id, _virtual: true, _type: 'vid'}));

  // Subscription-cancel reminders (features.js)
  const finCancelToday = typeof _finCancelTasksForDate === 'function' ? _finCancelTasksForDate(ds).filter(t => t.due_date === ds || (_mTodayOffset === 0 && isOv(t.due_date) && !t.done)) : [];

  const all = [
    ...ts,
    ...allRecVirt.filter(v => v.due_date === ds || (_mTodayOffset === 0 && isOv(v.due_date) && !v.done)),
    ...wrecToday,
    ...wrRulesToday,
    ...shopToday,
    ...pupSessToday,
    ...vidToday,
    ...vidStepToday,
    ...finCancelToday,
    ...getExtrasForDate(ds)
  ];
  // Dedup by id AND by name (prevents same task from multiple sources)
  const seenId = new Set();
  const seenName = new Set();
  const deduped = all.filter(t => {
    const idKey = String(t.id);
    if (seenId.has(idKey)) return false;
    seenId.add(idKey);
    // Also dedup by name to catch same task from different sources (e.g. regular task + WR rule)
    const nameKey = (t.name || '').toLowerCase().trim();
    if (nameKey && seenName.has(nameKey)) return false;
    seenName.add(nameKey);
    return true;
  });
  return mSortToday(deduped);
}

// ── Task row ──────────────────────────────────────────────────────────────────
function mTaskRow(t) {
  const noCheck = t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday';
  const ov = !noCheck && isOv(t.due_date) && !t.done;
  const catKey = t._isWrRule || t._isWrec ? 'weekly_reset' : t._type === 'shop' ? 'shopping' : t._type === 'travel' ? 'travel' : t._type === 'birthday' ? 'birthday' : t._type === 'holiday' ? 'holiday' : (t.category || '');
  const s = ov ? OV : (t.important && !t.done) ? IMP : gc(catKey);
  const canEdit = !t._virtual && !t._type;

  let onchange = '';
  if (t._isWrRule) onchange = `togWrRule('${t._ruleId}',this.checked,'${t._wkKey}')`;
  else if (t._isWrec) onchange = `togRec('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._virtual && t._recId) onchange = `togRecVirt('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._type === 'vidstep') onchange = `mToggleVidStep('${t._vidId}','${t._vidStep}',this.checked,'${t.due_date}')`;
  else if (t._type === 'vid') onchange = `toggleTask('${t.id}',this.checked)`;
  else if (t._type === 'shop') onchange = `togShop('${t._shopId}',this.checked)`;
  else if (t._type === 'pup') onchange = `togPupSessionDone('${t._pupSessId}',this.checked)`;
  else if (t._type === 'fin-cancel') onchange = `togFinCancelDone('${t._subId}',this.checked);renderAll()`;
  else if (!t._virtual) onchange = `toggleTask('${t.id}',this.checked)`;

  const safeName = escHtml(t.name || '');
  const dot = `<span class="m-cat-dot" style="background:${s.bg};border:1.5px solid ${s.d};flex-shrink:0;width:10px;height:10px;border-radius:50%;display:inline-block"></span>`;
  // Overdue regular/shopping tasks get a one-tap reschedule to today
  const canMv = ov && (canEdit || t._type === 'shop');
  const mvBtn = canMv ? `<button class="m-mv-today" onclick="event.stopPropagation();mMoveToToday('${t._type === 'shop' ? t._shopId : t.id}','${t._type === 'shop' ? 'shop' : 'task'}')">→ Today</button>` : '';

  const inner = `<div class="m-row${t.done ? ' m-done' : ''}${ov ? ' m-ov' : ''}">
    ${noCheck
      ? `<span class="m-row-icon">${t._type === 'holiday' ? '' : '📅'}</span>`
      : `<label class="m-chk-wrap"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="${onchange}"></label>`
    }
    <span class="m-row-name${t.done ? ' done' : ''}">${safeName}</span>
    ${mvBtn}${dot}
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
  if (progEl && _mCurTab === 'today') {
    progEl.textContent = doneCount + '/' + sorted.length;
    progEl.classList.toggle('m-prog-complete', sorted.length > 0 && doneCount === sorted.length);
  }
  const el = document.getElementById('mTodayList');
  if (!el) return;
  el.innerHTML = sorted.length ? sorted.map(mTaskRow).join('') : '<div class="m-empty">All done ✓</div>';
  _mUpdateTodayHeader();
  _mInitTodaySwipe();
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
  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();
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

// When a task moves to a new day, carry its undone schedule blocks along (they're
// stale on the old day otherwise — e.g. moved task still showing on yesterday's TB)
function _mMoveTaskBlocks(taskId, fromDs, toDs) {
  if (!fromDs || !toDs || fromDs === toDs) return;
  (st.blocks || []).filter(b => String(b.taskId) === String(taskId) && !b._done && b.ds === fromDs).forEach(b => {
    b.ds = toDs;
    sbUpdateBlock(b.id, {day_date: toDs});
  });
}

// Overdue → Today button on the today list
function mMoveToToday(id, type) {
  const today = d2s(getDayDate(0));
  if (type === 'shop') {
    const s = st.shopping.find(x => String(x.id) === String(id));
    if (!s) return;
    const prev = s.due_date;
    s.due_date = today;
    save();
    sbReq('PATCH', 'shopping_list', {due_date: today}, `?id=eq.${id}`);
    pushUndo(() => { const s2 = st.shopping.find(x => String(x.id) === String(id)); if (s2) s2.due_date = prev; save(); renderAll(); sbReq('PATCH', 'shopping_list', {due_date: prev}, `?id=eq.${id}`); }, 'Moved to today');
  } else {
    const t = st.tasks.find(x => String(x.id) === String(id));
    if (!t) return;
    const from = (t.due_date || '').split('T')[0];
    t.due_date = today;
    _mMoveTaskBlocks(id, from, today);
    save();
    sbReq('PATCH', 'tasks', {due_date: today}, `?id=eq.${id}`);
    pushUndo(() => { const t2 = st.tasks.find(x => String(x.id) === String(id)); if (t2) { t2.due_date = from; _mMoveTaskBlocks(id, today, from); } save(); renderAll(); sbReq('PATCH', 'tasks', {due_date: from}, `?id=eq.${id}`); }, 'Moved to today');
  }
  renderAll();
}

// ── Undo / redo (core.js stacks; shared toggles + instrumented mobile actions) ──
function mUndo() {
  if (!undoStack.length) { showToast('Nothing to undo', '#6b6880', 1200); return; }
  const label = undoStack[undoStack.length - 1].msg || 'last action';
  doUndo();
  renderAll();
  _mSnack('Undid: ' + label, null, null);
}
async function mRedo() {
  if (!redoStack.length) { showToast('Nothing to redo', '#6b6880', 1200); return; }
  await doRedo();
  renderAll();
  _mSnack('Redone', 'UNDO', () => mUndo());
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
  const _prevDue = (t.due_date || '').split('T')[0];
  t.name = name;
  t.category = category;
  t.due_date = due_date;
  t.important = important;
  if (due_date) _mMoveTaskBlocks(id, _prevDue, due_date.split('T')[0]);
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
  if (btn) btn.classList.toggle('flagged', _mFullAddImportant);
}

function mOpenFullAdd() {
  _mFullAddImportant = false;
  document.getElementById('mFullAddName').value = '';
  document.getElementById('mFullAddDue').value = d2s(getDayDate(0));
  mSelectCat('fulladd', 'Home');
  const btn = document.getElementById('mFullAddImpBtn');
  if (btn) btn.classList.remove('flagged');
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

// ── Today day offset & swiping ───────────────────────────────────────────────
let _mTodayOffset = 0;

function _mTodayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + _mTodayOffset);
  return d2s(d);
}

function _mUpdateTodayHeader() {
  if (_mCurTab !== 'today') return;
  const titleEl = document.getElementById('mHeaderTitle');
  const dateLbl = document.getElementById('mDateLbl');
  if (_mTodayOffset === 0) {
    if (titleEl) titleEl.textContent = 'Today';
    if (dateLbl) dateLbl.textContent = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  } else {
    const d = new Date();
    d.setDate(d.getDate() + _mTodayOffset);
    if (titleEl) titleEl.textContent = d.toLocaleDateString('en-US', {weekday: 'long'});
    if (dateLbl) dateLbl.textContent = d.toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
  }
}

function _mInitTodaySwipe() {
  const page = document.getElementById('mTodayPage');
  if (!page || page._swipeInited) return;
  page._swipeInited = true;
  let startX = 0, startY = 0, swiping = false;
  page.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiping = true;
  }, {passive: true});
  page.addEventListener('touchend', e => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      _mTodayOffset += dx < 0 ? 1 : -1;
      mRenderToday();
      _mUpdateTodayHeader();
    }
  }, {passive: true});
}

// ── Tab switching ─────────────────────────────────────────────────────────────
let _mCurTab = 'today';

function mShowTab(tab) {
  _mCurTab = tab;
  try { localStorage._mLastTab = tab; } catch(e) {}
  // Quick crossfade so the header/list swap reads as a transition instead of an
  // instant jump-cut. Fade out now, render everything as usual, then fade back in
  // once the new content is already in the DOM (next frame).
  const _mainFade = document.getElementById('mMain');
  if (_mainFade) _mainFade.style.opacity = '0';
  // tb is reachable only via the Timeblock button on Today's header now (no bottom nav
  // slot of its own), but it's still a real page like any other.
  const pages = {today: 'mTodayPage', tb: 'mTBPage', week: 'mWeekPage', month: 'mMonthPage', shop: 'mShopPage', extras: 'mExtrasPage', recipes: 'mRecipesPage'};
  Object.entries(pages).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === tab ? '' : 'none';
  });
  const isToday = tab === 'today';
  const isShop = tab === 'shop';
  const isSimplePage = isToday || isShop || tab === 'recipes';
  document.getElementById('mAddBar').style.display = isToday ? '' : 'none';
  const shopBar = document.getElementById('mShopAddBar');
  if (shopBar) shopBar.style.display = isShop ? '' : 'none';
  // The add bars are position:fixed, floating above content — #mApp's own padding only
  // ever needs to clear the fixed nav. List clearance for the fixed add bar itself is
  // measured and applied directly to the list in mSyncBarClearance() below.
  document.getElementById('mApp').style.paddingBottom = 'calc(52px + env(safe-area-inset-bottom))';
  // No nav button lights up for tb — it's opened from Today's header, not the bottom nav.
  document.querySelectorAll('.m-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'today' && i === 0) || (tab === 'week' && i === 1) || (tab === 'month' && i === 2) || (tab === 'shop' && i === 3) || (tab === 'extras' && i === 4));
  });
  const titles = {today: 'Today', tb: 'Timeblock', week: 'Week', month: 'Month', shop: 'Shop', extras: 'More', recipes: 'Recipes'};
  const titleEl = document.getElementById('mHeaderTitle');
  if (titleEl) titleEl.textContent = titles[tab] || '';
  const progEl = document.getElementById('mProgress');
  if (progEl) progEl.style.display = isToday ? '' : 'none';
  const tbBtn = document.getElementById('mTodayTBBtn');
  if (tbBtn) tbBtn.style.display = isToday ? '' : 'none';
  // Date subtitle always shows, same height everywhere. Today's own swipe (offset)
  // logic owns the text on the Today tab; every other tab always shows today's real date.
  const dateLbl = document.getElementById('mDateLbl');
  if (dateLbl) {
    dateLbl.style.visibility = 'visible';
    if (tab !== 'today') dateLbl.textContent = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  }
  const shopBtns = document.getElementById('mShopHeaderBtns');
  if (shopBtns) shopBtns.style.display = isShop ? '' : 'none';
  const main = document.getElementById('mMain');
  main.style.padding = isSimplePage ? '12px 16px' : '0';
  main.style.overflow = (tab === 'week' || tab === 'tb' || tab === 'month') ? 'hidden' : '';
  main.scrollTop = 0;

  if (tab === 'tb')   { _mTBOffset = 0; mRenderTB(); _mScrollNow(); }
  else if (tab === 'week') { mRenderWeek(true); mInitWeekScroll(); }
  else if (tab === 'month') { mOpenMonth(); }
  else if (tab === 'shop') { mRenderShop(); }
  else if (tab === 'recipes') { _mRenderRecipesBrowse(); }
  else if (tab === 'today') { _mTodayOffset = 0; _mSetDate(); }

  if (isToday || isShop) mSyncBarClearance(isToday ? 'mAddBar' : 'mShopAddBar', isToday ? 'mTodayList' : 'mShopList');

  // tb/week/month scroll themselves into position asynchronously (double-rAF, sometimes
  // a retry loop) after rendering. Fading back in on the very next frame reveals that
  // jump in progress — hold the fade until the scroll has had a chance to settle.
  if (_mainFade) {
    if (tab === 'tb' || tab === 'week' || tab === 'month') setTimeout(() => { _mainFade.style.opacity = '1'; }, 90);
    else requestAnimationFrame(() => { _mainFade.style.opacity = '1'; });
  }
}

// Measures the (fixed-position) add bar's real rendered height and applies it as the
// matching list's padding-bottom, so the last row is never hidden behind it — exact,
// not guessed, and correct even if the bar's own height ever changes.
function mSyncBarClearance(barId, listId) {
  requestAnimationFrame(() => {
    const bar = document.getElementById(barId);
    const list = document.getElementById(listId);
    if (!bar || !list) return;
    const h = bar.offsetHeight;
    // Bar sits at bottom:calc(52px + safe-area) — its own height stacks on top of that,
    // so the list needs both plus a small buffer to fully clear it.
    if (h > 0) list.style.paddingBottom = `calc(${h + 52 + 24}px + env(safe-area-inset-bottom))`;
  });
}

// ── Timeblock constants ───────────────────────────────────────────────────────
const M_TB_START = 5 * 60;   // 5am (full range, scrollable)
const M_TB_END   = 23 * 60;  // 11pm
const M_PX       = 0.8;      // px per minute → 48px per hour
const M_TB_DEFAULT_SCROLL = 6 * 60 + 30; // default scroll to 6:30am

// Compute side-by-side layout for overlapping blocks
function _mComputeOverlap(blocks) {
  const sorted = [...blocks].sort((a, b) => a.sm - b.sm || (b.dur - a.dur));
  const colEnds = [];
  sorted.forEach(b => {
    let placed = false;
    for (let i = 0; i < colEnds.length; i++) {
      if (b.sm >= colEnds[i]) { colEnds[i] = b.sm + b.dur; b._col = i; placed = true; break; }
    }
    if (!placed) { b._col = colEnds.length; colEnds.push(b.sm + b.dur); }
  });
  sorted.forEach(b => {
    let maxCol = 0;
    sorted.forEach(b2 => { if (b2.sm < b.sm + b.dur && b2.sm + b2.dur > b.sm) maxCol = Math.max(maxCol, b2._col); });
    b._ncols = maxCol + 1;
  });
}

function _mTStr(m) {
  const h = Math.floor(m / 60), mn = m % 60;
  const hd = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const suf = h >= 12 ? 'pm' : 'am';
  return `${hd}:${String(mn).padStart(2, '0')}${suf}`;
}

let _mTBOffset = 0; // day offset (0=today, -1=yesterday, +1=tomorrow)

// ── Timeblock rendering ───────────────────────────────────────────────────────
function mRenderTB() {
  mRenderUnassigned();
  mRenderTimeline();
}

function mRenderUnassigned() {
  const bar = document.getElementById('mUnassignedBar');
  if (!bar) return;
  const ds = d2s(getDayDate(_mTBOffset));
  const isToday = _mTBOffset === 0;
  // Regular tasks due this day (include overdue if viewing today)
  const dayTasks = st.tasks.filter(t => {
    if (!t.due_date || t.done || t.category === 'Weekly Goals') return false;
    const tds = t.due_date.split('T')[0];
    if (tds === ds) return true;
    if (isToday && isOv(t.due_date)) return true;
    return false;
  });
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

  // Shopping items due this day
  const shopUnassigned = (st.shopping || []).filter(s => {
    if (!s.due_date || s.done) return false;
    if (s.due_date === ds) return true;
    if (isToday && isOv(s.due_date)) return true;
    return false;
  }).filter(s => !(st.blocks || []).some(b => b.ds === ds && String(b.shopId) === String(s.id)));

  const allUnassigned = [
    ...unassigned.map(t => ({ id: t.id, name: t.name, category: t.category || '' })),
    ...recUnassigned.map(v => ({ id: 'rec-' + v._recId, name: v.name, category: v.category || '' })),
    ...shopUnassigned.map(s => ({ id: 'shop-' + s.id, name: s.name, category: 'Shopping' }))
  ];

  // Date label + chips + refresh all in one row
  const d = getDayDate(_mTBOffset);
  const prefix = _mTBOffset === 0 ? 'Today' : _mTBOffset === -1 ? 'Yesterday' : _mTBOffset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', {weekday: 'long'});
  const subDate = d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  const datePart = `<div class="m-tb-date-lbl">${prefix}<div class="m-tb-date-sub">${subDate}</div></div>`;
  const chips = allUnassigned.map(t => {
    const s = gc(t.category || '');
    const sel = _mSelectedChipId === String(t.id);
    return `<button class="m-chip${sel ? ' selected' : ''}" onclick="mSelectChip('${t.id}')" data-cid="${t.id}" data-cname="${escHtml(t.name)}" data-ccat="${escHtml(t.category || '')}" style="--cdot:${s.bg};--cborder:${s.d}">${escHtml(t.name)}</button>`;
  }).join('');
  // Chips scroll in their own container so undo/redo/reload stay pinned at the right edge
  const refreshBtn = `<button class="m-reload-btn" onclick="mReloadTap()" title="Reload app (hold to undo)" style="flex-shrink:0;margin-left:auto">↻</button>`;
  bar.innerHTML = datePart + `<div id="mChipScroll">${chips}</div>` + refreshBtn;
  mInitChipDrag();
}

// ── Long-press drag an unassigned chip onto the timeline → creates a 30-min block ──
function mInitChipDrag() {
  const bar = document.getElementById('mUnassignedBar');
  if (!bar || bar._chipDragInited) return;
  bar._chipDragInited = true;
  let timer = null, drag = null, ghost = null, sx = 0, sy = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const onMove = e => {
    if (!drag) return;
    e.preventDefault();
    const t = e.touches[0];
    ghost.style.left = t.clientX + 'px';
    ghost.style.top = (t.clientY - 44) + 'px';
    // Live drop indicator: show the snapped 30-min slot on the timeline under the finger
    const col = document.getElementById('mTLCol');
    if (!col) return;
    const rect = col.getBoundingClientRect();
    let ind = document.getElementById('mDropInd');
    if (t.clientY >= rect.top && t.clientY <= rect.bottom && t.clientX >= rect.left - 40 && t.clientX <= rect.right) {
      if (!ind) { ind = document.createElement('div'); ind.id = 'mDropInd'; col.appendChild(ind); }
      let sm = M_TB_START + (t.clientY - rect.top) / M_PX;
      sm = Math.max(M_TB_START, Math.min(M_TB_END - 30, Math.round(sm / 15) * 15));
      ind.style.top = ((sm - M_TB_START) * M_PX) + 'px';
      ind.style.height = (30 * M_PX) + 'px';
      ind.style.display = 'flex';
      ind.textContent = _mTStr(sm);
    } else if (ind) ind.style.display = 'none';
  };
  const cleanup = () => {
    cancel();
    if (ghost) { ghost.remove(); ghost = null; }
    const ind = document.getElementById('mDropInd');
    if (ind) ind.remove();
    document.removeEventListener('touchmove', onMove);
    drag = null;
  };
  bar.addEventListener('touchstart', e => {
    const chip = e.target.closest('.m-chip');
    if (!chip) return;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    timer = setTimeout(() => {
      timer = null;
      drag = {id: chip.dataset.cid, name: chip.dataset.cname, cat: chip.dataset.ccat || 'Home'};
      ghost = document.createElement('div');
      ghost.className = 'm-chip m-chip-ghost';
      ghost.textContent = drag.name;
      document.body.appendChild(ghost);
      ghost.style.left = sx + 'px'; ghost.style.top = (sy - 44) + 'px';
      document.addEventListener('touchmove', onMove, {passive: false});
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch(x) {} }
    }, 480);
  }, {passive: true});
  bar.addEventListener('touchmove', e => {
    if (drag) return;
    const t = e.touches[0];
    // Finger moved before long-press fired → user is scrolling the chip row, not dragging
    if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) cancel();
  }, {passive: true});
  bar.addEventListener('touchcancel', cleanup, {passive: true});
  bar.addEventListener('touchend', async e => {
    if (!drag) { cancel(); return; }
    const t = e.changedTouches[0];
    const d = drag; cleanup();
    const col = document.getElementById('mTLCol');
    if (!col) return;
    const rect = col.getBoundingClientRect();
    if (t.clientY < rect.top || t.clientY > rect.bottom || t.clientX < rect.left - 40 || t.clientX > rect.right) return; // dropped outside timeline
    let sm = M_TB_START + (t.clientY - rect.top) / M_PX;
    sm = Math.max(M_TB_START, Math.min(M_TB_END - 30, Math.round(sm / 15) * 15));
    let taskId = null, recId = null, shopId = null;
    const cid = String(d.id);
    if (cid.startsWith('rec-')) recId = cid.replace('rec-', '');
    else if (cid.startsWith('shop-')) shopId = cid.replace('shop-', '');
    else taskId = cid;
    const b = {id: 'lb-' + Date.now(), title: d.name, ds: d2s(getDayDate(_mTBOffset)), sm, dur: 30, cat: d.cat, taskId, recId, shopId, _done: false};
    if (!st.blocks) st.blocks = [];
    st.blocks.push(b);
    _mSelectedChipId = null;
    save(); mRenderTB();
    pushUndo(() => { st.blocks = (st.blocks || []).filter(x => String(x.id) !== String(b.id)); save(); mRenderTB(); sbDeleteBlock(b.id); }, 'Scheduled task');
    await sbSaveBlock(b);
  }, {passive: true});
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
  const firstHour = Math.ceil(M_TB_START / 60) * 60;
  for (let m = firstHour; m <= M_TB_END; m += 60) {
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

  // Collect ALL blocks (regular + auto + recurring auto) for unified overlap layout
  const ds = d2s(getDayDate(_mTBOffset));
  const allItems = [];

  // Regular saved blocks
  (st.blocks || []).filter(b => b.ds === ds).forEach(b => {
    const linkedTask = b.taskId ? st.tasks.find(x => String(x.id) === String(b.taskId)) : null;
    const linkedRec = b.recId ? (st.recurring.find(x => String(x.id) === String(b.recId)) || (st.wrRules || []).find(x => String(x.id) === String(b.recId))) : null;
    const linkedShop = b.shopId ? st.shopping.find(x => String(x.id) === String(b.shopId)) : null;
    const _wrRuleId = b.ruleId || (b.recId && (st.wrRules || []).some(x => String(x.id) === String(b.recId)) ? b.recId : null);
    if (linkedTask) b._done = !!linkedTask.done;
    else if (_wrRuleId) b._done = isDoneWRRule(_wrRuleId, dsToWkKey(b.ds));
    else if (linkedRec && linkedRec._doneByWk) b._done = !!linkedRec._doneByWk[dsToWkKey(b.ds)];
    else if (linkedShop) b._done = !!linkedShop.done;
    const displayName = (linkedTask && linkedTask.name) || (linkedRec && linkedRec.name) || (linkedShop && linkedShop.name) || b.title;
    const s = gc(b.cat || '');
    allItems.push({sm: b.sm, dur: b.dur, type: 'block', bid: b.id, done: b._done, name: displayName, s, _b: b});
  });

  // Auto blocks — respect each block's days list (0=Sun..6=Sat), like desktop getAutoTBForDate
  if (cfg.showAutoTB) {
    const dow = new Date(ds + 'T00:00:00').getDay();
    (st.autoTimeblocks || []).filter(a => a.is_enabled).forEach(a => {
      const days = a.days ? a.days.split(',').map(Number) : null;
      if (days) { if (!days.includes(dow)) return; }
      else { if (dow < 1 || dow > 5) return; } // legacy weekday-only
      const ov = (st.autoTBOverrides || []).find(o => String(o.base_id) === String(a.id) && o.date === ds);
      if (ov && (ov.start_time === null || ov.start_time === undefined)) return;
      const startTime = ov ? ov.start_time : a.start_time;
      const endTime = ov ? ov.end_time : a.end_time;
      const [sh, sm2] = (startTime || '00:00').split(':');
      const [eh, em] = (endTime || '00:30').split(':');
      const startMin = parseInt(sh) * 60 + parseInt(sm2 || 0);
      const endMin = parseInt(eh) * 60 + parseInt(em || 0);
      const dur = Math.max(15, endMin - startMin);
      allItems.push({sm: startMin, dur, type: 'auto', name: a.label, cls: 'm-auto-block'});
    });
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
    allItems.push({sm: startMin, dur, type: 'recauto', name: v.name, cls: 'm-rec-auto-block'});
  });

  // Compute overlap for ALL items together
  _mComputeOverlap(allItems);

  let html = allItems.map(item => {
    const y = (item.sm - M_TB_START) * M_PX;
    const hPx = Math.max(item.dur * M_PX, item.type === 'block' ? 24 : 28) - 2;
    const ncols = item._ncols || 1;
    const colI = item._col || 0;
    const colW = 100 / ncols;
    const left = colI * colW;
    const posStyle = ncols > 1
      ? `top:${y}px;height:${hPx}px;left:calc(${left}% + 2px);right:calc(${100 - left - colW}% + 2px)`
      : `top:${y}px;height:${hPx}px`;
    const timeRange = `${_mTStr(item.sm)}\u2013${_mTStr(item.sm + item.dur)}`;

    if (item.type === 'block') {
      const doneClass = item.done ? ' m-done-block' : '';
      return `<div class="m-tl-block${doneClass}" data-bid="${item.bid}" style="${posStyle};background:${item.s.bg};border:1px solid rgba(255,255,255,.55);border-left:3px solid ${item.s.d}">
        <input type="checkbox" class="m-tb-chk" data-bid="${item.bid}" ${item.done ? 'checked' : ''}>
        <div style="overflow:hidden;flex:1;min-width:0;pointer-events:none">
          <div class="m-tl-block-name" style="color:${item.s.t}">${escHtml(item.name || '')}</div>
        </div>
        ${ncols <= 1 ? `<span class="m-tl-block-time" style="color:${item.s.t};pointer-events:none">${timeRange}</span>` : ''}
        <div class="m-tb-resize" data-bid="${item.bid}"></div>
      </div>`;
    } else {
      return `<div class="m-tl-block ${item.cls}" style="${posStyle}">
        <div style="overflow:hidden;flex:1;min-width:0;pointer-events:none">
          <div class="m-tl-block-name">${escHtml(item.name || '')}</div>
        </div>
        ${ncols <= 1 ? `<span class="m-tl-block-time" style="pointer-events:none">${timeRange}</span>` : ''}
      </div>`;
    }
  }).join('');

  col.innerHTML = html;

  // Wire up checkbox handlers
  col.querySelectorAll('.m-tb-chk').forEach(chk => {
    chk.addEventListener('change', e => {
      e.stopPropagation();
      const bid = chk.dataset.bid;
      const b = (st.blocks || []).find(x => String(x.id) === String(bid));
      if (!b) return;
      const checked = chk.checked;
      b._done = checked;
      const blockEl = chk.closest('.m-tl-block');
      if (blockEl) blockEl.classList.toggle('m-done-block', checked);
      sbUpdateBlock(b.id, {done: checked});
      if (b.taskId) {
        toggleTask(b.taskId, checked, 'tb');
      } else if (b.ruleId || (st.wrRules || []).some(x => String(x.id) === String(b.recId))) {
        togWrRule(String(b.ruleId || b.recId), checked, dsToWkKey(b.ds));
      } else if (b.recId) {
        const _lr = st.recurring.find(x => String(x.id) === String(b.recId));
        const _isWr = _lr && (_lr.is_weekly_reset === true || _lr.is_weekly_reset === 'true');
        const _bwk = dsToWkKey(b.ds);
        if (_isWr) togRec(String(b.recId), checked, _bwk);
        else togRecVirt(String(b.recId), checked, _bwk);
      } else if (b.shopId) {
        togShop(String(b.shopId), checked);
      } else {
        save();
      }
    });
  });

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
    if (e.target.closest('.m-tb-chk')) return;
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
  const y = (M_TB_DEFAULT_SCROLL - M_TB_START) * M_PX;
  // Double rAF ensures layout is complete before scrolling
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scroll.scrollTop = Math.max(0, y);
    });
  });
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
  let _mResize    = null; // {el, b, origDur, startY} — bottom-handle duration drag

  col.addEventListener('touchstart', e => {
    // Bottom resize handle: starts immediately (no long-press)
    const rz = e.target.closest('.m-tb-resize');
    if (rz) {
      const b = (st.blocks || []).find(x => String(x.id) === rz.dataset.bid);
      if (!b) return;
      _mResize = {el: rz.closest('.m-tl-block'), b, origDur: b.dur, startY: e.touches[0].clientY};
      const scrl = document.getElementById('mTLScroll');
      if (scrl) scrl.style.overflowY = 'hidden';
      return;
    }
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
    if (_mResize) {
      const dy = e.touches[0].clientY - _mResize.startY;
      let dur = Math.round((_mResize.origDur + dy / M_PX) / 15) * 15;
      dur = Math.max(15, Math.min(M_TB_END - _mResize.b.sm, dur));
      _mResize.b.dur = dur;
      _mResize.el.style.height = Math.max(dur * M_PX, 28) + 'px';
      return;
    }
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
    if (_mResize) {
      const {b, origDur} = _mResize;
      _mResize = null;
      const scrl = document.getElementById('mTLScroll');
      if (scrl) scrl.style.overflowY = '';
      _mDragJustEnded = true;
      setTimeout(() => { _mDragJustEnded = false; }, 300);
      if (b.dur !== origDur) {
        save();
        mRenderTimeline();
        sbUpdateBlock(b.id, {duration_minutes: b.dur});
        const _newDur = b.dur;
        pushUndo(() => { const b2 = (st.blocks || []).find(x => String(x.id) === String(b.id)); if (b2) b2.dur = origDur; save(); mRenderTB(); sbUpdateBlock(b.id, {duration_minutes: origDur}); }, 'Resized block');
      }
      return;
    }
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
  _mSelectedChipId = String(taskId);
  mRenderUnassigned();
  // Immediately open block creation at current time (or next 15-min slot)
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const snapMin = Math.round(nowMin / 15) * 15;
  const sm = Math.max(M_TB_START, Math.min(M_TB_END - 30, snapMin));
  mOpenNewBlock(sm);
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
    const chipId = _mSelectedChipId;
    let chipName = '', chipCat = 'Home';
    if (chipId.startsWith('rec-')) {
      const recId = chipId.replace('rec-', '');
      const r = st.recurring.find(x => String(x.id) === recId);
      if (r) { chipName = r.name || ''; chipCat = r.category || 'Recurring'; }
    } else if (chipId.startsWith('shop-')) {
      const shopId = chipId.replace('shop-', '');
      const s = st.shopping.find(x => String(x.id) === shopId);
      if (s) { chipName = s.name || ''; chipCat = 'Shopping'; }
    } else {
      const t = st.tasks.find(x => String(x.id) === chipId);
      if (t) { chipName = t.name || ''; chipCat = t.category || 'Home'; }
    }
    document.getElementById('mBlockName').value = chipName;
    mSelectCat('block', chipCat);
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
    let taskId = null, recId = null, shopId = null;
    if (_mSelectedChipId) {
      const cid = _mSelectedChipId;
      if (cid.startsWith('rec-')) recId = cid.replace('rec-', '');
      else if (cid.startsWith('shop-')) shopId = cid.replace('shop-', '');
      else taskId = cid;
    }
    const b = {id: 'lb-' + Date.now(), title: name, ds, sm, dur: _mBlockDur, cat, taskId, recId, shopId, _done: false};
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

function _mWkGetWeekOff(ds) {
  const d = new Date(ds + 'T12:00:00');
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const dDow = (d.getDay() + 6) % 7;
  const tDow = (today.getDay() + 6) % 7;
  const dMon = new Date(d); dMon.setDate(d.getDate() - dDow);
  const tMon = new Date(today); tMon.setDate(today.getDate() - tDow);
  return Math.round((dMon - tMon) / (7 * 86400000));
}

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

  // WR recurring + WR rules pinned to this date (current + past 4 weeks — overdue moved forward), like desktop week
  const wrecDay = []; const _wrecSeen = new Set();
  const wrRulesDay = []; const _wrRuleSeen = new Set();
  for (let pw = weekOff; pw >= weekOff - 4; pw--) {
    const pwk = getWkKey(pw);
    (st.recurring || []).filter(r => (r.is_weekly_reset === true || r.is_weekly_reset === 'true') && r._dateOverrides && r._dateOverrides[pwk] === ds && !_wrecSeen.has(String(r.id))).forEach(r => {
      _wrecSeen.add(String(r.id));
      const done = !!(r._doneByWk && r._doneByWk[pwk]);
      wrecDay.push({id: 'rec-virt-' + r.id, name: r.name, category: 'Recurring', due_date: ds, done, important: !!r.important, _recId: r.id, _virtual: true, _wkKey: pwk, _isWrec: true});
    });
    (st.wrRules || []).filter(r => r._dateOverrides && r._dateOverrides[pwk] === ds && !_wrRuleSeen.has(String(r.id)) && !(st.wrOverrides || []).some(o => String(o.rule_id) === String(r.id) && o.wk_key === pwk && o.override_type === 'skip')).forEach(r => {
      _wrRuleSeen.add(String(r.id));
      wrRulesDay.push({id: 'wrrule-virt-' + r.id, name: r.name, category: 'Recurring', due_date: ds, done: isDoneWRRule(r.id, pwk), important: !!r.important, _ruleId: r.id, _virtual: true, _wkKey: pwk, _isWrRule: true});
    });
  }

  // Pup skill sessions on this date, like desktop week
  const pupDay = (st.pupSessions || []).filter(s => s.day_date === ds).map(s => {
    const skill = (st.pup_skills || []).find(x => String(x.id) === String(s.skill_id));
    if (!skill) return null;
    return {id: 'pup-sess-' + s.id, name: (skill.pup ? skill.pup + ': ' : '') + skill.skill, category: 'Recurring', due_date: ds, done: !!s.done, _pupSessId: s.id, _skillId: s.skill_id, _virtual: true, _type: 'pup'};
  }).filter(Boolean);

  // Subscription-cancel reminders (features.js)
  const finDay = typeof _finCancelTasksForDate === 'function' ? _finCancelTasksForDate(ds) : [];

  const shopItems = st.shopping
    .filter(s => !s.done && s.due_date && (s.due_date === ds || (isToday && isOv(s.due_date))))
    .map(s => ({id: 'shop-' + s.id, name: s.name, category: 'Shopping', due_date: s.due_date, done: false, _shopId: s.id, _virtual: true, _type: 'shop'}));

  // Video step tasks — only steps with blocks on this day
  const vidStepItems = _mVidStepTasksForDay(ds);

  // Video tasks — day-map assignment (synced via client_kv) or direct _vidId blocks on this day
  const _vdmW = _mVidDayMap();
  const _vidOnTBDay = new Set((st.blocks || []).filter(b => b.ds === ds && b._vidId).map(b => String(b._vidId)));
  const isPast = !isToday && ds < today;
  const vidForDay = (st.videos || []).filter(v => {
    if (v.is_deleted || v.status === 'published') return false;
    if (_vdmW[String(v.id)] === ds) return true;
    if (_vidOnTBDay.has(String(v.id))) return true;
    return false;
  }).map(v => ({id: 'vid-' + v.id, name: v.topic || v.title, category: 'Videos', due_date: ds, done: v.status === 'published', _vidId: v.id, _virtual: true, _type: 'vid'}))
  .filter(v => !(isPast && !v.done)); // Skip undone video tasks on past days

  // Extras (travel, birthdays)
  const extras = getExtrasForDate(ds);

  const all = [...regular, ...recVirt, ...wrecDay, ...wrRulesDay, ...pupDay, ...finDay, ...shopItems, ...vidForDay, ...vidStepItems, ...extras];
  // Dedup by id and name
  const seenId = new Set();
  const seenName = new Set();
  const deduped = all.filter(t => {
    const idKey = String(t.id);
    if (seenId.has(idKey)) return false;
    seenId.add(idKey);
    const nameKey = (t.name || '').toLowerCase().trim();
    if (nameKey && seenName.has(nameKey)) return false;
    seenName.add(nameKey);
    return true;
  });
  return mSortDayTasks(deduped, ds); // same ordering rules as desktop week (travel/birthday top, overdue, important, TB time, type)
}

function mWkTaskRow(t) {
  // Trips: full-width tinted banner row — no emoji, no checkbox, clearly not a checkable task
  if (t._type === 'travel') {
    const ts = gc(t.category || 'Travel');
    return `<div class="m-wk-row m-wk-travel" style="background:${ts.bg};border-left:3px solid ${ts.d}">
      <span class="m-wk-task-name" style="color:${ts.t};font-weight:600">${escHtml(t.name || '')}</span>
    </div>`;
  }
  const noCheck = t._type === 'birthday' || t._type === 'holiday';
  const ov      = !noCheck && isOv(t.due_date) && !t.done;
  const catKey  = t._type === 'shop' ? 'shopping' : t._type === 'vid' || t._type === 'vidstep' ? 'Videos' : (t._isWrRule || t._isWrec) ? 'weekly_reset' : (t._virtual && t._recId) ? 'recurring' : (t.category || '');
  const s       = ov ? OV : (t.important && !t.done) ? IMP : gc(catKey);
  const canDrag = !t._virtual && !t._type;

  let onchange = '';
  if (t._type === 'shop')          onchange = `togShop('${t._shopId}',this.checked)`;
  else if (t._type === 'vidstep')  onchange = `mToggleVidStep('${t._vidId}','${t._vidStep}',this.checked,'${t.due_date}')`;
  else if (t._type === 'vid')      onchange = `toggleTask('${t.id}',this.checked)`;
  else if (t._isWrRule)            onchange = `togWrRule('${t._ruleId}',this.checked,'${t._wkKey}')`;
  else if (t._virtual && t._recId) onchange = `togRecVirt('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._type === 'pup')      onchange = `togPupSessionDone('${t._pupSessId}',this.checked)`;
  else if (t._type === 'fin-cancel') onchange = `togFinCancelDone('${t._subId}',this.checked);renderAll()`;
  else if (!t._virtual && !noCheck) onchange = `toggleTask('${t.id}',this.checked)`;

  const dot = `<span style="width:8px;height:8px;border-radius:50%;background:${s.bg};border:1.5px solid ${s.d};flex-shrink:0;display:inline-block"></span>`;
  const chk = noCheck
    ? `<span style="width:22px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">${t._type === 'holiday' ? '' : '\u{1F4C5}'}</span>`
    : `<label class="m-wk-chk-wrap"><input type="checkbox" class="m-wk-chk"${t.done ? ' checked' : ''}${onchange ? ` onchange="${onchange}"` : ''}></label>`;

  const dragAttrs = canDrag ? ` data-tid="${t.id}" data-tname="${escHtml(t.name || '')}"` : '';

  return `<div class="m-wk-row${t.done ? ' m-wk-done' : ''}${ov ? ' m-ov' : ''}"${dragAttrs}>
    ${chk}
    <span class="m-wk-task-name${t.done ? ' done' : ''}" style="${ov ? 'color:#dc2626' : ''}">${escHtml(t.name || '')}</span>
    ${dot}
  </div>`;
}

// Week infinite scroll state
let _mWkRenderedLo = 0;  // lowest week offset rendered
let _mWkRenderedHi = 0;  // highest week offset rendered
let _mWkScrollLock = false;

function _mWkLabel(off) {
  if (off === 0) return 'This Week';
  if (off === -1) return 'Last Week';
  if (off === 1) return 'Next Week';
  const dates = getWkDates(off);
  return dates[0].toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' – ' + dates[6].toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

function _mWkRenderWeekHtml(weekOff) {
  const dates = getWkDates(weekOff);
  const today = d2s(getDayDate(0));
  const isCurrent = weekOff === 0;
  let html = `<div class="m-wk-divider${isCurrent ? ' is-current' : ''}" data-wk="${weekOff}">${_mWkLabel(weekOff)}</div>`;

  dates.forEach((d, i) => {
    const ds = d2s(d);
    const isToday = ds === today;
    const isPast = !isToday && ds < today;
    const dateStr = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    const tasks = mGetDayTasks(ds, weekOff);
    // Birthdays & trips have no checkbox; once their day has passed they're effectively complete,
    // so count them as done on past days (otherwise the per-day done/total ratio reads low).
    const doneC = tasks.filter(t => t.done || (isPast && (t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday'))).length;

    html += `<div class="m-wk-day${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}" data-ds="${ds}">
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
      ${tasks.length ? tasks.map(mWkTaskRow).join('') : '<div class="m-wk-empty">\u2014</div>'}
    </div>`;
  });
  return html;
}

// The element that actually scrolls the week view. The layout doesn't always bound
// #mWeekPage, so the whole document scrolls instead — detect which one is real.
function _mWkScroller() {
  const page = document.getElementById('mWeekPage');
  if (page && page.scrollHeight - page.clientHeight > 5) return page;
  return document.scrollingElement || document.documentElement;
}

// Scroll the week list so today sits at the top. Works whether #mWeekPage scrolls
// or the document scrolls, and retries until the layout has settled (otherwise the
// position gets clamped to 0 = last week).
function _mWkScrollToToday(attempt = 0) {
  const list = document.getElementById('mWeekList');
  if (!list) return;
  const todayEl = list.querySelector('.m-wk-day.is-today');
  if (!todayEl) return;
  const sc = _mWkScroller();
  // Not scrollable yet (height not resolved) — wait and retry
  if (sc.scrollHeight - sc.clientHeight < 5 && attempt < 25) {
    return setTimeout(() => _mWkScrollToToday(attempt + 1), 40);
  }
  const isDoc = sc === document.scrollingElement || sc === document.documentElement;
  const scTop = isDoc ? 0 : sc.getBoundingClientRect().top;
  // Offset for a sticky/fixed app header that overlaps the top (only when the doc scrolls)
  const hdr = document.getElementById('mHeader');
  const headerH = (isDoc && hdr && hdr.offsetParent !== null && getComputedStyle(hdr).position !== 'static') ? hdr.offsetHeight : 0;
  const target = Math.max(0, sc.scrollTop + (todayEl.getBoundingClientRect().top - scTop - headerH));
  _mWkScrollLock = true;
  sc.scrollTop = target;
  setTimeout(() => { _mWkScrollLock = false; }, 120);
  // If it got clamped / didn't take, try again
  if (Math.abs(sc.scrollTop - target) > 4 && attempt < 25) {
    setTimeout(() => _mWkScrollToToday(attempt + 1), 40);
  }
}

function mRenderWeek(reset = false) {
  const list = document.getElementById('mWeekList');
  if (!list) return;
  const prevScroll = _mWkScroller().scrollTop;

  // Only reset to the default range on explicit open; background re-renders (sync)
  // keep the user's loaded range and scroll position instead of yanking to today.
  if (reset) { _mWkRenderedLo = -1; _mWkRenderedHi = 1; }
  let html = '';
  for (let w = _mWkRenderedLo; w <= _mWkRenderedHi; w++) {
    html += _mWkRenderWeekHtml(w);
  }
  list.innerHTML = html;

  if (reset) {
    requestAnimationFrame(() => requestAnimationFrame(() => _mWkScrollToToday()));
  } else {
    _mWkScroller().scrollTop = prevScroll;
  }
}

function _mWkLoadMore(direction) {
  if (_mWkScrollLock) return;
  _mWkScrollLock = true;
  const list = document.getElementById('mWeekList');
  if (!list) { _mWkScrollLock = false; return; }

  if (direction === 'up') {
    _mWkRenderedLo--;
    const html = _mWkRenderWeekHtml(_mWkRenderedLo);
    const sc = _mWkScroller();
    const prevHeight = list.scrollHeight;
    list.insertAdjacentHTML('afterbegin', html);
    // Maintain scroll position so the view doesn't jump when prepending a week
    sc.scrollTop += list.scrollHeight - prevHeight;
  } else {
    _mWkRenderedHi++;
    list.insertAdjacentHTML('beforeend', _mWkRenderWeekHtml(_mWkRenderedHi));
  }
  setTimeout(() => { _mWkScrollLock = false; }, 200);
}

function mInitWeekScroll() {
  if (window._weekScrollInited) return;
  window._weekScrollInited = true;
  const onScroll = () => {
    if (_mWkScrollLock || _mCurTab !== 'week') return;
    const sc = _mWkScroller();
    const threshold = 300;
    if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < threshold) _mWkLoadMore('down');
    if (sc.scrollTop < threshold) _mWkLoadMore('up');
  };
  // Listen on both: #mWeekPage when it scrolls, and window when the document scrolls
  const page = document.getElementById('mWeekPage');
  if (page) page.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('scroll', onScroll, {passive: true});
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
  // Re-render just the current day in the week list
  const dayEl = document.querySelector(`.m-wk-day[data-ds="${ds}"]`);
  if (dayEl) {
    const weekOff = _mWkGetWeekOff(ds);
    const tasks = mGetDayTasks(ds, weekOff);
    const _isPastDay = ds < d2s(getDayDate(0));
    const doneC = tasks.filter(t => t.done || (_isPastDay && (t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday'))).length;
    const dateObj = new Date(ds + 'T12:00:00');
    const dayIdx = (dateObj.getDay() + 6) % 7;
    dayEl.innerHTML = `<div class="m-wk-hd">
      <div class="m-wk-hd-left">
        <span class="m-wk-dname">${_WK_DAYS[dayIdx]}</span>
        <span class="m-wk-ddate">${dateObj.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
        ${ds === d2s(getDayDate(0)) ? '<span class="m-wk-today-dot"></span>' : ''}
      </div>
      <div class="m-wk-hd-right">
        ${tasks.length ? `<span class="m-wk-cnt">${doneC}/${tasks.length}</span>` : ''}
        <button class="m-wk-add" onclick="mWkAddTask('${ds}')">+</button>
      </div>
    </div>
    ${tasks.length ? tasks.map(mWkTaskRow).join('') : '<div class="m-wk-empty">\u2014</div>'}`;
  } else {
    mRenderWeek();
  }
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

  // Auto-scroll #mWeekPage when near top/bottom edges
  const scrollEl = document.getElementById('mWeekPage');
  if (scrollEl) {
    const mr = scrollEl.getBoundingClientRect();
    const EDGE = 80, SPEED = 8;
    if (touch.clientY > mr.bottom - EDGE)      scrollEl.scrollTop += SPEED;
    else if (touch.clientY < mr.top + EDGE)    scrollEl.scrollTop -= SPEED;
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
        const _prevDue = (t.due_date || '').split('T')[0];
        const _newDs = currentTargetDs;
        t.due_date = _newDs;
        _mMoveTaskBlocks(tid, _prevDue, _newDs);
        save();
        mRenderWeek();
        pushUndo(() => { const t2 = st.tasks.find(x => String(x.id) === String(tid)); if (t2) { t2.due_date = _prevDue; _mMoveTaskBlocks(tid, _newDs, _prevDue); } save(); renderAll(); sbReq('PATCH', 'tasks', {due_date: _prevDue}, `?id=eq.${tid}`); }, 'Moved task');
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
  const showErr = m => { if (err) { err.textContent = m; err.style.display = 'block'; } };
  try {
    if (!_sbClient) _initSbClient();
    if (!_sbClient || !window.supabase) { showErr('Login library not loaded — check connection, then close & reopen the app.'); return; }
    const {data, error} = await _sbClient.auth.signInWithPassword({email, password: pass});
    if (error) { showErr(error.message); return; }
    if (!data || !data.session) { showErr('No session returned. Try again.'); return; }
    _authToken = data.session.access_token;
    hideLoginOverlay();
    await syncAll();
  } catch (e) {
    showErr('Login error: ' + (e && e.message ? e.message : String(e)));
  }
}

// ── Date label ────────────────────────────────────────────────────────────────
function _mSetDate() {
  const lbl = document.getElementById('mDateLbl');
  if (lbl) lbl.textContent = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
}

// ── Shop tab ──────────────────────────────────────────────────────────────────
function mRenderShop() {
  const list = document.getElementById('mShopList');
  if (!list) return;
  const todo = (st.shopping || []).filter(s => !s.done);

  // Group by store
  const groups = {};
  todo.forEach(s => {
    const k = s.store || 'Other';
    if (!groups[k]) groups[k] = [];
    groups[k].push(s);
  });
  // Sort items within each store by shop_order
  Object.values(groups).forEach(arr => arr.sort((a, b) => (a.shop_order ?? 9999) - (b.shop_order ?? 9999)));

  list.innerHTML = '';
  const storeNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  storeNames.forEach(store => {
    const hd = document.createElement('div');
    hd.className = 'm-shop-store-hd';
    hd.textContent = store;
    list.appendChild(hd);

    groups[store].forEach(s => {
      const row = document.createElement('div');
      row.className = 'm-shop-item';
      row.dataset.shopId = s.id;
      row.dataset.store = store;

      const chk = document.createElement('input');
      chk.type = 'checkbox'; chk.className = 'chk';
      chk.addEventListener('change', () => togShop(s.id, chk.checked));

      const name = document.createElement('span');
      name.className = 'm-shop-name';
      name.textContent = s.name;

      const dueLbl = document.createElement('span');
      dueLbl.className = 'm-shop-due-lbl';
      if (s.due_date) {
        const d = new Date(s.due_date + 'T00:00:00');
        dueLbl.textContent = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      }

      const del = document.createElement('button');
      del.className = 'm-shop-del'; del.textContent = '\u2715';
      del.addEventListener('click', e => { e.stopPropagation(); mDeleteShopDirect(s.id); });

      row.appendChild(chk); row.appendChild(name); row.appendChild(dueLbl); row.appendChild(del);

      // Tap to edit
      row.addEventListener('click', e => {
        if (e.target.closest('.chk') || e.target.closest('.m-shop-del')) return;
        mOpenShopEdit(s.id);
      });

      // Touch drag reorder within store
      _mShopTouchDrag(row, store);

      list.appendChild(row);
    });
  });
}

// Touch drag reorder within a store group
function _mShopTouchDrag(row, store) {
  let startY = 0, dragging = false, ph = null, scrollStart = 0;
  row.addEventListener('touchstart', e => {
    if (e.target.closest('.chk') || e.target.closest('.m-shop-del')) return;
    startY = e.touches[0].clientY;
    scrollStart = document.getElementById('mMain').scrollTop;
    dragging = false;
  }, {passive: true});

  row.addEventListener('touchmove', e => {
    const dy = Math.abs(e.touches[0].clientY - startY);
    const scrollDelta = Math.abs(document.getElementById('mMain').scrollTop - scrollStart);
    if (!dragging && dy < 12) return;
    if (!dragging && scrollDelta > 5) return; // scrolling, not dragging
    if (!dragging) {
      dragging = true;
      row.classList.add('m-shop-dragging');
      ph = document.createElement('div');
      ph.className = 'm-shop-drag-ph';
    }
    e.preventDefault();
    const list = document.getElementById('mShopList');
    const y = e.touches[0].clientY;
    const siblings = [...list.querySelectorAll(`.m-shop-item[data-store="${store}"]`)].filter(r => r !== row);
    let inserted = false;
    for (const sib of siblings) {
      const rc = sib.getBoundingClientRect();
      if (y < rc.top + rc.height / 2) { list.insertBefore(ph, sib); inserted = true; break; }
    }
    if (!inserted && siblings.length) siblings[siblings.length - 1].after(ph);
    else if (!inserted) {
      // Find store header and insert after it
      const headers = [...list.querySelectorAll('.m-shop-store-hd')];
      const hd = headers.find(h => h.textContent === store);
      if (hd) hd.after(ph);
    }
  }, {passive: false});

  row.addEventListener('touchend', () => {
    if (!dragging) return;
    row.classList.remove('m-shop-dragging');
    if (ph && ph.parentNode) {
      ph.parentNode.insertBefore(row, ph);
      ph.remove();
      // Update shop_order for this store group
      const list = document.getElementById('mShopList');
      const rows = [...list.querySelectorAll(`.m-shop-item[data-store="${store}"]`)];
      rows.forEach((r, i) => {
        const id = r.dataset.shopId;
        const item = st.shopping.find(x => String(x.id) === String(id));
        if (item) {
          item.shop_order = i;
          sbReqSilent('PATCH', 'shopping_list', {shop_order: i}, `?id=eq.${id}`);
        }
      });
      save();
    }
    ph = null; dragging = false;
  });
}

// Add shop item
async function mAddShopItem() {
  const nameEl = document.getElementById('mShopNewName');
  const storeEl = document.getElementById('mShopNewStore');
  const n = nameEl.value.trim();
  if (!n) return;
  const store = storeEl.value || 'Other';
  const s = {id: 'l-' + Date.now(), name: n, store, done: false};
  st.shopping.push(s);
  save(); mRenderShop();
  nameEl.value = '';
  const sv = await sbReq('POST', 'shopping_list', {name: n, store, done: false});
  if (sv && sv[0]) {
    const i = st.shopping.findIndex(x => x.id === s.id);
    if (i > -1) st.shopping[i] = sv[0];
    save();
  }
}

// Delete shop item directly (X button)
async function mDeleteShopDirect(id) {
  const s = st.shopping.find(x => String(x.id) === String(id));
  if (!s) return;
  st.shopping = st.shopping.filter(x => String(x.id) !== String(id));
  save(); mRenderShop();
  await sbReq('DELETE', 'shopping_list', null, `?id=eq.${id}`);
}

// Shop edit sheet
let _mShopEditId = null;
function mOpenShopEdit(id) {
  const s = st.shopping.find(x => String(x.id) === String(id));
  if (!s) return;
  _mShopEditId = String(id);
  document.getElementById('mShopEditName').value = s.name || '';
  document.getElementById('mShopEditStore').value = s.store || 'Other';
  document.getElementById('mShopEditDue').value = s.due_date || '';
  document.getElementById('mShopEditTime').value = s.default_start_time || '';
  document.getElementById('mShopEditBackdrop').classList.add('open');
  document.getElementById('mShopEditSheet').classList.add('open');
  setTimeout(() => document.getElementById('mShopEditName').focus(), 300);
}

function mCloseShopEdit() {
  _mShopEditId = null;
  document.getElementById('mShopEditBackdrop').classList.remove('open');
  document.getElementById('mShopEditSheet').classList.remove('open');
}

async function mSaveShopEdit() {
  if (!_mShopEditId) return;
  const s = st.shopping.find(x => String(x.id) === String(_mShopEditId));
  if (!s) return;
  const name = document.getElementById('mShopEditName').value.trim();
  if (!name) return;
  const store = document.getElementById('mShopEditStore').value || s.store;
  const due_date = document.getElementById('mShopEditDue').value || null;
  const time = document.getElementById('mShopEditTime').value || null;
  const id = _mShopEditId;
  s.name = name; s.store = store; s.due_date = due_date; s.default_start_time = time;
  save(); mCloseShopEdit(); mRenderShop(); mRenderToday();
  const patch = {name, store, due_date};
  if (time !== null) patch.default_start_time = time;
  await sbReq('PATCH', 'shopping_list', patch, `?id=eq.${id}`);
}

async function mDeleteShopItem() {
  if (!_mShopEditId) return;
  const id = _mShopEditId;
  st.shopping = st.shopping.filter(x => String(x.id) !== String(id));
  save(); mCloseShopEdit(); mRenderShop(); mRenderToday();
  await sbReq('DELETE', 'shopping_list', null, `?id=eq.${id}`);
}

// ── Meals sheet ────────────────────────────────────────────────────────────────
function _mGrocDateRange(mon) {
  const m = new Date(mon + 'T12:00:00');
  const s = new Date(m); s.setDate(m.getDate() + 6);
  return m.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' – ' + s.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

function mRenderMeals() {
  const el = document.getElementById('mMealsSheet');
  if (!el) return;
  const thisWkMon = typeof _grocWeekMonday === 'function' ? _grocWeekMonday(0) : getWkKey(0);
  const plannedMeals = typeof _mealsForWeek === 'function' ? _mealsForWeek() : [];
  const uniqueMeals = [...new Map(plannedMeals.map(m => [String(m.recipe_id), m])).values()];
  let html = `<h3 style="margin:0 0 4px">Meals This Week</h3><div class="m-groc-week-hdr" style="padding-top:0"><span class="m-groc-week-dates">${_mGrocDateRange(thisWkMon)}</span></div>`;
  if (uniqueMeals.length) {
    uniqueMeals.forEach(m => {
      html += `<div class="m-groc-row"><span class="m-groc-name" style="font-weight:600">🍽 ${escHtml(m.recipe_name||'')}</span>${(m.servings||1)>1?`<span class="m-groc-amt">${m.servings}d</span>`:''}<button class="m-groc-del" onclick="mRemoveMealAndGroceries('${m.recipe_id}')">✕</button></div>`;
    });
  } else {
    html += '<div class="m-groc-row" style="opacity:.4;font-style:italic;padding:6px 0">No meals planned</div>';
  }
  html += `<button class="m-meals-add-btn" onclick="mOpenRecipes()">+ Add a meal</button>`;
  el.innerHTML = html;
}
function mOpenMeals() {
  mRenderMeals();
  document.getElementById('mMealsBackdrop').classList.add('open');
  document.getElementById('mMealsSheet').classList.add('open');
}
function mCloseMeals() {
  document.getElementById('mMealsBackdrop').classList.remove('open');
  document.getElementById('mMealsSheet').classList.remove('open');
}

// ── Full shopping list sheet (HEB items + meal ingredients) ───────────────────
function mRenderFullList() {
  const el = document.getElementById('mFullListSheet');
  if (!el) return;
  if (typeof generateGroceryStaples === 'function') generateGroceryStaples();

  const nextWkMon = typeof _grocWeekMonday === 'function' ? _grocWeekMonday(1) : (() => { const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow+7); return d2s(d); })();
  const items = (st.groceryList || []).filter(g => g.week_of === nextWkMon);
  const unchecked = items.filter(g => !g.checked);
  const checked = items.filter(g => g.checked);
  const hebItems = (st.shopping || []).filter(s => !s.done && s.store === 'HEB').sort((a, b) => (a.shop_order ?? 9999) - (b.shop_order ?? 9999));

  let html = `<h3 style="margin:0 0 4px">HEB List</h3><div class="m-groc-week-hdr" style="padding-top:0"><span class="m-groc-week-dates">${_mGrocDateRange(nextWkMon)}</span></div>`;

  const staples = unchecked.filter(g => g.source === 'staple');
  const recipeGroups = {};
  unchecked.filter(g => g.source === 'recipe').forEach(g => {
    const k = g.recipe_name || 'Recipe';
    if (!recipeGroups[k]) recipeGroups[k] = [];
    recipeGroups[k].push(g);
  });
  const manual = unchecked.filter(g => g.source === 'manual');

  function grocRow(g) {
    return `<div class="m-groc-row${g.checked ? ' m-groc-done' : ''}" data-id="${g.id}">
      <input type="checkbox" class="m-groc-chk"${g.checked ? ' checked' : ''} onchange="mTogGroc('${g.id}',this.checked)">
      <span class="m-groc-name">${escHtml(g.name || '')}</span>
      ${g.amount ? `<span class="m-groc-amt">${escHtml(g.amount || '')}</span>` : ''}
      <button class="m-groc-del" onclick="mDelGroc('${g.id}')">✕</button>
    </div>`;
  }
  function hebRow(s) {
    return `<div class="m-groc-row" data-id="${s.id}">
      <input type="checkbox" class="m-groc-chk" onchange="mToggleFullListHeb('${s.id}',this.checked)">
      <span class="m-groc-name">${escHtml(s.name || '')}</span>
    </div>`;
  }

  if (staples.length) { html += `<div class="m-groc-section-title">Weekly Staples</div>` + staples.map(grocRow).join(''); }
  Object.entries(recipeGroups).forEach(([name, arr]) => {
    html += `<div class="m-groc-section-title">${escHtml(name)}</div>` + arr.map(grocRow).join('');
  });
  if (hebItems.length) { html += `<div class="m-groc-section-title">Shopping List</div>` + hebItems.map(hebRow).join(''); }
  if (manual.length) { html += `<div class="m-groc-section-title">Other</div>` + manual.map(grocRow).join(''); }
  if (checked.length) { html += `<div class="m-groc-section-title" style="opacity:.5">Done (${checked.length})</div>` + checked.map(grocRow).join(''); }
  if (!unchecked.length && !checked.length && !hebItems.length) {
    html += '<div class="m-groc-row" style="opacity:.4;font-style:italic;padding:6px 0">No items yet</div>';
  }
  html += `<div class="m-fulllist-add"><input id="mFullListNewName" type="text" placeholder="Add item..." onkeydown="if(event.key==='Enter')mAddGrocItem()"><button onclick="mAddGrocItem()">Add</button></div>`;
  el.innerHTML = html;
}
function mOpenFullList() {
  mRenderFullList();
  document.getElementById('mFullListBackdrop').classList.add('open');
  document.getElementById('mFullListSheet').classList.add('open');
}
function mCloseFullList() {
  document.getElementById('mFullListBackdrop').classList.remove('open');
  document.getElementById('mFullListSheet').classList.remove('open');
}
function mToggleFullListHeb(id, checked) {
  togShop(id, checked);
  mRenderFullList();
}

async function mTogGroc(id, checked) {
  const item = (st.groceryList || []).find(g => String(g.id) === String(id));
  if (!item) return;
  item.checked = checked;
  save(); mRenderFullList();
  sbReqSilent('PATCH', 'grocery_list', {checked}, `?id=eq.${id}`);
}

async function mDelGroc(id) {
  st.groceryList = (st.groceryList || []).filter(g => String(g.id) !== String(id));
  save(); mRenderFullList();
  sbReqSilent('DELETE', 'grocery_list', null, `?id=eq.${id}`);
}

async function mAddGrocItem() {
  const nameEl = document.getElementById('mFullListNewName');
  const n = (nameEl.value || '').trim();
  if (!n) return;
  const wk = typeof _grocWeekMonday === 'function' ? _grocWeekMonday(1) : (() => { const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow+7); return d.toISOString().split('T')[0]; })();
  const item = {name: n, amount: null, source: 'manual', source_id: null, recipe_name: null, aisle: null, checked: false, week_of: wk};
  const sv = await sbReqSilent('POST', 'grocery_list', item);
  if (sv && sv[0]) st.groceryList.push(sv[0]);
  else { item.id = 'l-' + Date.now(); st.groceryList.push(item); }
  save(); mRenderFullList();
}

function mOpenRecipes() {
  const recipes = (st.recipes || []).filter(r => !r.is_deleted);
  let html = '<h3 style="margin:0 0 12px">Recipes</h3>';
  if (!recipes.length) {
    html += '<div style="opacity:.5;padding:12px 0">No recipes yet</div>';
  } else {
    recipes.forEach(r => {
      const ing = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
      html += `<div class="m-recipe-row" onclick="mAddRecipeToMealPlan('${r.id}')">
        <span class="m-recipe-name">${escHtml(r.name || '')}</span>
        ${ing ? `<span class="m-recipe-meta">${ing} items</span>` : ''}
        <span class="m-recipe-add">+</span>
      </div>`;
    });
  }
  document.getElementById('mRecipeSheet').innerHTML = html;
  document.getElementById('mRecipeBackdrop').classList.add('open');
  document.getElementById('mRecipeSheet').classList.add('open');
}
function mCloseRecipes() {
  document.getElementById('mRecipeBackdrop').classList.remove('open');
  document.getElementById('mRecipeSheet').classList.remove('open');
}
async function mAddRecipeToMealPlan(recipeId) {
  if (typeof addRecipeToMealPlan === 'function') {
    await addRecipeToMealPlan(recipeId);
    mRenderMeals();
  } else if (typeof _grocAddRecipe === 'function') {
    await _grocAddRecipe(recipeId);
    mRenderMeals();
  }
  mCloseRecipes();
}

// ── Recipes page (opened from More) — read-only, tap a recipe to expand its ingredients ──
let _mRecipesExpanded = new Set();
function _mRenderRecipesBrowse() {
  const el = document.getElementById('mRecipesList');
  if (!el) return;
  const recipes = (st.recipes || []).filter(r => !r.is_deleted).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let html = '';
  if (!recipes.length) {
    html += '<div style="opacity:.5;padding:12px 0">No recipes yet</div>';
  } else {
    recipes.forEach(r => {
      const ings = typeof _parseIngredients === 'function' ? _parseIngredients(r.ingredients) : [];
      const expanded = _mRecipesExpanded.has(String(r.id));
      const meta = [r.meal_type, r.time ? r.time + ' min' : null, r.servings ? r.servings + ' servings' : null].filter(Boolean).join(' · ');
      html += `<div class="m-recipe-row" onclick="mToggleRecipeExpand('${r.id}')">
        <span class="m-recipe-name">${escHtml(r.name || '')}</span>
        ${ings.length ? `<span class="m-recipe-meta">${ings.length} items</span>` : ''}
        <span class="m-recipe-add" style="display:inline-block;transform:rotate(${expanded ? '90deg' : '0deg'})">›</span>
      </div>`;
      if (expanded) {
        html += `<div class="m-recipe-browse-detail">
          ${meta ? `<div class="m-recipe-browse-meta">${escHtml(meta)}</div>` : ''}
          ${ings.length
            ? ings.map(i => `<div class="m-recipe-browse-ing">${escHtml(i.amount ? i.amount + ' ' : '')}${escHtml(i.name || '')}</div>`).join('')
            : '<div class="m-recipe-browse-ing" style="opacity:.5;font-style:italic">No ingredients listed</div>'}
        </div>`;
      }
    });
  }
  el.innerHTML = html;
}
function mToggleRecipeExpand(id) {
  const key = String(id);
  if (_mRecipesExpanded.has(key)) _mRecipesExpanded.delete(key);
  else _mRecipesExpanded.add(key);
  _mRenderRecipesBrowse();
}

function mRemoveMealAndGroceries(recipeId) {
  if (typeof removeMealAndGroceries === 'function') {
    removeMealAndGroceries(recipeId);
    mRenderMeals();
    mRenderFullList();
  }
}

// ── Month view (continuous scroll across months, like iOS Calendar's list view) ─
let _mMonthSelectedDs = null;
let _mMoRenderedLo = -6;   // week offsets (relative to current week) currently rendered
let _mMoRenderedHi = 6;
let _mMoScrollLock = false;
let _mMoTitleRaf = false;

function mOpenMonth() {
  _mMonthSelectedDs = d2s(getDayDate(0));
  _mRenderMonthWeeks(true);
  _mRenderMonthDetail(_mMonthSelectedDs);
  mInitMonthScroll();
  requestAnimationFrame(() => requestAnimationFrame(() => _mMoScrollToToday()));
}
let _mYearViewOpen = false;
let _mYearOffset = 0;

// Jump one real month from whichever month is currently docked at the top of the scroll view
function mMonthJump(dir) {
  if (_mYearViewOpen) { _mYearOffset += dir; _mRenderYear(); return; }
  const scroller = document.getElementById('mMonthScroll');
  const rows = scroller ? [...scroller.querySelectorAll('.m-mo-week')] : [];
  const top = scroller ? scroller.getBoundingClientRect().top : 0;
  const anchorRow = rows.find(r => r.getBoundingClientRect().bottom > top + 4);
  const anchorDs = anchorRow ? anchorRow.dataset.mon : d2s(getDayDate(0));
  const d = new Date(anchorDs + 'T12:00:00');
  d.setDate(1);
  d.setMonth(d.getMonth() + dir);
  const now = new Date();
  mMonthJumpToOffset((d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

// Jump to the month at monthOffset from the current real month, extending the rendered
// week range if the target isn't loaded yet.
function mMonthJumpToOffset(monthOffset) {
  const now = new Date();
  const targetDs = d2s(new Date(now.getFullYear(), now.getMonth() + monthOffset, 1));
  const targetWeekOff = _mWkGetWeekOff(targetDs);
  if (targetWeekOff < _mMoRenderedLo || targetWeekOff > _mMoRenderedHi) {
    const wrap = document.getElementById('mMonthWeeks');
    while (targetWeekOff < _mMoRenderedLo) { _mMoRenderedLo--; wrap.insertAdjacentHTML('afterbegin', _mMoWeekRowHtml(_mMoRenderedLo, false)); }
    while (targetWeekOff > _mMoRenderedHi) { _mMoRenderedHi++; wrap.insertAdjacentHTML('beforeend', _mMoWeekRowHtml(_mMoRenderedHi, false)); }
  }
  requestAnimationFrame(() => {
    const row = document.querySelector(`.m-mo-week[data-wk="${targetWeekOff}"]`);
    if (row) row.scrollIntoView({block: 'start', behavior: 'auto'});
    _mUpdateMonthTitle();
  });
}

function mToggleYearView() {
  _mYearViewOpen = !_mYearViewOpen;
  const yearEl = document.getElementById('mYearView');
  const hdrEl = document.getElementById('mMonthDayHdr');
  const scrollEl = document.getElementById('mMonthScroll');
  const detailEl = document.getElementById('mMonthDetail');
  if (_mYearViewOpen) {
    _mYearOffset = 0;
    yearEl.style.display = '';
    hdrEl.style.display = 'none';
    scrollEl.style.display = 'none';
    detailEl.style.display = 'none';
    _mRenderYear();
  } else {
    yearEl.style.display = 'none';
    hdrEl.style.display = '';
    scrollEl.style.display = '';
    detailEl.style.display = '';
    _mUpdateMonthTitle();
  }
}

function _mRenderYear() {
  const now = new Date();
  const yr = now.getFullYear() + _mYearOffset;
  document.getElementById('mMonthTitle').textContent = String(yr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today = d2s(getDayDate(0));
  const todayMo = new Date().getMonth();
  const todayYr = new Date().getFullYear();
  let html = '';
  months.forEach((name, mi) => {
    const isCurrent = yr === todayYr && mi === todayMo;
    html += `<button class="m-yr-month${isCurrent ? ' is-current' : ''}" onclick="mYearSelectMonth(${mi}, ${yr})">${name}</button>`;
  });
  document.getElementById('mYearView').innerHTML = html;
}

function mYearSelectMonth(mo, yr) {
  const now = new Date();
  _mYearViewOpen = false;
  document.getElementById('mYearView').style.display = 'none';
  document.getElementById('mMonthDayHdr').style.display = '';
  document.getElementById('mMonthScroll').style.display = '';
  document.getElementById('mMonthDetail').style.display = '';
  mMonthJumpToOffset((yr - now.getFullYear()) * 12 + (mo - now.getMonth()));
}

// Category key exactly matching the detail panel below (_mRenderMonthDetail), so a
// day's color badge always reflects the same items you see when you tap that day —
// previously the badge used a separate, narrower data source and could miss WR
// recurring/WR rules/pup sessions/travel/birthday/video-step items entirely.
function _mMonthCatKey(t) {
  return t._type === 'shop' ? 'shopping'
    : t._type === 'vid' || t._type === 'vidstep' ? 'Videos'
    : t._type === 'birthday' ? 'birthday'
    : t._type === 'holiday' ? 'holiday'
    : t._type === 'travel' ? 'travel'
    : (t._isWrRule || t._isWrec) ? 'weekly_reset'
    : (t._virtual && t._recId) ? 'recurring'
    : (t.category || '');
}

// Effective color for a badge segment / detail dot: overdue (red) beats important
// (yellow) beats category color — the same priority desktop uses on task rows
// (features.js: `t.important&&!t.done?IMP:...`, overdue always wins over that).
function _mMonthDotStyle(t) {
  const noCheck = t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday';
  if (!noCheck && isOv(t.due_date) && !t.done) return OV;
  if (t.important && !t.done) return IMP;
  return gc(_mMonthCatKey(t));
}

// Segment order matches the rest of the dashboard's CATS key order, with overdue/important
// pulled out front since they're cross-cutting states, not categories.
function _mMonthDayBadge(tasks) {
  // Include done tasks too (plain category color — overdue/important styling only
  // applies to undone items, same as everywhere else) so a fully-completed day still
  // shows its category breakdown instead of going blank. Travel is excluded — it
  // already gets its own spanning bar across the trip's date range, so counting it
  // here too would be redundant.
  const items = tasks.filter(t => t._type !== 'travel');
  if (!items.length) return '';
  const order = Object.keys(CATS);
  const counts = {};
  const colorFor = {};
  items.forEach(t => {
    const noCheck = t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday';
    const key = (!noCheck && isOv(t.due_date)) ? '_overdue' : t.important ? '_important' : _mMonthCatKey(t).toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    colorFor[key] = _mMonthDotStyle(t).d;
  });
  const rank = k => k === '_overdue' ? -2 : k === '_important' ? -1 : (order.indexOf(k) === -1 ? 999 : order.indexOf(k));
  const keys = Object.keys(counts).sort((a, b) => rank(a) - rank(b));
  if (keys.length === 1) return `<span class="m-mo-dot" style="background:${colorFor[keys[0]]}"></span>`;
  const total = items.length;
  const segs = keys.map(k => `<span style="flex:${counts[k] / total};background:${colorFor[k]}"></span>`).join('');
  return `<div class="m-mo-bar">${segs}</div>`;
}

// One week's row of 7 day cells, plus a bold month-name divider whenever the week
// contains the 1st of a month (or forceLabel, used for the very first rendered row so
// there's always a label visible right away). Each day's badge is built from
// mGetDayTasks — the exact same source the tap-to-detail panel uses.
function _mMoWeekRowHtml(weekOff, forceLabel) {
  const dates = getWkDates(weekOff);
  const today = d2s(getDayDate(0));
  const monthStart = dates.find(d => d.getDate() === 1);
  let divider = '';
  if (monthStart) {
    divider = `<div class="m-mo-month-divider">${monthStart.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</div>`;
  } else if (forceLabel) {
    divider = `<div class="m-mo-month-divider">${dates[0].toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</div>`;
  }
  const cells = dates.map(d => {
    const ds = d2s(d);
    const isToday = ds === today;
    const badge = _mMonthDayBadge(mGetDayTasks(ds, weekOff));
    // Badge always sits in its own fixed-height slot (even when empty) so the day
    // number never shifts depending on whether that day has a badge or not.
    return `<div class="m-mo-day${isToday ? ' is-today' : ''}${_mMonthSelectedDs === ds ? ' selected' : ''}" data-ds="${ds}" onclick="mMonthSelectDay('${ds}')"><span class="m-mo-num">${d.getDate()}</span><div class="m-mo-badge-slot">${badge}</div></div>`;
  }).join('');
  return `${divider}<div class="m-mo-week" data-wk="${weekOff}" data-mon="${d2s(dates[0])}">${cells}${_mMoTravelBarsHtml(dates)}</div>`;
}

// A continuous colored bar spanning each trip's date range within this week row,
// like iOS Calendar's multi-day all-day event bars — clipped to whichever days of
// the trip fall inside this particular week.
function _mMoTravelBarsHtml(dates) {
  const wkStart = d2s(dates[0]), wkEnd = d2s(dates[6]);
  const trips = (st.travel || []).filter(tv => {
    const s = tv.start_date ? tv.start_date.split('T')[0] : null;
    if (!s) return false;
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    return s <= wkEnd && e >= wkStart;
  });
  if (!trips.length) return '';
  const ts = gc('travel');
  return trips.map((tv, i) => {
    const s = tv.start_date.split('T')[0];
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    const startsHere = s >= wkStart, endsHere = e <= wkEnd;
    const startIdx = startsHere ? dates.findIndex(d => d2s(d) === s) : 0;
    const endIdx = endsHere ? dates.findIndex(d => d2s(d) === e) : 6;
    const left = (Math.max(0, startIdx) / 7 * 100).toFixed(4);
    const width = ((Math.max(0, endIdx) - Math.max(0, startIdx) + 1) / 7 * 100).toFixed(4);
    // Rounded only at the trip's true start/end — square where it continues into the
    // next/previous week row, so a multi-week trip reads as one continuous pill.
    const radius = `${startsHere ? '5px' : '0'} ${endsHere ? '5px' : '0'} ${endsHere ? '5px' : '0'} ${startsHere ? '5px' : '0'}`;
    return `<div class="m-mo-travel-bar" style="left:${left}%;width:${width}%;border-radius:${radius};background:${ts.d}" title="${escHtml(tv.name || '')}"></div>`;
  }).join('');
}

function _mRenderMonthWeeks(reset) {
  const wrap = document.getElementById('mMonthWeeks');
  if (!wrap) return;
  const scroller = document.getElementById('mMonthScroll');
  // Background sync re-renders (reset=false) must not yank the view while the user is
  // scrolled off to a past/future month — only an explicit tab-open resets position.
  const prevScroll = scroller ? scroller.scrollTop : 0;
  if (reset) { _mMoRenderedLo = -6; _mMoRenderedHi = 6; }
  let html = '';
  for (let w = _mMoRenderedLo; w <= _mMoRenderedHi; w++) {
    html += _mMoWeekRowHtml(w, w === _mMoRenderedLo);
  }
  wrap.innerHTML = html;
  if (!reset && scroller) scroller.scrollTop = prevScroll;
  _mUpdateMonthTitle();
}

function _mMoLoadMore(direction) {
  if (_mMoScrollLock) return;
  _mMoScrollLock = true;
  const wrap = document.getElementById('mMonthWeeks');
  const scroller = document.getElementById('mMonthScroll');
  if (!wrap || !scroller) { _mMoScrollLock = false; return; }
  if (direction === 'up') {
    _mMoRenderedLo--;
    const prevHeight = wrap.scrollHeight;
    wrap.insertAdjacentHTML('afterbegin', _mMoWeekRowHtml(_mMoRenderedLo, false));
    scroller.scrollTop += wrap.scrollHeight - prevHeight;
  } else {
    _mMoRenderedHi++;
    wrap.insertAdjacentHTML('beforeend', _mMoWeekRowHtml(_mMoRenderedHi, false));
  }
  setTimeout(() => { _mMoScrollLock = false; }, 200);
}

function mInitMonthScroll() {
  const scroller = document.getElementById('mMonthScroll');
  if (!scroller || scroller._moScrollInited) return;
  scroller._moScrollInited = true;
  // rAF-throttled: the raw scroll event can fire dozens of times per frame, and running
  // this work synchronously on each one is what made the scroll feel janky.
  scroller.addEventListener('scroll', () => {
    if (_mMoTitleRaf) return;
    _mMoTitleRaf = true;
    requestAnimationFrame(() => {
      _mMoTitleRaf = false;
      _mUpdateMonthTitle();
      if (_mMoScrollLock) return;
      const threshold = 900;
      if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < threshold) _mMoLoadMore('down');
      if (scroller.scrollTop < threshold) _mMoLoadMore('up');
    });
  }, {passive: true});
}

// Title tracks whichever month is currently docked at the top of the scroll view
// Single hit-test instead of walking every rendered row with getBoundingClientRect —
// that was forcing a layout read per row on every scroll frame (dozens of times a
// second with 13+ weeks rendered), which is exactly the kind of layout-thrashing that
// makes scrolling feel stuck/broken on a real device.
function _mUpdateMonthTitle() {
  const scroller = document.getElementById('mMonthScroll');
  const titleEl = document.getElementById('mMonthTitle');
  if (!scroller || !titleEl) return;
  const rect = scroller.getBoundingClientRect();
  const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 4);
  const row = el && el.closest('.m-mo-week');
  if (!row) return;
  const d = new Date(row.dataset.mon + 'T12:00:00');
  titleEl.textContent = d.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
}

function _mMoScrollToToday(attempt) {
  attempt = attempt || 0;
  const scroller = document.getElementById('mMonthScroll');
  const todayEl = scroller && scroller.querySelector('.m-mo-day.is-today');
  if (!todayEl) { if (attempt < 25) setTimeout(() => _mMoScrollToToday(attempt + 1), 40); return; }
  const row = todayEl.closest('.m-mo-week');
  if (row) row.scrollIntoView({block: 'start', behavior: 'auto'});
  _mUpdateMonthTitle();
}

function mMonthSelectDay(ds) {
  _mMonthSelectedDs = ds;
  // Toggle the selected class directly — no re-render, so scroll position is preserved
  document.querySelectorAll('#mMonthWeeks .m-mo-day.selected').forEach(el => el.classList.remove('selected'));
  const el = document.querySelector(`#mMonthWeeks .m-mo-day[data-ds="${ds}"]`);
  if (el) el.classList.add('selected');
  _mRenderMonthDetail(ds);
}

function _mRenderMonthDetail(ds) {
  const detail = document.getElementById('mMonthDetail');
  if (!detail) return;
  const d = new Date(ds + 'T12:00:00');
  const label = d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});

  // Gather all tasks for this day
  const weekOff = _mWkGetWeekOff(ds);
  const tasks = mGetDayTasks(ds, weekOff);

  let html = `<div class="m-mo-detail-hd">${label}</div>`;
  if (!tasks.length) {
    html += '<div class="m-mo-detail-empty">No tasks</div>';
  } else {
    tasks.forEach(t => {
      const s = _mMonthDotStyle(t);
      html += `<div class="m-mo-detail-item${t.done ? ' done' : ''}">
        <span class="m-mo-detail-dot" style="background:${s.bg};border:1px solid ${s.d}"></span>
        ${escHtml(t.name || '')}
      </div>`;
    });
  }
  detail.innerHTML = html;
}

function mMonthTapDay(ds) {
  if (_mCurTab !== 'week') mShowTab('week');
  const weekOff = _mWkGetWeekOff(ds);
  const list = document.getElementById('mWeekList');
  if (weekOff < _mWkRenderedLo || weekOff > _mWkRenderedHi) {
    while (weekOff < _mWkRenderedLo) { _mWkRenderedLo--; list.insertAdjacentHTML('afterbegin', _mWkRenderWeekHtml(_mWkRenderedLo)); }
    while (weekOff > _mWkRenderedHi) { _mWkRenderedHi++; list.insertAdjacentHTML('beforeend', _mWkRenderWeekHtml(_mWkRenderedHi)); }
  }
  requestAnimationFrame(() => {
    const dayEl = document.querySelector(`.m-wk-day[data-ds="${ds}"]`);
    if (dayEl) dayEl.scrollIntoView({block: 'start', behavior: 'smooth'});
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function mInit() {
  load();
  _fetchHolidays();
  // Clear stale local overrides on mobile — always trust Supabase as source of truth
  if (typeof localOverrides !== 'undefined') { for (const k in localOverrides) delete localOverrides[k]; }
  _mSetDate();
  mInitPickers();
  mInitTodayDblTap();
  mInitSwipe();
  mInitPTR();
  mInitTBSwipe();
  mInitBlockDrag();
  mInitWeekScroll();
  mInitWkDrag();
  const authed = await checkAuth();
  if (!authed) return;
  hideLoginOverlay();
  await syncAll();
  mShowTab(['today','tb','week','month','shop','extras','recipes'].includes(localStorage._mLastTab) ? localStorage._mLastTab : 'today'); // restore last tab across refresh
  setInterval(() => { if (cfg.url && cfg.key && !document.hidden) syncAll(true); }, 30000);

  // iOS suspends setInterval while the PWA is backgrounded — so reopening the app
  // shows stale data (tasks completed on desktop still appear undone → false overdue)
  // until the timer thaws. Force an immediate re-sync whenever the app returns to foreground.
  let _mLastFgSync = 0;
  const _mForegroundSync = () => {
    if (!cfg.url || !cfg.key) return;
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - _mLastFgSync < 3000) return; // dedup visibilitychange+pageshow double-fire
    _mLastFgSync = now;
    syncAll(true).catch(() => {});
  };
  document.addEventListener('visibilitychange', _mForegroundSync);
  window.addEventListener('pageshow', _mForegroundSync);
  window.addEventListener('focus', _mForegroundSync);
}

document.addEventListener('DOMContentLoaded', mInit);
