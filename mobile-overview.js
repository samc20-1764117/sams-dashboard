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
  document.getElementById('mBootLoading')?.remove();
  document.getElementById('mLogin').style.display = 'flex';
  document.getElementById('mApp').classList.remove('ready');
  setTimeout(() => document.getElementById('mEmail') && document.getElementById('mEmail').focus(), 100);
}
function hideLoginOverlay() {
  _mLoggedIn = true;
  document.getElementById('mBootLoading')?.remove();
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
function renderHabitsHighlight() {}
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
function _mVidDayMapSet(m) { localStorage._vidDayMap = JSON.stringify(m); }

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
    save(); renderAll();  // renderAll (not just Today) so the Week tab refreshes live too
    sbReqSilent('POST', 'wr_recurring_overrides', ov, '').then(sv => {
      if (sv && sv[0]) { const i = st.wrOverrides.indexOf(ov); if (i > -1) st.wrOverrides[i] = sv[0]; save(); }
    });
  } else {
    const existing = st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === wkKey && o.override_type === 'complete');
    if (!existing) return;
    st.wrOverrides = st.wrOverrides.filter(o => o !== existing);
    if (st.blocks) st.blocks.filter(b => typeof dsToWkKey === 'function' && dsToWkKey(b.ds) === wkKey && (String(b.ruleId) === String(ruleId) || String(b.recId) === String(ruleId))).forEach(b => { b._done = false; });
    save(); renderAll();  // renderAll (not just Today) so the Week tab refreshes live too
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
const M_CATS_TRAVEL = [...M_CATS, 'Travel'];
// Today's quick-add picker (mSelectCat('add', ...)) specifically — no "Long term" (not a
// meaningful choice when adding a brand-new task for today), plus "Shopping" as a real
// addable type (previously only creatable from the Shop tab's own add bar).
// "Weekly Reset Task" and "Recurring Task" create real wr_recurring_rules rows (same table
// desktop's Add Recurring modal writes to — see _mAddRecurring below), scoped to the weekly
// cadence only for now (desktop also supports biweekly/monthly/quarterly/etc. cadences with
// their own extra fields; porting all of those is a separate, larger follow-up).
const M_CATS_ADD = ['Home', 'My work', 'Work', 'Social', 'Travel', 'Shopping', 'Weekly Reset Task', 'Recurring Task'];
let _mAddCat       = 'Home';
let _mEditCat      = 'Home';
let _mBlockCat     = 'Home';
let _mFullAddCat   = 'Home';
let _mAddImportant    = false;
let _mEditImportant   = false;
let _mFullAddImportant = false;

const _EDIT_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 2 2L10 15l-3 1 1-3z"/></svg>`;

function _mDotStyle(cat) {
  const s = gc({'Weekly Reset Task': 'weekly_reset', 'Recurring Task': 'recurring'}[cat] || cat);
  return `background:${s.bg};border:1.5px solid ${s.d}`;
}

function _mBuildOpts(elId, which, cats = M_CATS) {
  const el = document.getElementById(elId);
  if (!el) return;
  // onmousedown preventDefault (here and on the trigger .m-cpick-btn) stops the tap from
  // blurring whatever text input currently has focus — without it, picking a category
  // dismissed the keyboard even though you're still mid-add, since tapping any element a
  // focused input doesn't "own" normally shifts focus away first.
  // gc() keys off the exact CATS/CATS_DARK (core.js) object keys — "Weekly Reset Task"/
  // "Recurring Task" are picker LABELS, not category keys, so they'd otherwise fall through
  // to the default grey; map them to the real 'weekly_reset'/'recurring' color keys instead.
  const _gcKey = {'Weekly Reset Task': 'weekly_reset', 'Recurring Task': 'recurring'};
  el.innerHTML = cats.map(cat => {
    const s = gc(_gcKey[cat] || cat);
    return `<div class="m-cpick-opt" onmousedown="event.preventDefault()" onclick="mSelectCat('${which}','${escHtml(cat)}')">
      <span class="m-cpick-dot" style="background:${s.bg};border:1.5px solid ${s.d}"></span>
      <span>${escHtml(cat)}</span>
    </div>`;
  }).join('');
}

// Toggles #mAddBar.picker-open whenever any of the quick-add popup's own dropdowns
// (category/store/day) is open — see the caret-color:transparent rule on #mAddBar.picker-
// open input in mobile.css for why. Harmless to call from every picker context (edit/block/
// wkadd/fulladd aren't inside #mAddBar, so this has no visible effect for those).
function _mSyncPickerOpenClass() {
  const anyOpen = M_ADD_PICKER_IDS.some(id => document.getElementById(id)?.classList.contains('open'));
  document.getElementById('mAddBar')?.classList.toggle('picker-open', anyOpen);
}
function mTogglePick(which) {
  const ids = {add: 'mAddPickOpts', edit: 'mEditPickOpts', block: 'mBlockPickOpts', fulladd: 'mFullAddPickOpts'};
  const myId = ids[which];
  Object.entries(ids).forEach(([k, id]) => { if (k !== which) document.getElementById(id)?.classList.remove('open'); });
  _mCloseAddPickers(myId);
  if (which === 'add') _mFitPickerOpts(myId);
  document.getElementById(myId)?.classList.toggle('open');
  _mSyncPickerOpenClass();
}

function mSelectCat(which, cat) {
  const map = {
    add:     {dot: 'mAddPickDot',     lbl: 'mAddPickLbl',     opts: 'mAddPickOpts'},
    edit:    {dot: 'mEditPickDot',    lbl: 'mEditPickLbl',    opts: 'mEditPickOpts'},
    block:   {dot: 'mBlockPickDot',   lbl: 'mBlockPickLbl',   opts: 'mBlockPickOpts'},
    fulladd: {dot: 'mFullAddPickDot', lbl: 'mFullAddPickLbl', opts: 'mFullAddPickOpts'},
  };
  const {dot: dotId, lbl: lblId, opts: optId} = map[which] || {};
  if (which === 'add')         _mAddCat       = cat;
  else if (which === 'edit')   _mEditCat      = cat;
  else if (which === 'block')  _mBlockCat     = cat;
  else if (which === 'fulladd') _mFullAddCat  = cat;
  const dotEl = document.getElementById(dotId);
  const lblEl = document.getElementById(lblId);
  if (dotEl) dotEl.style.cssText = _mDotStyle(cat);
  if (lblEl) lblEl.textContent = cat;
  document.getElementById(optId)?.classList.remove('open');
  if (which === 'fulladd') _mFullAddSyncTravelFields(cat);
  if (which === 'add') _mAddSyncTypeFields(cat);
  _mSyncPickerOpenClass();
}
// Swaps the quick-add popup's extra fields in/out as the type picker changes — mirrors
// _mFullAddSyncTravelFields above, but also covers Shopping (destination/dates for Travel,
// a store picker for Shopping, neither for a plain category). The bar is bottom-anchored
// (mOpenQuickAdd/_mQuickAddReposition), so showing/hiding these fields naturally grows or
// shrinks it upward from that fixed bottom point — no separate reflow step needed.
function _mAddSyncTypeFields(cat) {
  const isTv = cat === 'Travel';
  const isShop = cat === 'Shopping';
  const isWr = cat === 'Weekly Reset Task';
  const isRec = cat === 'Recurring Task';
  const isMonthly = _mAddCadence === 'monthly';
  const _sh = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
  _sh('mAddDestField', isTv);
  _sh('mAddDateRow', isTv);
  _sh('mAddStartField', isTv);
  _sh('mAddEndField', isTv);
  _sh('mAddStoreField', isShop);
  // Store custom-name field only shows if BOTH Shopping is selected AND the store picker
  // is currently on "Other" — mSelectStore (below) owns that second half.
  _sh('mAddStoreCustomField', isShop && _mAddStore === 'Other');
  _sh('mAddLinkField', isShop);
  // Weekly Reset + Recurring fields — mirrors desktop's wrRuleAddModal exactly:
  // - Pup related: Weekly Reset only.
  // - Cadence: both.
  // - Due-on-day/Due-on-date-of-month: Recurring ONLY, never Weekly Reset, regardless of
  //   cadence (desktop's wrAddAppearDay/DateField are gated on isSch, not on cadence).
  // - Starting date: Recurring always; Weekly Reset only when cadence isn't weekly (a
  //   weekly WR item has no anchor at all — see updateWrRuleCadenceUI, overview.js).
  _sh('mAddPupField', isWr);
  _sh('mAddCadenceField', isWr || isRec);
  _sh('mAddDayField', isRec && !isMonthly);
  _sh('mAddDomField', isRec && isMonthly);
  _sh('mAddRecStartField', isRec || (isWr && _mAddCadence !== 'weekly'));
  // Shopping/Weekly-Reset/Recurring have no "important" concept in this data model — hide
  // the flag rather than show a control that would silently do nothing.
  _sh('mAddFlagBtn', !isShop && !isWr && !isRec);
  const nameInp = document.getElementById('mNewTask');
  nameInp && (nameInp.placeholder = isShop ? 'Item name…' : isTv ? 'Trip name…' : (isWr || isRec) ? 'Task name…' : 'Add task for today…');
  const btn = document.getElementById('mAddBtn');
  if (btn) btn.textContent = isTv ? 'Add Trip' : isShop ? 'Add Item' : isWr ? 'Add Weekly Reset' : isRec ? 'Add Recurring' : 'Add';
  if (isTv && !_mAddDates.tvStart) { _mAddDates.tvStart = tod(); const l = document.getElementById('mAddStartLbl'); if (l) l.textContent = _mFmtAddDate(_mAddDates.tvStart); }
  if ((isWr || isRec) && !_mAddDates.recStart) { _mAddDates.recStart = tod(); const l = document.getElementById('mAddRecStartLbl'); if (l) l.textContent = _mFmtAddDate(_mAddDates.recStart); }
}
// "Other" reveals a free-text store name field (mirrors desktop's qaStore/__custom
// pattern, features.js) — any other store selection hides it again.
let _mAddStore = 'HEB';
function mToggleStorePick() {
  _mCloseAddPickers();
  _mFitPickerOpts('mAddStoreOpts');
  document.getElementById('mAddStoreOpts')?.classList.toggle('open');
  _mSyncPickerOpenClass();
}
function mSelectStore(store) {
  _mAddStore = store;
  const lbl = document.getElementById('mAddStoreLbl');
  if (lbl) lbl.textContent = store;
  document.getElementById('mAddStoreOpts')?.classList.remove('open');
  _mSyncPickerOpenClass();
  const isOther = store === 'Other';
  const f = document.getElementById('mAddStoreCustomField');
  if (f) f.style.display = isOther ? '' : 'none';
  // "Other" hands off to its own text field, which DOES need (and is supposed to raise)
  // its own keyboard — this is a genuine field change, not the same
  // dismiss-when-it-shouldn't issue the store picker itself used to have as a native select.
  if (isOther) document.getElementById('mAddStoreCustom')?.focus();
}
// Recurring Task's "due on" day-of-week picker — defaults to today's weekday.
// All quick-add popup dropdown ids, in one place — closing/mutual-exclusion logic for any
// one of them just calls _mCloseAddPickers(keepId), instead of every toggle function
// repeating its own hand-maintained "close all the others" list (which is how store/day
// drifted before this refactor — new pickers kept getting added without updating the
// others' close-lists).
const M_ADD_PICKER_IDS = ['mAddPickOpts', 'mAddStoreOpts', 'mAddDayOpts', 'mAddDomOpts', 'mAddCadenceOpts', 'mAddTvStartOpts', 'mAddTvEndOpts', 'mAddRecStartOpts'];
function _mCloseAddPickers(exceptId) {
  M_ADD_PICKER_IDS.forEach(id => { if (id !== exceptId) document.getElementById(id)?.classList.remove('open'); });
}
// Sizes a dropdown to the space ACTUALLY available above its trigger, instead of a fixed
// guess. Triggers lower in the form (e.g. the category picker, last field before Add) have
// a lot of headroom and can show every option with no scroll; triggers higher up (e.g.
// Cadence, several fields above it) have much less, and a fixed max-height taller than
// that pushed the dropdown's top off-screen — the options were technically scrollable, but
// unreachable above the screen edge, which is what read as "scrolling the background
// instead of the options" (the touch was landing on whatever's behind the off-screen part).
// Called right before opening; harmless to call before closing too.
function _mFitPickerOpts(optsId) {
  const opts = document.getElementById(optsId);
  const btn = opts?.parentElement?.querySelector('.m-cpick-btn');
  if (!opts || !btn) return;
  const available = btn.getBoundingClientRect().top - 12;
  opts.style.maxHeight = Math.max(120, Math.min(available, 320)) + 'px';
}

const M_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let _mAddDay = M_DAYS[new Date().getDay()];
function _mBuildDayOpts() {
  const el = document.getElementById('mAddDayOpts');
  if (!el) return;
  el.innerHTML = M_DAYS.map(d => `<div class="m-cpick-opt" onmousedown="event.preventDefault()" onclick="mSelectDay('${d}')"><span>${d}</span></div>`).join('');
  const lbl = document.getElementById('mAddDayLbl');
  if (lbl) lbl.textContent = _mAddDay;
}
function mToggleDayPick() {
  _mCloseAddPickers();
  _mFitPickerOpts('mAddDayOpts');
  document.getElementById('mAddDayOpts')?.classList.toggle('open');
  _mSyncPickerOpenClass();
}
function mSelectDay(day) {
  _mAddDay = day;
  const lbl = document.getElementById('mAddDayLbl');
  if (lbl) lbl.textContent = day;
  document.getElementById('mAddDayOpts')?.classList.remove('open');
  _mSyncPickerOpenClass();
}

// Day-of-month picker (1st-28th) — Recurring Task's "Due on" when cadence is Monthly.
// Capped at 28 (not 31) matching desktop's own recRepeatDate/wrAddAppearDate options —
// every month has a 28th, so a rule set to "the 30th" would silently skip February.
let _mAddDom = '1';
function _mOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function _mBuildDomOpts() {
  const el = document.getElementById('mAddDomOpts');
  if (!el) return;
  el.innerHTML = Array.from({length: 28}, (_, i) => i + 1).map(d => `<div class="m-cpick-opt" onmousedown="event.preventDefault()" onclick="mSelectDom('${d}')"><span>${_mOrdinal(d)}</span></div>`).join('');
  const lbl = document.getElementById('mAddDomLbl');
  if (lbl) lbl.textContent = _mOrdinal(Number(_mAddDom));
}
function mToggleDomPick() {
  _mCloseAddPickers();
  _mFitPickerOpts('mAddDomOpts');
  document.getElementById('mAddDomOpts')?.classList.toggle('open');
  _mSyncPickerOpenClass();
}
function mSelectDom(dom) {
  _mAddDom = dom;
  const lbl = document.getElementById('mAddDomLbl');
  if (lbl) lbl.textContent = _mOrdinal(Number(dom));
  document.getElementById('mAddDomOpts')?.classList.remove('open');
  _mSyncPickerOpenClass();
}

// Cadence picker — shared by Weekly Reset Task and Recurring Task (mirrors desktop's
// wrAddCadence select, wrRuleAddModal/overview.js). Changing it re-syncs which of
// Due-on-day/Due-on-date/Starting-date show, via _mAddSyncTypeFields.
const M_CADENCES = [
  {v: 'weekly', l: 'Every week'}, {v: 'biweekly', l: 'Every 2 weeks'}, {v: 'monthly', l: 'Monthly'},
  {v: 'quarterly', l: 'Quarterly'}, {v: 'biannual', l: 'Biannual'}, {v: 'annual', l: 'Annual'},
];
let _mAddCadence = 'weekly';
function _mBuildCadenceOpts() {
  const el = document.getElementById('mAddCadenceOpts');
  if (!el) return;
  el.innerHTML = M_CADENCES.map(c => `<div class="m-cpick-opt" onmousedown="event.preventDefault()" onclick="mSelectCadence('${c.v}')"><span>${c.l}</span></div>`).join('');
}
function mToggleCadencePick() {
  _mCloseAddPickers();
  _mFitPickerOpts('mAddCadenceOpts');
  document.getElementById('mAddCadenceOpts')?.classList.toggle('open');
  _mSyncPickerOpenClass();
}
function mSelectCadence(v) {
  _mAddCadence = v;
  const lbl = document.getElementById('mAddCadenceLbl');
  const found = M_CADENCES.find(c => c.v === v);
  if (lbl && found) lbl.textContent = found.l;
  document.getElementById('mAddCadenceOpts')?.classList.remove('open');
  _mSyncPickerOpenClass();
  _mAddSyncTypeFields(_mAddCat); // Due-on-day vs Due-on-date vs Starting-date visibility all depend on cadence too
}

// ── Custom calendar popover (Start/End/Starting date) ─────────────────────────
// Replaces native <input type="date"> for every date field in the quick-add popup — a
// native date input forces the keyboard down for its own wheel picker (same reason Store
// became a custom picker), which fights the "keyboard should stay up" requirement. One
// shared implementation, keyed by which field is open ('tvStart'/'tvEnd'/'recStart').
const M_ADD_DATE_FIELDS = {
  tvStart: {opts: 'mAddTvStartOpts', lbl: 'mAddStartLbl'},
  tvEnd: {opts: 'mAddTvEndOpts', lbl: 'mAddEndLbl'},
  recStart: {opts: 'mAddRecStartOpts', lbl: 'mAddRecStartLbl'},
};
let _mAddDates = {tvStart: null, tvEnd: null, recStart: null}; // 'YYYY-MM-DD' or null
let _mAddDateWhich = null;
let _mAddDateViewY = 0, _mAddDateViewM = 0;
function _mFmtAddDate(ds) {
  return new Date(ds + 'T12:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}
function mToggleDatePick(which) {
  const f = M_ADD_DATE_FIELDS[which];
  if (!f) return;
  const wasOpen = document.getElementById(f.opts)?.classList.contains('open');
  _mCloseAddPickers();
  if (!wasOpen) {
    _mAddDateWhich = which;
    const cur = _mAddDates[which];
    const base = cur ? new Date(cur + 'T12:00') : new Date();
    _mAddDateViewY = base.getFullYear();
    _mAddDateViewM = base.getMonth();
    _mRenderAddDateCal();
    _mFitPickerOpts(f.opts);
    document.getElementById(f.opts)?.classList.add('open');
  }
  _mSyncPickerOpenClass();
}
function _mAddDateNav(dir) {
  _mAddDateViewM += dir;
  if (_mAddDateViewM < 0) { _mAddDateViewM = 11; _mAddDateViewY--; }
  if (_mAddDateViewM > 11) { _mAddDateViewM = 0; _mAddDateViewY++; }
  _mRenderAddDateCal();
}
function _mRenderAddDateCal() {
  const which = _mAddDateWhich;
  const f = M_ADD_DATE_FIELDS[which];
  const el = document.getElementById(f?.opts);
  if (!el) return;
  const y = _mAddDateViewY, m = _mAddDateViewM;
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-start, matches the rest of the app
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const selected = _mAddDates[which];
  const todayDs = tod();
  const monthLbl = first.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += `<span class="m-add-cal-day m-add-cal-empty"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cls = ['m-add-cal-day'];
    if (ds === selected) cls.push('selected');
    if (ds === todayDs) cls.push('today');
    cells += `<button type="button" class="${cls.join(' ')}" onmousedown="event.preventDefault()" onclick="mSelectAddDate('${ds}')">${d}</button>`;
  }
  el.innerHTML = `
    <div class="m-add-cal-hdr">
      <button type="button" class="m-add-cal-nav" onmousedown="event.preventDefault()" onclick="_mAddDateNav(-1)">&lsaquo;</button>
      <span>${monthLbl}</span>
      <button type="button" class="m-add-cal-nav" onmousedown="event.preventDefault()" onclick="_mAddDateNav(1)">&rsaquo;</button>
    </div>
    <div class="m-add-cal-dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
    <div class="m-add-cal-grid">${cells}</div>`;
}
function mSelectAddDate(ds) {
  const which = _mAddDateWhich;
  const f = M_ADD_DATE_FIELDS[which];
  if (!f) return;
  _mAddDates[which] = ds;
  const lbl = document.getElementById(f.lbl);
  if (lbl) lbl.textContent = _mFmtAddDate(ds);
  document.getElementById(f.opts)?.classList.remove('open');
  _mSyncPickerOpenClass();
}

function mInitPickers() {
  _mBuildOpts('mAddPickOpts',     'add',     M_CATS_ADD);
  _mBuildOpts('mEditPickOpts',    'edit');
  _mBuildOpts('mBlockPickOpts',   'block');
  _mBuildOpts('mFullAddPickOpts', 'fulladd', M_CATS_TRAVEL);
  _mBuildDayOpts();
  _mBuildDomOpts();
  _mBuildCadenceOpts();
  mSelectCat('add',     'Home');
  mSelectCat('block',   'Home');
  mSelectCat('fulladd', 'Home');
  document.addEventListener('click', e => {
    if (!e.target.closest('.m-cpick')) {
      ['mEditPickOpts','mBlockPickOpts','mFullAddPickOpts','mShopAddStoreOpts','mShopEditStoreOpts'].forEach(id => {
        document.getElementById(id)?.classList.remove('open');
      });
      _mCloseAddPickers();
      _mSyncPickerOpenClass();
    }
    if (!e.target.closest('#mMonthHeaderControls')) {
      document.getElementById('mMonthMonthDrop')?.classList.remove('open');
      document.getElementById('mMonthYearDrop')?.classList.remove('open');
    }
  }, true);
}

// ── Sort today ────────────────────────────────────────────────────────────────
// Type priority — exact port of desktop's taskTypePri (overview.js)
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
// Manual per-day order — exact port of desktop's _dayOrder/_dayOrderSet (overview.js).
// Same localStorage key as desktop, so the underlying data model matches exactly (only
// the drag gesture that writes it differs — see mInitTodayDrag below).
function _dayOrder() { try { return JSON.parse(localStorage._dayOrder || '{}'); } catch (e) { return {}; } }
function _dayOrderSet(m) { localStorage._dayOrder = JSON.stringify(m); }
// Exact port of desktop's _manualTieBreak/_hardTierNatural (overview.js) — once the hard
// tiers (travel/birthday/overdue/done) agree, a saved manual order for this day wins
// outright when BOTH compared items are in it; otherwise falls to the natural fallback
// (important -> [timeblock, mSortDayTasks only] -> type priority -> name).
function _mManualTieBreak(a, b, ds, naturalFn) {
  const order = ds ? _dayOrder()[ds] : null;
  if (!order || !order.length) return naturalFn();
  const ai = order.indexOf(String(a.id)), bi = order.indexOf(String(b.id));
  if (ai < 0 && bi < 0) return naturalFn();
  if (ai < 0) return 1;
  if (bi < 0) return -1;
  return ai - bi;
}
function _mHardTierNatural(a, b) {
  const aI = (a.important || a._type === 'fin-cancel') && !a.done, bI = (b.important || b._type === 'fin-cancel') && !b.done;
  if (aI && !bI) return -1; if (!aI && bI) return 1;
  return _mTaskTypePri(a) - _mTaskTypePri(b) || (a.name || '').localeCompare(b.name || '');
}
function mSortToday(tasks) {
  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();
  return mSortDayTasks(tasks, ds);
}
// Shared day sort — exact port of desktop sortTasksForDay (used by Today, Week, Month),
// hard-tier order corrected 2026-08-26 to match desktop's current stack (travel > birthday/
// holiday > overdue > done, THEN manual day order, else timeblock/important/type/name) —
// was previously birthday > done > travel > overdue > important > timeblock > type > name,
// and had no manual-order tie-break at all.
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
    const aT = a._type === 'travel' && !a.done, bT = b._type === 'travel' && !b.done;
    if (aT && !bT) return -1; if (!aT && bT) return 1;
    const aB = a._type === 'birthday' || a._type === 'holiday', bB = b._type === 'birthday' || b._type === 'holiday';
    if (aB && !bB) return -1; if (!aB && bB) return 1;
    const aO = isOv(a.due_date) && !a.done, bO = isOv(b.due_date) && !b.done;
    if (aO && !bO) return -1; if (!aO && bO) return 1;
    if (a.done && !b.done) return 1; if (!a.done && b.done) return -1;
    return _mManualTieBreak(a, b, ds, () => {
      const aSm = tbSm(a), bSm = tbSm(b);
      if (aSm !== null && bSm === null) return -1;
      if (aSm === null && bSm !== null) return 1;
      if (aSm !== null && bSm !== null) return aSm - bSm;
      return _mHardTierNatural(a, b);
    });
  });
}

// ── Gather today's tasks ──────────────────────────────────────────────────────
function mGetTodayTasks() {
  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();
  // Week offset of the day being viewed (0 = this week, +N = N weeks ahead) — matches desktop's
  // _wkHi (overview.js) so swiping the Today tab forward into a future week still finds
  // recurring/WR items pinned there instead of only ever looking at week 0 and back.
  const _mDayWkOff = Math.round((new Date(dsToWkKey(ds) + 'T00:00:00') - new Date(getWkKey(0) + 'T00:00:00')) / (7 * 86400000));
  const _mWkHi = Math.max(0, _mDayWkOff);
  const _mWkLo = Math.min(0, _mDayWkOff) - 4;

  const ts = st.tasks.filter(t => {
    if (!t.due_date || t.category === 'Weekly Goals') return false;
    const tds = t.due_date.split('T')[0];
    if (tds === ds) return true;
    if (_mTodayOffset === 0 && isOv(t.due_date) && !t.done) return true;
    return false;
  });

  const allRecVirt = [];
  for (let w = _mWkHi; w >= _mWkLo; w--) {
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
  for (let _w = _mWkHi; _w >= _mWkLo; _w--) {
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
  for (let _w = _mWkHi; _w >= _mWkLo; _w--) {
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
      // name must match desktop exactly (overview.js renderToday's pupSessToday) — the
      // sort's final tiebreak is alphabetical by name, so a mobile-only "Pup: " prefix
      // here silently made mobile's order diverge from desktop's even with byte-identical
      // sort code, since they were comparing different strings.
      return {id: 'pup-sess-' + s.id, name: skill.skill, category: 'Recurring', due_date: s.day_date, done: s.done, _pupSessId: s.id, _skillId: s.skill_id, _virtual: true, _type: 'pup'};
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
  const s = ov ? (_isDk() ? OV_DARK : OV) : (t.important && !t.done) ? (_isDk() ? IMP_DARK : IMP) : gc(catKey);
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
  // Overdue regular/shopping tasks get a one-tap reschedule to today
  const canMv = ov && (canEdit || t._type === 'shop' || t._type === 'vidstep' || t._type === 'vid' || t._type === 'pup' || t._isWrec || t._isWrRule || (t._virtual && t._recId));
  const mvArgs = canMv ? _mMoveToTodayArgs(t) : null;
  // rec/wrec/wrrule route through _mOvRowMoveClick first — a miss from a genuine past
  // week is a schedule decision (4-option prompt), not a silent move; same-week misses
  // still move directly (that dispatch lives inside _mOvRowMoveClick itself).
  const _mvIsRecurring = mvArgs && (mvArgs[1] === 'wrrule' || mvArgs[1] === 'wrec' || mvArgs[1] === 'rec');
  const mvBtn = canMv
    ? (_mvIsRecurring
        ? `<button class="m-mv-today" onclick="event.stopPropagation();_mOvRowMoveClick('${mvArgs[1]}','${mvArgs[0]}','${mvArgs[2]}')">→ Today</button>`
        : `<button class="m-mv-today" onclick="event.stopPropagation();mMoveToToday('${mvArgs[0]}','${mvArgs[1]}'${mvArgs[2] !== undefined ? `,'${mvArgs[2]}'` : ''})">→ Today</button>`)
    : '';

  // Two-tone band (light fill + darker outline), same pairing the old dot indicator used
  // (s.bg/s.d), instead of one flat vivid line — and inset top/bottom so it reads as a
  // mark on this row, not a continuous stripe running through the whole list.
  const band = `<span style="position:absolute;left:6px;top:8px;bottom:8px;width:3px;border-radius:3px;background:${s.bg};border:1px solid ${s.d}"></span>`;
  const inner = `<div class="m-row${t.done ? ' m-done' : ''}${ov ? ' m-ov' : ''}">
    ${band}
    ${noCheck
      ? `<span class="m-row-icon">${t._type === 'holiday' ? '' : t._type === 'birthday' ? '🎂' : '📅'}</span>`
      : `<label class="m-chk-wrap"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="${onchange}"></label>`
    }
    <span class="m-row-name${t.done ? ' done' : ''}">${safeName}</span>
    ${mvBtn}
  </div>`;

  // data-rid: every row, any type — lets drag-reorder capture the FULL day order (matches
  // desktop's .ti[id^="ti-"] full-list capture) and lets hold-drag reorder ANY row.
  // data-tid: canEdit rows only — real tasks, used for edit routing and mDeleteById.
  // data-rtype/data-shopid: which edit/menu surface (if any) a plain tap should route to
  // — mInitTodayDblTap/_mShowTaskMenu read these instead of re-deriving type from the id
  // string, since a virtual task's full object doesn't persist anywhere after render.
  const rtype = canEdit ? 'task' : (t._type || (t._isWrec ? 'wrec' : t._isWrRule ? 'wrrule' : t._virtual ? 'rec' : 'other'));
  const ruleId = t._isWrRule ? t._ruleId : t._recId;
  const extraAttrs = [
    rtype === 'shop' ? ` data-shopid="${t._shopId}"` : '',
    (rtype === 'wrec' || rtype === 'wrrule' || rtype === 'rec') && ruleId !== undefined ? ` data-ruleid="${ruleId}" data-wkkey="${t._wkKey || ''}"` : '',
    rtype === 'vid' && t._vidId !== undefined ? ` data-vidid="${t._vidId}"` : '',
    rtype === 'vidstep' && t._vidId !== undefined ? ` data-vidid="${t._vidId}" data-vidstep="${t._vidStep}" data-day="${t.due_date}"` : ''
  ].join('');
  return `<div class="m-row-outer" data-rid="${t.id}" data-rtype="${rtype}"${canEdit ? ` data-tid="${t.id}"` : ''}${extraAttrs}>
    ${inner}
  </div>`;
}

// ── Render today ──────────────────────────────────────────────────────────────
// Same "is this row overdue and movable" test mTaskRow uses per-row (canMv) — kept in
// sync manually since mTaskRow works off already-built row HTML, not a reusable predicate.
function _mIsOvMovable(t) {
  if (t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday') return false;
  return isOv(t.due_date) && !t.done;
}
// Ring circumference for r=13 (matches the SVG in mobile.html) — stroke-dashoffset
// counts DOWN from this as tasks complete, so an untouched ring starts fully empty.
// r=13 in a 30x30 viewBox (1 SVG unit = 1px) puts the ring's outer edge close to the
// true 30px boundary, matching the visual footprint of the other 30px bordered icon
// circles instead of reading smaller (the previous 36-unit viewBox scaled the r=15.5
// ring down to ~26px, visibly shy of the other circles' full 30px).
const M_PROG_RING_C = 2 * Math.PI * 13.5;
function mRenderToday() {
  const sorted = mGetTodayTasks();
  const doneCount = sorted.filter(t => t.done).length;
  const progEl = document.getElementById('mProgress');
  if (progEl && _mCurTab === 'today') {
    // 0/0 counts as complete (green) too — yellow should mean "something's left to do
    // today," not just "the list happens to be non-empty." Was gated on sorted.length>0,
    // which left a 0-task day stuck yellow for no reason.
    const complete = doneCount === sorted.length;
    // Ring reads fully filled (not empty) on a 0-task day — matches the "all clear" green
    // state visually instead of an empty green outline, which would look unfinished.
    const pct = sorted.length ? doneCount / sorted.length : 1;
    const fg = document.getElementById('mProgressFg');
    if (fg) fg.style.strokeDashoffset = M_PROG_RING_C * (1 - pct);
    const txt = document.getElementById('mProgressTxt');
    if (txt) txt.textContent = doneCount + '/' + sorted.length;
    progEl.classList.toggle('m-prog-complete', complete);
  }
  const el = document.getElementById('mTodayList');
  if (!el) return;
  // Two distinct empty-list states, same checkmark icon for both: a day with tasks that
  // are ALL checked off gets the celebratory "All done for today" label; a day with no
  // tasks at all gets the same icon but no label (there's nothing to declare "done").
  // Previously only the true-empty case showed this screen at all, and it wrongly carried
  // the "All done" text — a fully-completed day just rendered its (all-checked) rows.
  const emptyIcon = `<div class="m-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
  if (!sorted.length) {
    el.innerHTML = `<div class="m-empty">${emptyIcon}<div class="m-empty-txt"></div></div>`;
  } else if (doneCount === sorted.length) {
    el.innerHTML = `<div class="m-empty">${emptyIcon}<div class="m-empty-txt">All done for today</div></div>`;
  } else {
    el.innerHTML = sorted.map(mTaskRow).join('');
  }
  const banner = document.getElementById('mOvBanner');
  if (banner) {
    // Only makes sense while actually viewing today — swiping to a future/past day (Today
    // tab's own day-swipe) has its own row-level "→ Today" buttons instead, same scoping
    // desktop's ovBanner uses (dayOff!==0 hides it there too).
    const ovCount = _mTodayOffset === 0 ? sorted.filter(_mIsOvMovable).length : 0;
    if (ovCount > 0) {
      banner.textContent = `${ovCount} Overdue – Move All to Today`;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }
  _mUpdateTodayHeader();
  _mInitTodaySwipe();
}
// Bulk version of each row's own "→ Today" button. Recurring/WR items miss from a genuine
// PAST week (not this week) are a real schedule decision (see _mOvRowMoveClick) — those are
// left for their own row's button rather than silently guessed at here; same-week items and
// every other overdue type move immediately, mirroring desktop's rolloverOverdue() split
// between a silent bulk sweep and items that need a real prompt.
function mMoveAllOverdueToToday() {
  if (_mTodayOffset !== 0) return;
  const curWk = getWkKey(0);
  const items = mGetTodayTasks().filter(_mIsOvMovable);
  if (!items.length) return;
  let moved = 0, deferred = 0;
  items.forEach(t => {
    const [id, kind, extra] = _mMoveToTodayArgs(t);
    const isRecurring = kind === 'wrrule' || kind === 'wrec' || kind === 'rec';
    if (isRecurring && extra && extra !== curWk) { deferred++; return; }
    mMoveToToday(id, kind, extra);
    moved++;
  });
  if (moved && deferred) showToast(`Moved ${moved} to today – ${deferred} need review below`, '#7c6af7', 2200);
  else if (moved) showToast(`Moved ${moved} to today`, '#7c6af7', 1600);
  else if (deferred) showToast(`${deferred} recurring item${deferred > 1 ? 's' : ''} need review – use their own → Today button`, '#f59e0b', 2400);
}

// ── Add task ──────────────────────────────────────────────────────────────────
// Quick-add popup open/close — #mAddBar itself is unchanged (same form/fields/IDs as
// when it was permanently docked), just gated behind a tap on #mTodayAddBtn now.
// Keeps #mAddBar's bottom edge pinned just above the on-screen keyboard, live, as it
// animates open/closed — window.visualViewport (iOS Safari 13+) reports the SHRUNK
// viewport height while the keyboard is up; window.innerHeight does not change, so the
// gap between the two is (approximately) the keyboard's own height. Only acts while the
// bar is actually open (cheap early-out on every resize/scroll tick otherwise).
function _mQuickAddReposition() {
  const bar = document.getElementById('mAddBar');
  if (!bar || !bar.classList.contains('open')) return;
  const vv = window.visualViewport;
  // Deliberately ignores vv.offsetTop (page SCROLL position) — only vv.height (the
  // keyboard's actual height) should move the bar. Including offsetTop made the bar jump
  // every time focus moved between fields in the SAME form (Link after Store, say): iOS
  // auto-scrolls the page to keep a newly-focused field visible, which changes offsetTop
  // even though the keyboard itself never resized, and the bar visibly jumped for no
  // keyboard-related reason. Same logic is why there's no 'scroll' listener below any more.
  const kbHeight = vv ? Math.max(0, window.innerHeight - vv.height) : 0;
  bar.style.bottom = (kbHeight + 10) + 'px';
}
function _mInitQuickAddKeyboardTracking() {
  if (!window.visualViewport || window.visualViewport._quickAddTracked) return;
  window.visualViewport._quickAddTracked = true;
  window.visualViewport.addEventListener('resize', _mQuickAddReposition);
}
function mOpenQuickAdd() {
  _mInitQuickAddKeyboardTracking();
  document.getElementById('mAddBar')?.classList.add('open');
  document.getElementById('mQuickAddBackdrop')?.classList.add('open');
  // Focus synchronously, in the same tick as the tap that opened this — iOS Safari only
  // reliably raises the keyboard for a programmatic .focus() when it happens inside the
  // original user-gesture call stack; a setTimeout (even a short one) falls outside that
  // window and the input can end up focused with no keyboard, which reads as "still have
  // to tap it myself."
  document.getElementById('mNewTask')?.focus();
  // The keyboard animates in over the next few hundred ms — visualViewport 'resize' fires
  // repeatedly during that animation, so this call is just the starting position; live
  // tracking takes over from there.
  _mQuickAddReposition();
}
function mCloseQuickAdd() {
  document.getElementById('mAddBar')?.classList.remove('open');
  document.getElementById('mQuickAddBackdrop')?.classList.remove('open');
  // Hiding the bar visually (opacity) doesn't blur its input — the field keeps DOM focus,
  // so the iOS keyboard stayed on screen after Enter/Add even though the popup itself
  // disappeared. Explicit blur is what actually dismisses it.
  document.getElementById('mNewTask')?.blur();
}
function mToggleQuickAdd() {
  document.getElementById('mAddBar')?.classList.contains('open') ? mCloseQuickAdd() : mOpenQuickAdd();
}

// Shop's add-item popup — exact port of the Today quick-add open/close/reposition trio
// above, scoped to #mShopAddBar/#mShopAddBackdrop/#mShopNewName instead.
function _mShopAddReposition() {
  const bar = document.getElementById('mShopAddBar');
  if (!bar || !bar.classList.contains('open')) return;
  const vv = window.visualViewport;
  const kbHeight = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  bar.style.bottom = (kbHeight + 10) + 'px';
}
function _mInitShopAddKeyboardTracking() {
  if (!window.visualViewport || window.visualViewport._shopAddTracked) return;
  window.visualViewport._shopAddTracked = true;
  window.visualViewport.addEventListener('resize', _mShopAddReposition);
  window.visualViewport.addEventListener('scroll', _mShopAddReposition);
}
function mOpenShopAdd() {
  _mInitShopAddKeyboardTracking();
  document.getElementById('mShopAddBar')?.classList.add('open');
  document.getElementById('mShopAddBackdrop')?.classList.add('open');
  document.getElementById('mShopNewName')?.focus();
  _mShopAddReposition();
}
function mCloseShopAdd() {
  document.getElementById('mShopAddBar')?.classList.remove('open');
  document.getElementById('mShopAddBackdrop')?.classList.remove('open');
  document.getElementById('mShopAddStoreOpts')?.classList.remove('open');
  document.getElementById('mShopNewName')?.blur();
}
function mToggleShopAdd() {
  document.getElementById('mShopAddBar')?.classList.contains('open') ? mCloseShopAdd() : mOpenShopAdd();
}

// Shop add bar's store picker — exact port of Today's own mToggleStorePick/mSelectStore
// (used by the Shopping-type add fields there), scoped to #mShopAddStoreOpts instead.
let _mShopAddStore = 'HEB';
function mToggleShopAddStorePick() {
  document.getElementById('mShopAddStoreOpts')?.classList.toggle('open');
}
function mSelectShopAddStore(store) {
  _mShopAddStore = store;
  const lbl = document.getElementById('mShopAddStoreLbl');
  if (lbl) lbl.textContent = store;
  document.getElementById('mShopAddStoreOpts')?.classList.remove('open');
  const isOther = store === 'Other';
  const f = document.getElementById('mShopAddStoreCustomField');
  if (f) f.style.display = isOther ? '' : 'none';
  if (isOther) document.getElementById('mShopAddStoreCustom')?.focus();
}

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
  if (cat === 'Travel') {
    const dest = document.getElementById('mAddDest')?.value.trim() || null;
    const start = _mAddDates.tvStart || ds;
    const end = _mAddDates.tvEnd || null;
    await _mAddTravel(n, dest, start, end, null);
    inp.value = '';
    const destEl = document.getElementById('mAddDest'); if (destEl) destEl.value = '';
    _mAddDates.tvStart = null; _mAddDates.tvEnd = null;
    const sl = document.getElementById('mAddStartLbl'); if (sl) sl.textContent = 'Today';
    const el = document.getElementById('mAddEndLbl'); if (el) el.textContent = 'Select…';
    mCloseQuickAdd();
    return;
  }
  if (cat === 'Shopping') {
    let store = _mAddStore || 'Online';
    if (store === 'Other') store = document.getElementById('mAddStoreCustom')?.value.trim() || 'Other';
    const link = document.getElementById('mAddLink')?.value.trim() || null;
    const s = {id: 'l-' + Date.now(), name: n, store, link, done: false, due_date: ds};
    st.shopping.push(s);
    save();
    inp.value = '';
    const storeCustomEl = document.getElementById('mAddStoreCustom'); if (storeCustomEl) storeCustomEl.value = '';
    const linkEl = document.getElementById('mAddLink'); if (linkEl) linkEl.value = '';
    mCloseQuickAdd();
    renderAll(); // not just mRenderToday() — this popup now also opens from Week's header "+"
    const sv = await sbReq('POST', 'shopping_list', {name: n, store, link, done: false, due_date: ds});
    if (sv && sv[0]) {
      const i = st.shopping.findIndex(x => x.id === s.id);
      if (i > -1) st.shopping[i] = sv[0];
      save();
      renderAll(); // same data-shopid staleness fix as the plain-task id swap below — also
                   // keeps Week's list in sync when this add came from Week's header "+"
    }
    return;
  }
  if (cat === 'Weekly Reset Task' || cat === 'Recurring Task') {
    const isWeeklyReset = cat === 'Weekly Reset Task';
    const pupRelated = isWeeklyReset && !!document.getElementById('mAddPupCk')?.checked;
    await _mAddRecurring(n, isWeeklyReset, {
      cadence: _mAddCadence,
      dayOfWeek: _mAddDay,
      dayOfMonth: _mAddDom,
      startingDate: _mAddDates.recStart,
      pupRelated,
    });
    inp.value = '';
    const pupCk = document.getElementById('mAddPupCk'); if (pupCk) pupCk.checked = false;
    _mAddDates.recStart = null;
    const l = document.getElementById('mAddRecStartLbl'); if (l) l.textContent = 'Today';
    mCloseQuickAdd();
    return;
  }
  const important = _mAddImportant;
  const t = {id: 'l-' + Date.now(), name: n, category: cat, due_date: ds, done: false, important};
  st.tasks.push(t);
  save();
  inp.value = '';
  _mAddImportant = false;
  mCloseQuickAdd();
  document.getElementById('mAddFlagBtn')?.classList.remove('flagged');
  renderAll(); // not just mRenderToday() — this popup now also opens from Week's header "+"
  const sv = await sbReq('POST', 'tasks', {name: n, category: cat, due_date: ds, done: false, important});
  if (sv && sv[0]) {
    const i = st.tasks.findIndex(x => x.id === t.id);
    if (i > -1) st.tasks[i] = sv[0];
    save();
    // Row's data-tid still points at the temp local id until this re-renders — tapping it
    // in that window looked up a task that no longer existed under that id (silently found
    // nothing, so the menu never opened). The gap is normally sub-second, but real enough
    // to hit if you tap the row right after adding it.
    renderAll();
  }
}

// Creates a trip in st.travel — shared by the bottom quick-add bar (single day, today)
// and the full-add sheet's Travel mode (optional destination/end date/mode).
async function _mAddTravel(name, destination, start, end, mode) {
  const tv = {id: 'l-' + Date.now(), name, destination: destination || null, start_date: start, end_date: end || null, travel_mode: mode || null, notes: null};
  st.travel.push(tv);
  save();
  renderAll();
  pushUndo(() => { st.travel = st.travel.filter(x => x.id !== tv.id); save(); renderAll(); sbReq('DELETE', 'travel', null, `?id=eq.${tv.id}`); }, 'Added trip');
  const sv = await sbReq('POST', 'travel', {name, destination: destination || null, start_date: start, end_date: end || null, travel_mode: mode || null, notes: null});
  if (sv && sv[0]) {
    // Mutate tv in place (rather than replacing the array entry) so tv.id — captured by the
    // pushUndo closure above — reflects the real DB id if Undo is tapped after this resolves.
    Object.assign(tv, sv[0]);
    save(); renderAll();
  }
}

// Creates a real wr_recurring_rules row — same table AND payload shape desktop's Add
// Recurring modal writes (saveRecModal/saveWrRuleAdd, features.js/overview.js), scoped to
// the weekly cadence only (desktop also has biweekly/monthly/quarterly/etc., each with
// their own extra fields — not ported here yet). The is_weekly_reset flag is what actually
// distinguishes the two mobile "types": true → a WR rule (st.wrRules, resets automatically
// every week, no due-day of its own); false → a plain recurring task (st.recurring, due on
// a specific weekday every week, appears_on_date carries which one).
// opts: {cadence, dayOfWeek, dayOfMonth, startingDate, pupRelated}. Field shape/visibility
// per type mirrors desktop's saveWrRuleAdd + _wrReadCadenceFields (overview.js) exactly:
// - WR (is_weekly_reset:true): NEVER gets appears_on_date (WR items have no due-day of
//   their own). starting_date is null for weekly cadence, the picked date otherwise.
// - Recurring (is_weekly_reset:false): always gets starting_date (the picked date, default
//   today) and appears_on_date — day-of-month string for monthly cadence, day-of-week name
//   otherwise.
async function _mAddRecurring(name, isWeeklyReset, opts) {
  const cadence = opts.cadence || 'weekly';
  if (isWeeklyReset) {
    const startingDate = cadence !== 'weekly' ? (opts.startingDate || null) : null;
    const payload = {name, is_weekly_reset: true, is_enabled: true, sort_order: (st.wrRules || []).length, cadence, starting_date: startingDate, pup_related: !!opts.pupRelated, notes: null};
    const tmpId = 'wrrule-tmp-' + Date.now();
    const local = {...payload, id: tmpId};
    st.wrRules = st.wrRules || [];
    st.wrRules.push(local);
    save(); renderAll();
    pushUndo(() => { st.wrRules = st.wrRules.filter(x => String(x.id) !== String(local.id)); save(); renderAll(); if (String(local.id) !== tmpId) sbReq('DELETE', 'wr_recurring_rules', null, `?id=eq.${local.id}`); }, 'Added weekly reset task');
    const sv = await sbReqSilent('POST', 'wr_recurring_rules', payload, '');
    if (sv && sv[0]) {
      const i = st.wrRules.findIndex(x => String(x.id) === tmpId);
      if (i > -1) st.wrRules[i] = sv[0]; else st.wrRules.push(sv[0]);
      local.id = sv[0].id;
      save(); renderAll();
    }
  } else {
    const startDate = opts.startingDate || tod();
    const appearsOn = cadence === 'monthly' ? (opts.dayOfMonth || '1') : (opts.dayOfWeek || 'Friday');
    const payload = {name, is_weekly_reset: false, appears_on_date: appearsOn, cadence, starting_date: startDate};
    const tmpId = 'rec-tmp-' + Date.now();
    const local = {...payload, id: tmpId, _doneByWk: {}, _done: false, _dateOverrides: {}};
    st.recurring.push(local);
    save(); renderAll();
    pushUndo(() => { st.recurring = st.recurring.filter(x => String(x.id) !== String(local.id)); save(); renderAll(); if (String(local.id) !== tmpId) sbReq('DELETE', 'wr_recurring_rules', null, `?id=eq.${local.id}`); }, 'Added recurring task');
    const sv = await sbReq('POST', 'wr_recurring_rules', payload);
    if (sv && sv[0]) {
      const i = st.recurring.findIndex(x => String(x.id) === tmpId);
      const entry = {...sv[0], _doneByWk: {}, _done: false, _dateOverrides: {}};
      if (i > -1) st.recurring[i] = entry; else st.recurring.push(entry);
      local.id = sv[0].id;
      save(); renderAll();
    }
  }
}

// ── Edit task sheet ───────────────────────────────────────────────────────────
let _mEditId = null;

function mToggleEditImp() {
  _mEditImportant = !_mEditImportant;
  const btn = document.getElementById('mEditImpBtn');
  if (btn) btn.classList.toggle('flagged', _mEditImportant);
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
  if (btn) btn.classList.toggle('flagged', _mEditImportant);
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

// ── Recurring/WR edit sheet (name/notes/important) ────────────────────────────────
// Both wrec (old-style WR recurring) and rec (non-WR recurring) live in st.recurring;
// wrrule (new-style WR rules) lives in st.wrRules — both PATCH the same
// wr_recurring_rules table server-side (confirmed via existing mobile PATCH call sites),
// so one save path covers all three. Cadence/schedule editing is NOT included here —
// that's desktop's much larger openRecEditModal (monthly modes, nth-weekday, per-
// occurrence overrides, etc.); scoping this to what's safe to ship now.
let _mRecEditId = null, _mRecEditType = null, _mRecEditImportant = false;
function mOpenRecEdit(outer) {
  const rtype = outer.dataset.rtype;
  const ruleId = outer.dataset.ruleid;
  if (!ruleId) return;
  const r = (rtype === 'wrrule' ? st.wrRules : st.recurring).find(x => String(x.id) === String(ruleId));
  if (!r) return;
  _mRecEditId = ruleId;
  _mRecEditType = rtype;
  _mRecEditImportant = !!r.important;
  document.getElementById('mRecEditName').value = r.name || '';
  document.getElementById('mRecEditNotes').value = r.notes || '';
  document.getElementById('mRecEditImpBtn').classList.toggle('flagged', _mRecEditImportant);
  document.getElementById('mRecEditBackdrop').classList.add('open');
  document.getElementById('mRecEditSheet').classList.add('open');
}
function mCloseRecEdit() {
  _mRecEditId = null;
  document.getElementById('mRecEditBackdrop').classList.remove('open');
  document.getElementById('mRecEditSheet').classList.remove('open');
}
function mToggleRecEditImp() {
  _mRecEditImportant = !_mRecEditImportant;
  document.getElementById('mRecEditImpBtn').classList.toggle('flagged', _mRecEditImportant);
}
function mSaveRecEdit() {
  const id = _mRecEditId, type = _mRecEditType;
  if (!id) return;
  const name = document.getElementById('mRecEditName').value.trim();
  if (!name) return;
  const notes = document.getElementById('mRecEditNotes').value;
  const arr = type === 'wrrule' ? st.wrRules : st.recurring;
  const r = arr.find(x => String(x.id) === String(id));
  if (!r) return;
  const prev = {name: r.name, notes: r.notes, important: r.important};
  r.name = name; r.notes = notes; r.important = _mRecEditImportant;
  save();
  mCloseRecEdit();
  renderAll();
  sbReq('PATCH', 'wr_recurring_rules', {name, notes, important: _mRecEditImportant}, `?id=eq.${id}`);
  pushUndo(() => {
    const r2 = arr.find(x => String(x.id) === String(id));
    if (r2) Object.assign(r2, prev);
    save();
    renderAll();
    sbReq('PATCH', 'wr_recurring_rules', prev, `?id=eq.${id}`);
  }, 'Edited recurring task');
}

// ── Recurring/WR quick-actions sheet (#mWrActionsSheet) ────────────────────────────
// Skip this week / Move all future ±1 week / Move this occurrence only ±1 week / Edit —
// mirrors desktop's WR right-click context menu (showWrRuleCtx, overview.js) content,
// flattened into one column and reordered by actual usage frequency (skip is the most
// common action, all-future shifts next-most). All the underlying state changes
// (_dateOverrides, starting_date, wr_recurring_overrides rows) are identical to desktop's
// via the _mWrShiftThisWeek/_mWrShiftAllFuture ports above, so a change made here shows
// up on desktop on its next sync — this is not mobile-only local state.
let _mWrActionsRtype = null, _mWrActionsRuleId = null, _mWrActionsWkKey = null, _mWrActionsEl = null;
function _mShowWrActions(el) {
  const rtype = el.dataset.rtype;
  const ruleId = el.dataset.ruleid;
  const wkKey = el.dataset.wkkey;
  if (!ruleId) return;
  const r = (rtype === 'wrrule' ? st.wrRules : st.recurring).find(x => String(x.id) === String(ruleId));
  if (!r) return;
  _mWrActionsRtype = rtype;
  _mWrActionsRuleId = ruleId;
  _mWrActionsWkKey = wkKey;
  _mWrActionsEl = el;
  document.getElementById('mWrActionsTitle').textContent = r.name || '';
  document.getElementById('mWrActionsBackdrop').classList.add('open');
  document.getElementById('mWrActionsSheet').classList.add('open');
}
function mCloseWrActions() {
  document.getElementById('mWrActionsBackdrop').classList.remove('open');
  document.getElementById('mWrActionsSheet').classList.remove('open');
}
// "Skip this week" — ports skipWRec/skipRecVirtThisWk's (features.js) block-cleanup
// behavior for the wrec/rec case, but keys the cleanup off dsToWkKey(b.ds)===wkKey (the
// row's OWN week) instead of desktop's isInWk(b.ds, wkOff) (a "currently viewed week"
// global mobile has no equivalent of — same substitution _mWriteWrOverride already made
// for wrrule). wrrule reuses the existing _mWriteWrOverride port directly, which already
// does this correctly.
function mWrActionsSkip() {
  const rtype = _mWrActionsRtype, ruleId = _mWrActionsRuleId, wkKey = _mWrActionsWkKey;
  mCloseWrActions();
  if (!wkKey) return;
  if (rtype === 'wrrule') {
    _mWriteWrOverride(ruleId, wkKey, {override_type: 'skip'}, {undoLabel: 'Skipped WR task this week'});
    return;
  }
  const r = st.recurring.find(x => String(x.id) === String(ruleId));
  if (!r) return;
  if (!r._dateOverrides) r._dateOverrides = {};
  const prev = r._dateOverrides[wkKey];
  r._dateOverrides[wkKey] = '__skip__';
  const linkedBlocks = (st.blocks || []).filter(b => (String(b.recId) === String(ruleId) || String(b.ruleId) === String(ruleId)) && dsToWkKey(b.ds) === wkKey);
  st.blocks = (st.blocks || []).filter(b => !linkedBlocks.some(lb => lb.id === b.id));
  save(); renderAll();
  linkedBlocks.forEach(b => sbDeleteBlock(b.id));
  sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, recQs(ruleId));
  pushUndo(() => {
    if (prev !== undefined) r._dateOverrides[wkKey] = prev; else delete r._dateOverrides[wkKey];
    linkedBlocks.forEach(b => { st.blocks.push(b); sbSaveBlock(b); });
    save(); renderAll();
    sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, recQs(ruleId));
  }, 'Skipped recurring task this week');
}
function mWrActionsAllFuture(delta) {
  const rtype = _mWrActionsRtype, ruleId = _mWrActionsRuleId, wkKey = _mWrActionsWkKey;
  mCloseWrActions();
  if (!wkKey) return;
  _mWrShiftAllFuture(rtype, ruleId, wkKey, delta * 7);
}
function mWrActionsThisWeek(delta) {
  const rtype = _mWrActionsRtype, ruleId = _mWrActionsRuleId, wkKey = _mWrActionsWkKey;
  mCloseWrActions();
  if (!wkKey) return;
  // delta here is a direction (1 or -1) from the button; _mWrShiftThisWeek (like desktop's
  // _wrShiftAnchorOne) wants an actual day offset, so scale to a full week same as
  // mWrActionsAllFuture does.
  _mWrShiftThisWeek(rtype, ruleId, wkKey, delta * 7);
}
function mWrActionsEdit() {
  const el = _mWrActionsEl;
  mCloseWrActions();
  if (el) mOpenRecEdit(el);
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

// Overdue → Today button on the today list. Args per type — mirrors what desktop's
// bulk rolloverOverdue() covers, just scoped to one row.
function _mMoveToTodayArgs(t) {
  if (t._type === 'shop') return [t._shopId, 'shop'];
  if (t._type === 'vidstep') return [t._vidId, 'vidstep', t._vidStep + '::' + t.due_date];
  if (t._type === 'vid') return [t._vidId, 'vid'];
  if (t._type === 'pup') return [t._pupSessId, 'pup'];
  if (t._isWrRule) return [t._ruleId, 'wrrule', t._wkKey];
  if (t._isWrec) return [t._recId, 'wrec', t._wkKey];
  if (t._virtual && t._recId) return [t._recId, 'rec', t._wkKey];
  return [t.id, 'task'];
}

function mMoveToToday(id, type, extra) {
  const today = d2s(getDayDate(0));
  if (type === 'shop') {
    const s = st.shopping.find(x => String(x.id) === String(id));
    if (!s) return;
    const prev = s.due_date;
    s.due_date = today;
    save();
    sbReq('PATCH', 'shopping_list', {due_date: today}, `?id=eq.${id}`);
    pushUndo(() => { const s2 = st.shopping.find(x => String(x.id) === String(id)); if (s2) s2.due_date = prev; save(); renderAll(); sbReq('PATCH', 'shopping_list', {due_date: prev}, `?id=eq.${id}`); }, 'Moved to today');
  } else if (type === 'pup') {
    const s = (st.pupSessions || []).find(x => String(x.id) === String(id));
    if (!s) return;
    const prev = s.day_date;
    s.day_date = today;
    save();
    sbReqSilent('PATCH', 'pup_skill_sessions', {day_date: today}, `?id=eq.${id}`);
    pushUndo(() => { const s2 = (st.pupSessions || []).find(x => String(x.id) === String(id)); if (s2) s2.day_date = prev; save(); renderAll(); sbReqSilent('PATCH', 'pup_skill_sessions', {day_date: prev}, `?id=eq.${id}`); }, 'Moved to today');
  } else if (type === 'vid') {
    const m = _mVidDayMap();
    const prev = m[String(id)];
    m[String(id)] = today;
    _mVidDayMapSet(m);
    save();
    pushUndo(() => { const m2 = _mVidDayMap(); if (prev) m2[String(id)] = prev; else delete m2[String(id)]; _mVidDayMapSet(m2); save(); renderAll(); }, 'Moved to today');
  } else if (type === 'vidstep') {
    const [step, day] = String(extra).split('::');
    const m = _mVidStepMap();
    const key = id + '::' + step;
    const entry = m[key];
    const blocks = (st.blocks || []).filter(bl => String(bl._vidStepVid) === String(id) && bl._vidStepName === step && bl.ds === day);
    const prevBlocks = blocks.map(bl => ({id: bl.id, ds: bl.ds}));
    blocks.forEach(bl => { bl.ds = today; sbUpdateBlock(bl.id, {day_date: today}); });
    const prevEntry = entry ? {ds: entry.ds, extraDays: entry.extraDays ? [...entry.extraDays] : undefined} : null;
    if (entry) {
      if (entry.ds === day) {
        entry.ds = today;
      } else if (entry.extraDays && entry.extraDays.includes(day)) {
        entry.extraDays = entry.extraDays.filter(d => d !== day);
        if (entry.ds !== today && !entry.extraDays.includes(today)) entry.extraDays.push(today);
        if (!entry.extraDays.length) delete entry.extraDays;
      }
      _mVidStepMapSet(m);
    }
    save();
    pushUndo(() => {
      prevBlocks.forEach(({id: bid, ds}) => { const bl = st.blocks.find(x => x.id === bid); if (bl) { bl.ds = ds; sbUpdateBlock(bid, {day_date: ds}); } });
      if (entry && prevEntry) { entry.ds = prevEntry.ds; entry.extraDays = prevEntry.extraDays; _mVidStepMapSet(m); }
      save(); renderAll();
    }, 'Moved to today');
  } else if (type === 'rec' || type === 'wrec') {
    const r = st.recurring.find(x => String(x.id) === String(id));
    if (!r) return;
    if (!r._dateOverrides) r._dateOverrides = {};
    const prev = r._dateOverrides[extra];
    r._dateOverrides[extra] = today;
    save();
    sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, `?id=eq.${id}`);
    pushUndo(() => {
      const r2 = st.recurring.find(x => String(x.id) === String(id));
      if (r2) { if (prev) r2._dateOverrides[extra] = prev; else delete r2._dateOverrides[extra]; }
      save(); renderAll();
      sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r2 ? r2._dateOverrides : {}}, `?id=eq.${id}`);
    }, 'Moved to today');
  } else if (type === 'wrrule') {
    const r = st.wrRules.find(x => String(x.id) === String(id));
    if (!r) return;
    if (!r._dateOverrides) r._dateOverrides = {};
    const prev = r._dateOverrides[extra];
    r._dateOverrides[extra] = today;
    save();
    sbReqSilent('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, `?id=eq.${id}`);
    pushUndo(() => {
      const r2 = st.wrRules.find(x => String(x.id) === String(id));
      if (r2) { if (prev) r2._dateOverrides[extra] = prev; else delete r2._dateOverrides[extra]; }
      save(); renderAll();
      sbReqSilent('PATCH', 'wr_recurring_rules', {date_overrides: r2 ? r2._dateOverrides : {}}, `?id=eq.${id}`);
    }, 'Moved to today');
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

// ── Past-week recurring/WR "move to today" scope prompt ──────────────────────
// Desktop (overview.js/features.js, NOT loaded on mobile) now treats a recurring/WR
// miss from a genuine PAST week as a real schedule decision — instead of silently
// moving it, it prompts Skip past week / This time only / Same day / Change day to
// today. Same-week misses still move silently (no schedule implication). Mobile only
// has the per-row arrow (no bulk overdue banner), so this is a singleton prompt, never
// a sequential queue like desktop's _rolloverPromptQueue.
//
// _recSkipPastWeek and _recMoveThisOccToToday (features.js, shared) are called directly
// below — confirmed mobile-safe, they only touch save/renderAll/sbReqSilent/pushUndo.
// wrMoveToThisWeek/_recMoveAllFuture/writeWrOverride (overview.js) are ported here with
// their desktop-only render calls swapped for renderAll().

function _mWeeksAgoLabel(wkKey) {
  const n = Math.round((new Date(getWkKey(0) + 'T12:00') - new Date(wkKey + 'T12:00')) / (7 * 86400000));
  return n === 1 ? 'due last week' : `due ${n} weeks ago`;
}

function _mWrSnapshotSchedule(rule) {
  if (!rule._dateOverrides) rule._dateOverrides = {};
  const wk = getWkKey(0);
  if (!rule._dateOverrides.__priorScheds__) rule._dateOverrides.__priorScheds__ = [];
  if (rule._dateOverrides.__priorScheds__.some(s => s.before === wk)) return false;
  rule._dateOverrides.__priorScheds__.push({starting_date: rule.starting_date, before: wk});
  return true;
}

function _mNthWeekdayOfMonth(d) {
  const day = d.getDate();
  const nextOcc = new Date(d); nextOcc.setDate(day + 7);
  if (nextOcc.getMonth() !== d.getMonth()) return -1;
  return Math.min(Math.ceil(day / 7), 4);
}

// Ports of desktop's _wkKeyToOff/_wrClampToWeek (overview.js) — pure date helpers, no
// desktop-only globals involved.
function _mWkKeyToOff(wkKey) {
  const mon = new Date(wkKey + 'T12:00'), now = new Date(), dow = (now.getDay() + 6) % 7;
  const curMon = new Date(now); curMon.setDate(now.getDate() - dow); curMon.setHours(0, 0, 0, 0);
  return Math.round((mon - curMon) / (7 * 864e5));
}
function _mWrClampToWeek(ds, targetWkKey) {
  const sun = new Date(targetWkKey + 'T12:00'); sun.setDate(sun.getDate() + 6); const sunDs = d2s(sun);
  while (ds < targetWkKey) { const d = new Date(ds + 'T12:00'); d.setDate(d.getDate() + 7); ds = d2s(d); }
  while (ds > sunDs) { const d = new Date(ds + 'T12:00'); d.setDate(d.getDate() - 7); ds = d2s(d); }
  if (targetWkKey === getWkKey(0) && ds < tod()) ds = tod();
  return ds;
}

// Port of desktop's _wrShiftAnchorOne (overview.js, the WR right-click menu's "This time
// only → Next/Prev") — moves just THIS week's occurrence to the adjacent week, leaving
// the recurrence's underlying schedule untouched. Desktop reads its target rule/week from
// module-level _wrCtxRuleId/_wrCtxRecId/_wrCtxWkKey (set by a right-click); mobile has no
// equivalent "currently open context menu" state, so those are explicit params here
// instead — same reasoning _mWrMoveToThisWeek/_mRecMoveAllFuture already use. Writes to
// wr_recurring_rules (+ wr_recurring_overrides for wrrule) exactly like desktop, so a
// change here is picked up by desktop on its next sync — no separate mobile-only state.
function _mWrShiftThisWeek(rtype, ruleId, wkKey, delta) {
  if (rtype === 'rec' || rtype === 'wrec') {
    const r = st.recurring.find(x => String(x.id) === String(ruleId));
    if (!r || !wkKey) return;
    if (!r._dateOverrides) r._dateOverrides = {};
    const srcMon = new Date(wkKey + 'T12:00'); srcMon.setDate(srcMon.getDate() + (delta > 0 ? 7 : -7));
    const targetWkKey = d2s(srcMon);
    const tgtOv = r._dateOverrides[targetWkKey];
    if (tgtOv && tgtOv !== '__skip__') { showToast('Already scheduled that week', '#6b7280', 2000); return; }
    const tgtOff = _mWkKeyToOff(targetWkKey);
    const natDue = getRecurringWeekTasks(tgtOff).some(t => String(t._recId) === String(ruleId));
    if (natDue) { showToast('Already scheduled that week', '#6b7280', 2000); return; }
    const prevCurrent = r._dateOverrides[wkKey];
    const prevTarget = r._dateOverrides[targetWkKey];
    const _natDow = dayNameToIdx(r.appears_on_date);
    const _natDate = _natDow >= 0 ? getDateForDow(_natDow, _mWkKeyToOff(wkKey)) : null;
    const base = prevCurrent && prevCurrent !== '__skip__' ? new Date(prevCurrent + 'T12:00') : _natDate ? new Date(d2s(_natDate) + 'T12:00') : new Date(wkKey + 'T12:00');
    base.setDate(base.getDate() + delta);
    const next = _mWrClampToWeek(d2s(base), targetWkKey);
    r._dateOverrides[wkKey] = '__skip__';
    r._dateOverrides[targetWkKey] = next;
    save(); renderAll();
    sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, recQs(ruleId));
    pushUndo(() => {
      if (prevCurrent !== undefined) r._dateOverrides[wkKey] = prevCurrent; else delete r._dateOverrides[wkKey];
      if (prevTarget !== undefined) r._dateOverrides[targetWkKey] = prevTarget; else delete r._dateOverrides[targetWkKey];
      save(); renderAll();
      sbReq('PATCH', 'wr_recurring_rules', {date_overrides: r._dateOverrides}, recQs(ruleId));
    }, 'Moved recurring task');
    return;
  }
  const rule = st.wrRules.find(r => String(r.id) === String(ruleId));
  if (!rule) return;
  if (!rule._dateOverrides) rule._dateOverrides = {};
  const srcWkKey = wkKey || getWkKey(0);
  const srcMon = new Date(srcWkKey + 'T12:00'); srcMon.setDate(srcMon.getDate() + (delta > 0 ? 7 : -7));
  const targetWkKey = d2s(srcMon);
  const tgtOff = _mWkKeyToOff(targetWkKey);
  const naturallyDue = isWRRuleDueThisWeek(rule, tgtOff);
  const tgtOv = rule._dateOverrides[targetWkKey];
  const movedInOv = st.wrOverrides.some(o => o.override_type === 'move' && o.moved_to_wk_key === targetWkKey && String(o.rule_id) === String(ruleId));
  if ((naturallyDue || movedInOv) && (!tgtOv || tgtOv === '__skip__')) { showToast('Already scheduled that week', '#6b7280', 2000); return; }
  if (tgtOv && tgtOv !== '__skip__') { showToast('Already scheduled that week', '#6b7280', 2000); return; }
  const prevSrc = rule._dateOverrides[srcWkKey];
  const prevTgt = rule._dateOverrides[targetWkKey];
  const curDs = prevSrc && prevSrc !== '__skip__' ? prevSrc : null;
  delete rule._dateOverrides[srcWkKey];
  if (curDs) { const base = new Date(curDs + 'T12:00'); base.setDate(base.getDate() + delta); rule._dateOverrides[targetWkKey] = _mWrClampToWeek(d2s(base), targetWkKey); }
  else delete rule._dateOverrides[targetWkKey];
  sbReq('PATCH', 'wr_recurring_rules', {date_overrides: rule._dateOverrides}, `?id=eq.${ruleId}`);
  const _moveFull = {rule_id: ruleId, wk_key: srcWkKey, override_type: 'move', moved_to_wk_key: targetWkKey, done: null, custom_name: null, custom_notes: null};
  const _existingOv = st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === srcWkKey);
  const _prevOv = _existingOv ? {..._existingOv} : null;
  let _ovRealId = null;
  if (_existingOv) {
    Object.assign(_existingOv, _moveFull);
    sbReqSilent('PATCH', 'wr_recurring_overrides', _moveFull, `?id=eq.${_existingOv.id}`);
  } else {
    const _tmpId = 'wrov-tmp-' + Date.now();
    st.wrOverrides.push({..._moveFull, id: _tmpId});
    sbReqSilent('POST', 'wr_recurring_overrides', _moveFull, '').then(res => { if (res && res[0]) { _ovRealId = String(res[0].id); const idx = st.wrOverrides.findIndex(o => String(o.id) === _tmpId); if (idx > -1) st.wrOverrides[idx] = res[0]; } });
  }
  save(); renderAll();
  pushUndo(() => {
    if (prevSrc !== undefined) rule._dateOverrides[srcWkKey] = prevSrc; else delete rule._dateOverrides[srcWkKey];
    if (prevTgt !== undefined) rule._dateOverrides[targetWkKey] = prevTgt; else delete rule._dateOverrides[targetWkKey];
    sbReq('PATCH', 'wr_recurring_rules', {date_overrides: rule._dateOverrides}, `?id=eq.${ruleId}`);
    if (_prevOv) { const ov = st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === srcWkKey); if (ov) Object.assign(ov, _prevOv); sbReqSilent('PATCH', 'wr_recurring_overrides', _prevOv, `?id=eq.${ov ? ov.id : _prevOv.id}`); }
    else { const id = _ovRealId || st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === srcWkKey)?.id; st.wrOverrides = st.wrOverrides.filter(o => String(o.rule_id) !== String(ruleId) || o.wk_key !== srcWkKey); if (id) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${id}`); }
    save(); renderAll();
  }, 'Moved WR task to ' + (delta > 0 ? 'next' : 'prev') + ' week');
}

// Port of desktop's _wrCtxShiftScheduleOne (overview.js, the WR right-click menu's "All
// future → Next/Prev") — shifts the recurrence's own anchor (starting_date) by a week,
// moving every future occurrence, not just this one. Desktop's _wrClearPastOrphanPins
// (the "clean up phantom past occurrences after a shift" step) is a documented permanent
// no-op as of the current desktop code (overview.js) — this port reflects that; if that
// function is ever un-stubbed on desktop, port the real behavior here too.
function _mWrShiftAllFuture(rtype, ruleId, wkKey, delta) {
  const isRec = rtype === 'rec' || rtype === 'wrec';
  const rule = isRec ? st.recurring.find(r => String(r.id) === String(ruleId)) : st.wrRules.find(r => String(r.id) === String(ruleId));
  if (!rule) return;
  const prevStart = rule.starting_date;
  const _addedSnap = !isRec ? _mWrSnapshotSchedule(rule) : false;
  const base = rule.starting_date ? new Date(rule.starting_date + 'T12:00') : new Date(wkKey + 'T12:00');
  base.setDate(base.getDate() + delta);
  rule.starting_date = d2s(base);
  if (!rule._dateOverrides) rule._dateOverrides = {};
  const _prevDov = rule._dateOverrides[wkKey];
  if (_prevDov !== undefined) delete rule._dateOverrides[wkKey];
  let _removedOvs = [];
  if (!isRec) {
    _removedOvs = (st.wrOverrides || []).filter(o => String(o.rule_id) === String(ruleId) && o.override_type === 'move' && (o.wk_key === wkKey || o.moved_to_wk_key === wkKey)).map(o => ({...o}));
    if (_removedOvs.length) {
      st.wrOverrides = st.wrOverrides.filter(o => !(String(o.rule_id) === String(ruleId) && o.override_type === 'move' && (o.wk_key === wkKey || o.moved_to_wk_key === wkKey)));
      _removedOvs.forEach(o => { if (o.id && !String(o.id).startsWith('wrov-tmp-')) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${o.id}`); });
    }
  }
  sbReq('PATCH', 'wr_recurring_rules', {starting_date: rule.starting_date, date_overrides: rule._dateOverrides}, isRec ? recQs(ruleId) : `?id=eq.${ruleId}`);
  save(); renderAll();
  showToast('Schedule moved ' + (delta > 0 ? '1 week later' : '1 week earlier'), '#10b981', 1600);
  pushUndo(() => {
    rule.starting_date = prevStart;
    if (_addedSnap) rule._dateOverrides.__priorScheds__.pop();
    if (_prevDov !== undefined) rule._dateOverrides[wkKey] = _prevDov;
    _removedOvs.forEach(o => { st.wrOverrides.push(o); sbReqSilent('POST', 'wr_recurring_overrides', {rule_id: o.rule_id, wk_key: o.wk_key, override_type: o.override_type, moved_to_wk_key: o.moved_to_wk_key || null, done: o.done || null, custom_name: o.custom_name || null, custom_notes: o.custom_notes || null}, ''); });
    sbReq('PATCH', 'wr_recurring_rules', {starting_date: prevStart, date_overrides: rule._dateOverrides}, isRec ? recQs(ruleId) : `?id=eq.${ruleId}`);
    save(); renderAll();
  }, 'Shifted schedule');
}

// Port of desktop's writeWrOverride (overview.js) — identical logic, renders via renderAll().
function _mWriteWrOverride(ruleId, wkKey, payload, {onDone, undoLabel = 'Changed WR task'} = {}) {
  const full = {rule_id: ruleId, wk_key: wkKey, done: null, moved_to_wk_key: null, custom_name: null, custom_notes: null, ...payload};
  const isSkip = payload.override_type === 'skip';
  const _skipRule = isSkip ? st.wrRules.find(x => String(x.id) === String(ruleId)) : null;
  const _pinnedDs = _skipRule?._dateOverrides?.[wkKey];
  const linkedBlocks = isSkip && st.blocks ? st.blocks.filter(b => dsToWkKey(b.ds) === wkKey && (String(b.ruleId) === String(ruleId) || String(b.recId) === String(ruleId) || (!b.ruleId && !b.recId && _pinnedDs && b.ds === _pinnedDs && !b.taskId && !b.shopId && !b._vidStepVid && !b._vidId && !b._pupSessId && !b._finCancelSubId))) : [];
  if (isSkip && linkedBlocks.length) { st.blocks = st.blocks.filter(b => !linkedBlocks.some(lb => lb.id === b.id)); linkedBlocks.forEach(b => sbDeleteBlock(b.id)); }
  const _syncBlockDone = (isDone) => { if (st.blocks) st.blocks.filter(b => dsToWkKey(b.ds) === wkKey && (String(b.ruleId) === String(ruleId) || String(b.recId) === String(ruleId))).forEach(b => { b._done = isDone; }); };
  const existing = st.wrOverrides.find(o => String(o.rule_id) === String(ruleId) && o.wk_key === wkKey);
  if (existing) {
    const prev = {...existing};
    Object.assign(existing, full);
    sbReqSilent('PATCH', 'wr_recurring_overrides', full, `?id=eq.${existing.id}`);
    pushUndo(() => { Object.assign(existing, prev); if (isSkip) { linkedBlocks.forEach(b => { if (st.blocks) st.blocks.push(b); sbSaveBlock(b); }); } sbReqSilent('PATCH', 'wr_recurring_overrides', prev, `?id=eq.${existing.id}`); _syncBlockDone(prev.override_type === 'complete' && prev.done === true); renderAll(); }, undoLabel);
    if (payload.override_type === 'complete') _syncBlockDone(payload.done === true);
    save(); renderAll(); if (onDone) onDone(existing);
  } else {
    const tmpId = 'wrov-tmp-' + Date.now();
    st.wrOverrides.push({...full, id: tmpId});
    let realId = null;
    sbReqSilent('POST', 'wr_recurring_overrides', full, '').then(res => {
      if (res && res[0]) { realId = String(res[0].id); const idx = st.wrOverrides.findIndex(o => String(o.id) === tmpId); if (idx > -1) st.wrOverrides[idx] = res[0]; save(); if (onDone) onDone(res[0]); }
    });
    pushUndo(() => {
      const id = realId || tmpId;
      st.wrOverrides = st.wrOverrides.filter(o => String(o.id) !== id);
      if (isSkip) { linkedBlocks.forEach(b => { if (st.blocks) st.blocks.push(b); sbSaveBlock(b); }); }
      if (realId) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${realId}`);
      _syncBlockDone(false); renderAll();
    }, undoLabel);
    if (payload.override_type === 'complete') _syncBlockDone(payload.done === true);
    save(); renderAll();
  }
}

// Port of desktop's wrMoveToThisWeek (overview.js) — re-homes an overdue WR rule into
// the current week as unassigned. allFuture also re-anchors starting_date=tod(); setDow
// (only meaningful with allFuture) also changes which day it recurs on to match today.
function _mWrMoveToThisWeek(ruleId, srcWkKey, allFuture, setDow) {
  const rule = st.wrRules.find(r => String(r.id) === String(ruleId)); if (!rule) return;
  const curWkKey = getWkKey(0);
  if (!rule._dateOverrides) rule._dateOverrides = {};
  const prevStart = rule.starting_date;
  const prevSrcPin = rule._dateOverrides[srcWkKey];
  const prevDow = rule.day_of_week, prevMNth = rule.monthly_nth, prevMWd = rule.monthly_weekday, prevMDate = rule.monthly_date;
  const _delKey = o => String(o.rule_id) === String(ruleId) && (o.wk_key === srcWkKey || (o.wk_key === curWkKey && o.override_type === 'skip'));
  const _deleted = (st.wrOverrides || []).filter(_delKey).map(o => ({...o}));
  if (prevSrcPin !== undefined) delete rule._dateOverrides[srcWkKey];
  _deleted.forEach(o => { if (o.id && !String(o.id).startsWith('wrov-tmp-')) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${o.id}`); });
  if (_deleted.length) st.wrOverrides = (st.wrOverrides || []).filter(o => !_delKey(o));
  const _addedSnap = allFuture ? _mWrSnapshotSchedule(rule) : false;
  if (allFuture) {
    rule.starting_date = tod();
    if (setDow) {
      const now = new Date(tod() + 'T12:00');
      if (rule.cadence === 'weekly' || rule.cadence === 'biweekly') {
        rule.day_of_week = now.getDay();
      } else if (rule.cadence === 'monthly') {
        if (rule.monthly_rule_type === 'date_of_month') rule.monthly_date = now.getDate();
        else if (rule.monthly_rule_type === 'nth_weekday') { rule.monthly_weekday = now.getDay(); rule.monthly_nth = _mNthWeekdayOfMonth(now); }
      }
    }
  }
  const naturallyDue = isWRRuleDueThisWeek(rule, 0);
  const hasCur = (st.wrOverrides || []).some(o => String(o.rule_id) === String(ruleId) && ((o.wk_key === curWkKey && o.override_type !== 'skip') || (o.override_type === 'move' && o.moved_to_wk_key === curWkKey)));
  let _addedHolder = null;
  if (!naturallyDue && !hasCur) {
    const _moveFull = {rule_id: ruleId, wk_key: srcWkKey, override_type: 'move', moved_to_wk_key: curWkKey, done: null, custom_name: null, custom_notes: null};
    _addedHolder = {..._moveFull, id: 'wrov-tmp-' + Date.now()};
    st.wrOverrides.push(_addedHolder);
    sbReqSilent('POST', 'wr_recurring_overrides', _moveFull, '').then(res => { if (res && res[0]) Object.assign(_addedHolder, res[0]); });
  }
  sbReq('PATCH', 'wr_recurring_rules', {starting_date: rule.starting_date, day_of_week: rule.day_of_week, monthly_nth: rule.monthly_nth, monthly_weekday: rule.monthly_weekday, monthly_date: rule.monthly_date, date_overrides: rule._dateOverrides}, `?id=eq.${ruleId}`);
  save(); renderAll();
  pushUndo(() => {
    rule.starting_date = prevStart;
    rule.day_of_week = prevDow; rule.monthly_nth = prevMNth; rule.monthly_weekday = prevMWd; rule.monthly_date = prevMDate;
    if (_addedSnap) rule._dateOverrides.__priorScheds__.pop();
    if (prevSrcPin !== undefined) rule._dateOverrides[srcWkKey] = prevSrcPin; else delete rule._dateOverrides[srcWkKey];
    if (_addedHolder) { if (_addedHolder.id && !String(_addedHolder.id).startsWith('wrov-tmp-')) sbReqSilent('DELETE', 'wr_recurring_overrides', null, `?id=eq.${_addedHolder.id}`); st.wrOverrides = st.wrOverrides.filter(o => o !== _addedHolder); }
    _deleted.forEach(o => { const _h = {rule_id: o.rule_id, wk_key: o.wk_key, override_type: o.override_type, moved_to_wk_key: o.moved_to_wk_key || null, done: o.done || null, custom_name: o.custom_name || null, custom_notes: o.custom_notes || null, id: 'wrov-tmp-' + Date.now() + '-' + o.wk_key}; st.wrOverrides.push(_h); sbReqSilent('POST', 'wr_recurring_overrides', {rule_id: _h.rule_id, wk_key: _h.wk_key, override_type: _h.override_type, moved_to_wk_key: _h.moved_to_wk_key, done: _h.done, custom_name: _h.custom_name, custom_notes: _h.custom_notes}, '').then(res => { if (res && res[0]) Object.assign(_h, res[0]); }); });
    sbReq('PATCH', 'wr_recurring_rules', {starting_date: prevStart, day_of_week: prevDow, monthly_nth: prevMNth, monthly_weekday: prevMWd, monthly_date: prevMDate, date_overrides: rule._dateOverrides}, `?id=eq.${ruleId}`);
    save(); renderAll();
  }, 'Moved WR task to this week');
}

// Port of desktop's _recMoveAllFuture (overview.js) — re-anchors a non-WR recurring rule
// so the occurrence lands on `ds`; every future one follows. keepDay=true keeps the same
// day-of-week; keepDay=false/undefined sets the new weekday matching `ds`.
function _mRecMoveAllFuture(r, srcWkKey, ds, keepDay) {
  const DAYS_AF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const prevStart = r.starting_date; const prevAppears = r.appears_on_date;
  if (!r._dateOverrides) r._dateOverrides = {};
  const _prevSrcPin = r._dateOverrides[srcWkKey];
  const newStart = ds;
  const newAppears = keepDay ? r.appears_on_date : ((r.cadence === 'monthly') ? String(new Date(ds + 'T00:00:00').getDate()) : DAYS_AF[new Date(ds + 'T00:00:00').getDay()]);
  if (_prevSrcPin !== undefined) delete r._dateOverrides[srcWkKey];
  const _futPins = _recClearFuturePins(r);
  r.starting_date = newStart; r.appears_on_date = newAppears;
  // _wrClearPastOrphanPins is a permanent no-op on desktop too (overview.js) — omitted.
  const _orphans = [];
  const _curWk = getWkKey(0);
  const tgtWkKey = dsToWkKey(ds);
  if (_curWk !== tgtWkKey && _curWk !== srcWkKey && r._dateOverrides[_curWk] !== '__skip__') {
    const _curOcc = getRecurringWeekTasks(0).find(t => String(t._recId) === String(r.id));
    if (_curOcc && !_curOcc.done && _curOcc.due_date < tod()) { _orphans.push({wk: _curWk, val: r._dateOverrides[_curWk]}); r._dateOverrides[_curWk] = '__skip__'; }
  }
  save(); renderAll();
  sbReq('PATCH', 'wr_recurring_rules', {starting_date: newStart, appears_on_date: newAppears, date_overrides: r._dateOverrides}, recQs(r.id));
  pushUndo(() => {
    r.starting_date = prevStart; r.appears_on_date = prevAppears;
    if (_prevSrcPin !== undefined) r._dateOverrides[srcWkKey] = _prevSrcPin;
    _orphans.forEach(o => { if (o.val === undefined) delete r._dateOverrides[o.wk]; else r._dateOverrides[o.wk] = o.val; });
    _futPins.forEach(o => { r._dateOverrides[o.wk] = o.val; });
    save(); renderAll();
    sbReq('PATCH', 'wr_recurring_rules', {starting_date: prevStart, appears_on_date: prevAppears, date_overrides: r._dateOverrides}, recQs(r.id));
  }, 'Moved recurring task all future');
}

// Singleton scope sheet — mobile only ever needs one at a time (no bulk overdue banner
// to queue for), unlike desktop's sequential _rolloverPromptQueue.
let _mWrScopeCbSkip = null, _mWrScopeCbThis = null, _mWrScopeCbSame = null, _mWrScopeCbChange = null;
function mOpenWrScopeSheet(name, wkKey, onSkip, onThisTime, onSameDay, onChangeDay) {
  _mWrScopeCbSkip = onSkip; _mWrScopeCbThis = onThisTime; _mWrScopeCbSame = onSameDay; _mWrScopeCbChange = onChangeDay;
  const titleEl = document.getElementById('mWrScopeTitle');
  if (titleEl) titleEl.textContent = name ? `${name} (recurring) ${_mWeeksAgoLabel(wkKey)}` : '';
  document.getElementById('mWrScopeBackdrop')?.classList.add('open');
  document.getElementById('mWrScopeSheet')?.classList.add('open');
}
function mCloseWrScopeSheet() {
  document.getElementById('mWrScopeBackdrop')?.classList.remove('open');
  document.getElementById('mWrScopeSheet')?.classList.remove('open');
  _mWrScopeCbSkip = _mWrScopeCbThis = _mWrScopeCbSame = _mWrScopeCbChange = null;
}
function mWrScopeDoSkip()   { const cb = _mWrScopeCbSkip;   mCloseWrScopeSheet(); if (cb) cb(); }
function mWrScopeDoThis()   { const cb = _mWrScopeCbThis;   mCloseWrScopeSheet(); if (cb) cb(); }
function mWrScopeDoSame()   { const cb = _mWrScopeCbSame;   mCloseWrScopeSheet(); if (cb) cb(); }
function mWrScopeDoChange() { const cb = _mWrScopeCbChange; mCloseWrScopeSheet(); if (cb) cb(); }

// Entry point wired from mTaskRow's "→ Today" button for rec/wrec/wrrule types only.
// Same-week misses move directly (unchanged mMoveToToday behavior); a genuine past-week
// miss is a schedule decision, so it opens the 4-option sheet instead — mirrors desktop's
// _ovRowMoveClick (overview.js).
function _mOvRowMoveClick(kind, id, wkKey) {
  const curWk = getWkKey(0);
  const pastWeek = wkKey && wkKey !== curWk;
  if (!pastWeek) { mMoveToToday(id, kind, wkKey); return; }
  if (kind === 'wrrule') {
    const rule = st.wrRules.find(r => String(r.id) === String(id)); if (!rule) return;
    mOpenWrScopeSheet(rule.name, wkKey,
      () => _mWriteWrOverride(id, wkKey, {override_type: 'skip'}, {undoLabel: 'Skipped WR task'}),
      () => _mWrMoveToThisWeek(id, wkKey, false),
      () => _mWrMoveToThisWeek(id, wkKey, true, false),
      () => _mWrMoveToThisWeek(id, wkKey, true, true));
  } else {
    // kind === 'rec' or 'wrec' — both index st.recurring, same as mMoveToToday's own handling
    const rec = st.recurring.find(x => String(x.id) === String(id)); if (!rec) return;
    mOpenWrScopeSheet(rec.name, wkKey,
      () => _recSkipPastWeek(rec, wkKey),
      () => _recMoveThisOccToToday(rec, wkKey),
      () => _mRecMoveAllFuture(rec, wkKey, tod(), true),
      () => _mRecMoveAllFuture(rec, wkKey, tod(), false));
  }
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
  renderAll(); // not just mRenderToday() — the edit sheet now also opens from Week's tap menu
  await sbReq('PATCH', 'tasks', {name, category, due_date, important}, `?id=eq.${id}`);
}

async function mDeleteEditTask() {
  if (!_mEditId) return;
  const id = _mEditId;
  st.tasks = st.tasks.filter(x => String(x.id) !== String(id));
  save();
  mCloseEdit();
  renderAll();
  await sbReq('DELETE', 'tasks', null, `?id=eq.${id}`);
}

// ── Full add sheet (today, all fields) ───────────────────────────────────────
function mToggleFullAddImp() {
  _mFullAddImportant = !_mFullAddImportant;
  const btn = document.getElementById('mFullAddImpBtn');
  if (btn) btn.classList.toggle('flagged', _mFullAddImportant);
}

// Swaps the full-add sheet into "trip" mode when Travel is picked — mirrors desktop's
// _tModalSyncTravelFields (features.js), adapted to this sheet's own field ids.
function _mFullAddSyncTravelFields(cat) {
  const isTv = cat === 'Travel';
  const _sh = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
  _sh('mFullAddDestField', isTv);
  _sh('mFullAddEndField', isTv);
  _sh('mFullAddModeField', isTv);
  const lbl = document.getElementById('mFullAddDueLbl');
  if (lbl) lbl.textContent = isTv ? 'Start date' : 'Due date';
  const btn = document.getElementById('mFullAddSave');
  if (btn) btn.textContent = isTv ? 'Add Trip' : 'Add Task';
}

function mOpenFullAdd() {
  _mFullAddImportant = false;
  document.getElementById('mFullAddName').value = '';
  document.getElementById('mFullAddDue').value = d2s(getDayDate(0));
  const destEl = document.getElementById('mFullAddDest'); if (destEl) destEl.value = '';
  const endEl = document.getElementById('mFullAddEnd'); if (endEl) endEl.value = '';
  const modeEl = document.getElementById('mFullAddMode'); if (modeEl) modeEl.value = '';
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
  if (category === 'Travel') {
    const dest = document.getElementById('mFullAddDest')?.value.trim() || null;
    const end = document.getElementById('mFullAddEnd')?.value || null;
    const mode = document.getElementById('mFullAddMode')?.value || null;
    mCloseFullAdd();
    await _mAddTravel(name, dest, due_date, end, mode);
    return;
  }
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

// ── Delete by id (task menu's Delete button) ─────────────────────────────────
async function mDeleteById(id) {
  st.tasks = st.tasks.filter(x => String(x.id) !== String(id));
  save();
  renderAll(); // not just mRenderToday() — the task menu's Delete now also reaches here from Week
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

// Single tap -> task menu, double tap -> edit, hold-then-drag -> reorder (mInitTodayDrag,
// above). A single tap can't be told apart from "the first half of a double-tap" until
// the double-tap window has actually passed without a second tap arriving, so a
// confirmed single tap is deliberately delayed by that same window before it does
// anything.
let _todTapTimer = null;
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
    // data-rid (every row) — routing to the right edit surface (or none) happens by
    // rtype below, same reasoning as the drag scope above.
    const outer = e.target.closest('.m-row-outer[data-rid]');
    if (!outer) return;
    if (e.target.closest('.m-chk-wrap')) return; // checkbox owns its own tap
    // "→ Today" button owns its own tap too — it already calls stopPropagation() in its
    // onclick, but that's on the (later-firing) synthesized click event, which can't retro-
    // actively stop THIS touchend, a separate event this listener reads directly. Without
    // this check, tapping the button both moved the task AND opened the task menu/edit
    // sheet underneath it.
    if (e.target.closest('.m-mv-today')) return;
    const ct = e.changedTouches[0];
    if (Math.abs(ct.clientX - tapStartX) > 10 || Math.abs(ct.clientY - tapStartY) > 10) return;
    const id = outer.dataset.rid;
    if (_isDblTap(id)) {
      if (_todTapTimer) { clearTimeout(_todTapTimer); _todTapTimer = null; }
      _mRowEdit(outer);
      return;
    }
    clearTimeout(_todTapTimer);
    _todTapTimer = setTimeout(() => { _todTapTimer = null; _mShowTaskMenu(outer); }, 350);
  }, {passive: true});
}

// Routes double-tap-edit to whichever surface this row's type actually has. Plain tasks
// and shopping items have real mobile edit sheets; other virtual types (recurring/WR/
// pup/video/etc.) don't yet, so this silently no-ops for those rather than opening the
// wrong thing or erroring.
function _mRowEdit(outer) {
  const rtype = outer.dataset.rtype;
  if (rtype === 'task') mOpenEdit(outer.dataset.tid);
  else if (rtype === 'shop') mOpenShopEdit(outer.dataset.shopid);
  else if (rtype === 'wrec' || rtype === 'wrrule' || rtype === 'rec') mOpenRecEdit(outer);
  // 'vid' has no edit surface (only Remove from Today, via the quick-actions menu) —
  // double-tap intentionally no-ops for it.
}

// ── Today list drag-to-reorder ──────────────────────────────────────────────────
// Hold + drag a task row up/down to set a manual sort order for today — touch port of
// desktop's `_todDragRowId`/`_dropReorderToday` (core.js/overview.js, native HTML5 drag,
// not usable on iOS Safari). Every row is grabbable (`.m-row-outer[data-rid]`, set on
// all row types), and the order captured on drop
// covers EVERY row (`data-rid`, set on all row types in mTaskRow) so a dragged task's
// position relative to virtual/recurring/shopping rows is preserved exactly — matches
// desktop's `.ti[id^="ti-"]` full-list capture. Unlike desktop's placeholder-divider
// approach, the dragged row is live-reparented in the DOM as the finger moves, so at
// drop time the DOM order already IS the new order — no separate placeholder math needed.
let _mTodDrag = null;
function mInitTodayDrag() {
  const list = document.getElementById('mTodayList');
  if (!list || list._todDragInited) return;
  list._todDragInited = true;

  let pressTimer = null;
  let touchStartX = 0, touchStartY = 0;

  list.addEventListener('touchstart', e => {
    // data-rid (every row, any type) — not data-tid (real tasks only) — so hold-and-drag
    // reordering works uniformly across the whole list, matching the manual _dayOrder
    // capture below which already covers every row.
    const outer = e.target.closest('.m-row-outer[data-rid]');
    if (!outer) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    pressTimer = setTimeout(() => {
      pressTimer = null;
      outer.classList.add('m-row-dragging');
      _mTodDrag = {el: outer, origOrder: [...list.querySelectorAll('.m-row-outer[data-rid]')].map(r => r.dataset.rid)};
      document.addEventListener('touchmove', _mTodDragMove, {passive: false});
      navigator.vibrate?.(8);
    }, 480);
  }, {passive: true});

  list.addEventListener('touchmove', e => {
    if (!pressTimer) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 8 || Math.abs(e.touches[0].clientY - touchStartY) > 8) {
      clearTimeout(pressTimer); pressTimer = null;
    }
  }, {passive: true});

  list.addEventListener('touchend', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (_mTodDrag) _mTodDragEnd();
  });
  list.addEventListener('touchcancel', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (_mTodDrag) _mTodDragEnd(true);
  });
}

function _mTodDragMove(e) {
  if (!_mTodDrag) return;
  e.preventDefault();
  const list = document.getElementById('mTodayList');
  if (!list) return;
  const touch = e.touches[0];
  const {el} = _mTodDrag;
  el.style.pointerEvents = 'none';
  const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.m-row-outer');
  el.style.pointerEvents = '';
  if (!target || target === el || !list.contains(target)) return;
  const rect = target.getBoundingClientRect();
  const before = touch.clientY < rect.top + rect.height / 2;
  list.insertBefore(el, before ? target : target.nextSibling);
}

function _mTodDragEnd(cancelled) {
  const {el, origOrder} = _mTodDrag;
  _mTodDrag = null;
  document.removeEventListener('touchmove', _mTodDragMove);
  el.classList.remove('m-row-dragging');
  if (cancelled) { mRenderToday(); return; }

  const list = document.getElementById('mTodayList');
  const newOrder = [...list.querySelectorAll('.m-row-outer[data-rid]')].map(r => r.dataset.rid);
  // Dropped back exactly where it started — no-op, no toast. The task menu is owned by
  // a plain single tap (mInitTodayDblTap below), not a stalled drag attempt.
  if (JSON.stringify(newOrder) === JSON.stringify(origOrder)) return;

  const ds = _mTodayOffset === 0 ? d2s(getDayDate(0)) : _mTodayDateStr();
  const m = _dayOrder();
  const prevOrder = m[ds] ? [...m[ds]] : null;
  m[ds] = newOrder;
  _dayOrderSet(m);
  mRenderToday();
  pushUndo(() => { const m2 = _dayOrder(); if (prevOrder) m2[ds] = prevOrder; else delete m2[ds]; _dayOrderSet(m2); renderAll(); }, 'Reordered today');
}

// ── Task long-press menu (Edit/Duplicate/Flag/Delete) ────────────────────────────
// Mirrors desktop's #ctxMenu (features.js ctxDoEdit/ctxDoDuplicate/ctxDoDelete) for
// the same 3 core actions, plus a Flag-as-Important toggle (mobile-only addition —
// quicker than opening the full edit sheet just to flag something). Scoped to real
// tasks only, same as the drag-reorder/swipe-delete gestures that trigger it.
let _mTaskMenuId = null;
// rtype-aware: plain tasks get the full menu (Edit/Duplicate/Flag/Delete), shopping
// items get the subset that applies to them (Edit/Delete — no "important"/duplicate
// concept for a shopping item), everything else (recurring/WR/pup/video/etc.) has no
// mobile edit surface yet, so the menu doesn't open for those rows at all rather than
// showing actions that don't work.
let _mTaskMenuType = null;
// _mTaskMenuEl (the actual row) is stored alongside id/type so Edit can just reuse
// _mRowEdit's existing per-type routing (below) instead of duplicating it here.
let _mTaskMenuEl = null;
function _mShowTaskMenu(el) {
  const rtype = el.dataset.rtype;
  // Recurring/WR rows get their own dedicated actions sheet (Skip/Move this-week/Move
  // all-future/Edit) — different action set entirely from the generic task menu below.
  if (rtype === 'wrec' || rtype === 'wrrule' || rtype === 'rec') { _mShowWrActions(el); return; }
  if (!['task', 'shop', 'vid', 'vidstep'].includes(rtype)) return;
  const id = rtype === 'shop' ? el.dataset.shopid
    : (rtype === 'vid' || rtype === 'vidstep') ? el.dataset.vidid
    : el.dataset.tid;
  let t;
  if (rtype === 'shop') t = st.shopping.find(x => String(x.id) === String(id));
  else if (rtype === 'vid' || rtype === 'vidstep') t = (st.videos || []).find(x => String(x.id) === String(id));
  else t = st.tasks.find(x => String(x.id) === String(id));
  if (!t) return;
  _mTaskMenuEl = el;
  _mTaskMenuId = id;
  _mTaskMenuType = rtype;
  const editBtn = document.getElementById('mTaskMenuEditBtn');
  const dupBtn = document.getElementById('mTaskMenuDupBtn');
  const flagBtn = document.getElementById('mTaskMenuFlagBtn');
  const delBtn = document.getElementById('mTaskMenuDelBtn');
  const hasEdit = rtype === 'task' || rtype === 'shop';
  const hasDelete = rtype === 'task' || rtype === 'shop' || rtype === 'vid' || rtype === 'vidstep';
  editBtn.style.display = hasEdit ? '' : 'none';
  dupBtn.style.display = rtype === 'task' ? '' : 'none';
  flagBtn.style.display = rtype === 'task' ? '' : 'none';
  delBtn.style.display = hasDelete ? '' : 'none';
  // vid/vidstep's delete icon is functionally "remove from today" (see mTaskMenuDelete),
  // but shown as a plain delete icon like every other type — title/aria-label carry the
  // real meaning for anyone who needs it, the icon itself stays visually consistent.
  const delLabel = (rtype === 'vid' || rtype === 'vidstep') ? 'Remove from Today' : 'Delete';
  delBtn.title = delLabel;
  delBtn.setAttribute('aria-label', delLabel);
  if (rtype === 'task') flagBtn.classList.toggle('flagged', !!t.important);
  const sheet = document.getElementById('mTaskMenuSheet');
  document.getElementById('mTaskMenuBackdrop').classList.add('open');
  _mPositionTaskMenu(el, sheet);
  sheet.classList.add('open');
}
// Anchors the popup on the RIGHT side of the row that was tapped, vertically centered
// on it — reads as popping out of that row, not a generic full-width bottom sheet.
// Clamped on every edge so it never runs off the screen (a short row near the top/bottom,
// or one that fills the full width, still gets a fully on-screen menu).
function _mPositionTaskMenu(row, sheet) {
  const r = row.getBoundingClientRect();
  const sw = sheet.offsetWidth, sh = sheet.offsetHeight;
  let top = r.top + r.height / 2 - sh / 2;
  top = Math.max(12, Math.min(top, window.innerHeight - sh - 12));
  let left = r.right - sw;
  left = Math.max(12, Math.min(left, window.innerWidth - sw - 12));
  sheet.style.top = top + 'px';
  sheet.style.left = left + 'px';
}
function mCloseTaskMenu() {
  document.getElementById('mTaskMenuBackdrop').classList.remove('open');
  document.getElementById('mTaskMenuSheet').classList.remove('open');
}
function mTaskMenuEdit() {
  const el = _mTaskMenuEl;
  mCloseTaskMenu();
  if (el) _mRowEdit(el); // reuses the same per-type routing as double-tap
}
function mTaskMenuDelete() {
  const id = _mTaskMenuId, type = _mTaskMenuType, el = _mTaskMenuEl;
  mCloseTaskMenu();
  if (type === 'shop') mDeleteShopDirect(id);
  else if (type === 'vid') mUnassignVideoToday(id);
  else if (type === 'vidstep' && el) mUnassignVidStepToday(el.dataset.vidid, el.dataset.vidstep, el.dataset.day);
  else mDeleteById(id);
}

// "Delete" for a video task means take it off today's list, not delete the video itself
// — mirrors _mMoveToTodayArgs's 'vid' branch (mobile-overview.js) in reverse: that writes
// _mVidDayMap[id]=today, this clears it (plus any timeblock for it on that day).
async function mUnassignVideoToday(id) {
  const m = _mVidDayMap();
  const prev = m[String(id)];
  if (prev === undefined) return;
  delete m[String(id)];
  _mVidDayMapSet(m);
  const removedBlocks = (st.blocks || []).filter(b => String(b._vidId) === String(id) && b.ds === prev);
  st.blocks = (st.blocks || []).filter(b => !(String(b._vidId) === String(id) && b.ds === prev));
  save();
  renderAll();
  removedBlocks.forEach(b => sbDeleteBlock(b.id));
  pushUndo(() => {
    const m2 = _mVidDayMap();
    m2[String(id)] = prev;
    _mVidDayMapSet(m2);
    removedBlocks.forEach(b => { st.blocks.push(b); sbSaveBlock(b); });
    save();
    renderAll();
  }, 'Removed from today');
}

// Same idea as mUnassignVideoToday but for one video STEP on one day — mirrors the
// 'vidstep' branch of _mMoveToTodayArgs's move-to-today handler (mobile-overview.js)
// in reverse. A step's day-map entry is {ds: primaryDay, extraDays: [...]}; removing
// today means: if today was an extraDay, just drop it from that list; if today was the
// primary ds, promote the first remaining extraDay to primary, or delete the whole
// entry if there isn't one. Also clears any timeblock for this step on this day.
async function mUnassignVidStepToday(vidId, step, day) {
  const m = _mVidStepMap();
  const key = vidId + '::' + step;
  const entry = m[key];
  const blocks = (st.blocks || []).filter(b => String(b._vidStepVid) === String(vidId) && b._vidStepName === step && b.ds === day);
  const prevBlocks = blocks.map(b => ({...b}));
  st.blocks = (st.blocks || []).filter(b => !(String(b._vidStepVid) === String(vidId) && b._vidStepName === step && b.ds === day));
  const prevEntry = entry ? {ds: entry.ds, extraDays: entry.extraDays ? [...entry.extraDays] : undefined} : null;
  let entryExisted = !!entry;
  if (entry) {
    if (entry.ds === day) {
      if (entry.extraDays && entry.extraDays.length) {
        entry.ds = entry.extraDays[0];
        entry.extraDays = entry.extraDays.slice(1);
        if (!entry.extraDays.length) delete entry.extraDays;
      } else {
        delete m[key];
      }
    } else if (entry.extraDays && entry.extraDays.includes(day)) {
      entry.extraDays = entry.extraDays.filter(d => d !== day);
      if (!entry.extraDays.length) delete entry.extraDays;
    }
    _mVidStepMapSet(m);
  }
  save();
  renderAll();
  prevBlocks.forEach(b => sbDeleteBlock(b.id));
  pushUndo(() => {
    if (entryExisted) { const m2 = _mVidStepMap(); m2[key] = prevEntry; _mVidStepMapSet(m2); }
    prevBlocks.forEach(b => { st.blocks.push(b); sbSaveBlock(b); });
    save();
    renderAll();
  }, 'Removed from today');
}

function mTaskMenuToggleImportant() {
  const id = _mTaskMenuId;
  mCloseTaskMenu();
  const t = st.tasks.find(x => String(x.id) === String(id));
  if (!t) return;
  const prev = t.important;
  t.important = !t.important;
  save();
  renderAll();
  sbReq('PATCH', 'tasks', {important: t.important}, `?id=eq.${id}`);
  pushUndo(() => {
    const t2 = st.tasks.find(x => String(x.id) === String(id));
    if (t2) t2.important = prev;
    save();
    renderAll();
    sbReq('PATCH', 'tasks', {important: prev}, `?id=eq.${id}`);
  }, t.important ? 'Flagged important' : 'Unflagged important');
}
async function mTaskMenuDuplicate() {
  const id = _mTaskMenuId;
  mCloseTaskMenu();
  const t = st.tasks.find(x => String(x.id) === String(id));
  if (!t) return;
  const tmp = 'l-' + Date.now();
  const dup = {...t, id: tmp, done: false};
  st.tasks.push(dup);
  save();
  renderAll();
  pushUndo(() => { st.tasks = st.tasks.filter(x => x.id !== dup.id); save(); renderAll(); sbReq('DELETE', 'tasks', null, `?id=eq.${dup.id}`); }, 'Duplicated task');
  const {id: _skip, ...body} = dup;
  const res = await sbReq('POST', 'tasks', body);
  if (res && res[0]) { const i = st.tasks.findIndex(x => x.id === tmp); if (i >= 0) { st.tasks[i] = res[0]; save(); } }
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

// Shared day-swipe gesture, bindable to any element — used for #mMain itself (below) and
// for the task menu's backdrop (also below), so a swipe started while that popup is open
// changes the day directly instead of requiring a tap-to-dismiss first. Tracks the live
// finger position via touchmove (not just the touchstart/touchend endpoints) so a gesture
// that iOS decides to cancel — e.g. because a vertical scroll grabbed it, plausible on a
// swipe that isn't perfectly horizontal — still has a last-known position to evaluate, via
// touchcancel, instead of silently dropping the day-change. `onDragStart` (optional) fires
// once, as soon as the drag is unambiguously horizontal, before the gesture actually
// finishes — used to dismiss the task menu immediately rather than waiting for touchend.
function _mBindDaySwipe(el, {gate, onDragStart} = {}) {
  let startX = 0, startY = 0, lastX = 0, lastY = 0, swiping = false, dragStarted = false;
  const finish = () => {
    if (!swiping) return;
    swiping = false;
    dragStarted = false;
    const dx = lastX - startX;
    const dy = lastY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      _mTodayOffset += dx < 0 ? 1 : -1;
      mRenderToday();
      _mUpdateTodayHeader();
    }
  };
  el.addEventListener('touchstart', e => {
    if (gate && !gate()) return;
    startX = lastX = e.touches[0].clientX;
    startY = lastY = e.touches[0].clientY;
    swiping = true;
    dragStarted = false;
  }, {passive: true});
  el.addEventListener('touchmove', e => {
    if (!swiping) return;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    if (!dragStarted && onDragStart) {
      const dx = lastX - startX, dy = lastY - startY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { dragStarted = true; onDragStart(); }
    }
  }, {passive: true});
  el.addEventListener('touchend', finish, {passive: true});
  el.addEventListener('touchcancel', finish, {passive: true});
}
function _mInitTodaySwipe() {
  // Bound to #mMain (gated to the today tab), not #mTodayPage — #mTodayPage is a normal
  // flex child that only sizes to its own content height (banner + list), so on a day
  // with few tasks it can end well short of the full screen; swipes starting in the empty
  // space below it never reached this listener at all, which is the likely reason day-
  // navigation seemed to randomly stop working. #mMain always spans the full viewport
  // (same reasoning mInitPTR, right below, already uses for the exact same element).
  const main = document.getElementById('mMain');
  if (main && !main._todaySwipeInited) {
    main._todaySwipeInited = true;
    _mBindDaySwipe(main, {gate: () => _mCurTab === 'today'});
  }
  // Task menu's backdrop sits above #mMain while the popup is open, silently absorbing
  // the swipe. Bound the same gesture here too, dismissing the menu the moment the drag
  // is recognized as horizontal (not waiting for release) so it reads as "swipe changes
  // the day and the menu gets out of the way," not "swipe does nothing until I let go."
  const tmBackdrop = document.getElementById('mTaskMenuBackdrop');
  if (tmBackdrop && !tmBackdrop._daySwipeInited) {
    tmBackdrop._daySwipeInited = true;
    _mBindDaySwipe(tmBackdrop, {gate: () => _mCurTab === 'today', onDragStart: mCloseTaskMenu});
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
let _mCurTab = 'today';

function mShowTab(tab) {
  _mCurTab = tab;
  try { localStorage._mLastTab = tab; } catch(e) {}
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
  // Neither add bar is tab-toggled via display any more — both are on-demand popups
  // (opacity/pointer-events via .open, mToggleQuickAdd/mToggleShopAdd), positioned fixed
  // regardless of tab, so each must be explicitly closed on any tab switch or it could
  // linger open behind whatever tab is now showing.
  mCloseQuickAdd();
  mCloseShopAdd();
  // The add bars are position:fixed, floating above content — #mApp's own padding only
  // ever needs to clear the fixed nav. Neither bar reserves list clearance any more (both
  // are floating popups, not docked content).
  // No bottom reservation here any more — see the comment on #mApp in mobile.css for why
  // (content now scrolls behind the floating glass nav instead of stopping short of it).
  // No nav button lights up for tb — it's opened from Today's header, not the bottom nav.
  document.querySelectorAll('.m-nav-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'today' && i === 0) || (tab === 'week' && i === 1) || (tab === 'month' && i === 2) || (tab === 'shop' && i === 3) || (tab === 'extras' && i === 4));
    b.classList.remove('pop');
  });
  // Slide the Liquid Glass highlight pill to the new active tab (no-ops harmlessly for
  // tb/recipes, which don't light up any nav button — pill just stays put) and give the
  // icon a small "pop" on arrival.
  _mNavMoveHighlight(true);
  const _mNavActiveBtn = document.querySelector('.m-nav-btn.active');
  if (_mNavActiveBtn) {
    _mNavActiveBtn.classList.add('pop');
    _mNavActiveBtn.addEventListener('animationend', () => _mNavActiveBtn.classList.remove('pop'), {once: true});
  }
  const titles = {today: 'Today', tb: 'Timeblock', week: 'Week', month: 'Month', shop: 'Shop', extras: 'More', recipes: 'Recipes'};
  const titleEl = document.getElementById('mHeaderTitle');
  if (titleEl) titleEl.textContent = titles[tab] || '';
  const progEl = document.getElementById('mProgress');
  if (progEl) progEl.style.display = isToday ? '' : 'none';
  // "+" moved here from the Tasks card's own header (removed, per redesign) to reclaim
  // vertical space for the list itself.
  const addBtn = document.getElementById('mTodayAddBtn');
  if (addBtn) addBtn.style.display = isToday ? '' : 'none';
  // Week's own header icons: "back to today" (sun, matches the bottom nav's Today icon)
  // then "+" (mWeekQuickAdd), both week-only.
  const weekTodayBtn = document.getElementById('mWeekTodayBtn');
  if (weekTodayBtn) weekTodayBtn.style.display = (tab === 'week') ? '' : 'none';
  const weekAddBtn = document.getElementById('mWeekAddBtn');
  if (weekAddBtn) weekAddBtn.style.display = (tab === 'week') ? '' : 'none';
  // Month tab replaces the plain title/date block with its own header controls
  // (month/year dropdowns) — "all in the header" redesign. Its own back-to-today button
  // lives among the other circular header icons (mMonthTodayBtn, toggled below).
  const isMonth = tab === 'month';
  const titleWrap = document.getElementById('mHeaderTitleWrap');
  if (titleWrap) titleWrap.style.display = isMonth ? 'none' : '';
  const moControls = document.getElementById('mMonthHeaderControls');
  if (moControls) moControls.style.display = isMonth ? '' : 'none';
  const moTodayBtn = document.getElementById('mMonthTodayBtn');
  if (moTodayBtn) moTodayBtn.style.display = isMonth ? '' : 'none';
  const moAddBtn = document.getElementById('mMonthAddBtn');
  if (moAddBtn) moAddBtn.style.display = isMonth ? '' : 'none';
  document.getElementById('mMonthMonthDrop')?.classList.remove('open');
  document.getElementById('mMonthYearDrop')?.classList.remove('open');
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

  // Neither Today nor Shop reserves list padding for its add bar any more — both are
  // on-demand popups now, not permanently docked bars, so there's nothing to clear space
  // for; explicitly clear any padding a previous build may have left behind.
  if (isToday) { const tp = document.getElementById('mTodayPage'); if (tp) tp.style.paddingBottom = ''; }
  if (isShop) { const sp = document.getElementById('mShopPage'); if (sp) sp.style.paddingBottom = ''; }
}

// Diagnostic (2026-09-14): reports exact measured numbers on the build stamp — a photo
// can't be measured precisely, so instead of guessing pixel gaps from a screenshot, read
// the real computed safe-area inset + #mNav's actual on-screen gap from the true bottom
// of the viewport. Cheap enough to recompute every time the nav is positioned.
function _mNavDiagUpdate(nav) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const safeBottom = getComputedStyle(probe).paddingBottom;
  probe.remove();
  const rect = nav.getBoundingClientRect();
  const gap = (window.innerHeight - rect.bottom).toFixed(1);
  const txt = `Build ${window._BUILD || '?'} · safe-bottom ${safeBottom} · nav-gap ${gap}px · innerH ${window.innerHeight}px`;
  document.querySelectorAll('.m-build-stamp').forEach(el => { el.textContent = txt; });
}

// Slides #mNavHighlight (the Liquid Glass pill, mobile.css) behind whichever .m-nav-btn
// currently has .active. animate=false is used on initial load/resize to snap into place
// without a visible slide-in.
let _mNavHlLastX = null;
function _mNavMoveHighlight(animate) {
  const bar = document.getElementById('mNav');
  const hl = document.getElementById('mNavHighlight');
  const activeBtn = bar?.querySelector('.m-nav-btn.active');
  if (!bar || !hl || !activeBtn) return;
  const barRect = bar.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const x = btnRect.left - barRect.left - 6; // 6 = #mNav's own padding, the pill's resting left
  _mNavDiagUpdate(bar);
  if (!animate) {
    hl.style.transition = 'none';
    hl.style.transform = `translateX(${x}px)`;
    void hl.offsetHeight;
    hl.style.transition = '';
    _mNavHlLastX = x;
    return;
  }
  // A fixed transition-duration made a full end-to-end jump (Today <-> More, 4 tabs
  // apart) play at the same speed as a one-tab hop (e.g. Shop <-> More) — same time
  // over 4x the distance means both a much higher velocity AND a proportionally bigger
  // absolute spring-overshoot, which is why only the long jumps looked like they flew
  // past the target. Scaling duration to the actual distance traveled keeps the pill's
  // speed (and so its overshoot's relative size) consistent regardless of which two
  // tabs are involved.
  const dist = Math.abs(x - (_mNavHlLastX ?? x));
  const dur = Math.max(260, Math.min(550, 260 + dist * 0.55));
  hl.style.transitionDuration = dur + 'ms';
  hl.style.transform = `translateX(${x}px)`;
  _mNavHlLastX = x;
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
  const refreshBtn = `<button class="m-reload-btn" onclick="mReloadTap()" title="Reload app (hold to undo)" style="flex-shrink:0;margin-left:auto"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>`;
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

  // 'shop-cal-' prefix (not just 'shop-') matches Today's mGetTodayTasks AND desktop's own
  // convention (features.js/overview.js) exactly — this used to be a bare 'shop-' here,
  // a different id than the SAME item gets on Today, which silently broke manual _dayOrder
  // matching (_mManualTieBreak indexes by exact id string) for any day with a shopping item.
  const shopItems = st.shopping
    .filter(s => !s.done && s.due_date && (s.due_date === ds || (isToday && isOv(s.due_date))))
    .map(s => ({id: 'shop-cal-' + s.id, name: s.name, category: 'Shopping', due_date: s.due_date, done: false, _shopId: s.id, _virtual: true, _type: 'shop'}));

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
  // 'vid-ov-' prefix (not just 'vid-') — same reasoning as shopItems' 'shop-cal-' fix above,
  // matches Today's mGetTodayTasks/desktop's own id convention exactly.
  }).map(v => ({id: 'vid-ov-' + v.id, name: v.topic || v.title, category: 'Videos', due_date: ds, done: v.status === 'published', _vidId: v.id, _virtual: true, _type: 'vid'}))
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
  const canEdit = !t._virtual && !t._type; // plain real task — same test mTaskRow uses

  let onchange = '';
  if (t._type === 'shop')          onchange = `togShop('${t._shopId}',this.checked)`;
  else if (t._type === 'vidstep')  onchange = `mToggleVidStep('${t._vidId}','${t._vidStep}',this.checked,'${t.due_date}')`;
  else if (t._type === 'vid')      onchange = `toggleTask('${t.id}',this.checked)`;
  else if (t._isWrRule)            onchange = `togWrRule('${t._ruleId}',this.checked,'${t._wkKey}')`;
  else if (t._virtual && t._recId) onchange = `togRecVirt('${t._recId}',this.checked,'${t._wkKey}')`;
  else if (t._type === 'pup')      onchange = `togPupSessionDone('${t._pupSessId}',this.checked)`;
  else if (t._type === 'fin-cancel') onchange = `togFinCancelDone('${t._subId}',this.checked);renderAll()`;
  else if (!t._virtual && !noCheck) onchange = `toggleTask('${t.id}',this.checked)`;

  // Left color bar (same two-tone fill+outline pairing Today's rows use) instead of the
  // old free-floating dot on the row's trailing edge — carries the same category/overdue/
  // important color meaning, just moved to match Today's list convention.
  const band = `<span class="m-wk-band" style="background:${s.bg};border-color:${s.d}"></span>`;
  const chk = noCheck
    ? `<span class="m-wk-icon">${t._type === 'holiday' ? '' : '\u{1F382}'}</span>`
    : `<label class="m-chk-wrap"><input type="checkbox"${t.done ? ' checked' : ''}${onchange ? ` onchange="${onchange}"` : ''}></label>`;

  // "→ Today" one-tap reschedule for overdue rows — exact port of mTaskRow's own canMv/
  // mvArgs/mvBtn (Today only had this before; Week just showed the red tint with no way
  // to act on it).
  const canMv = ov && (canEdit || t._type === 'shop' || t._type === 'vidstep' || t._type === 'vid' || t._type === 'pup' || t._isWrec || t._isWrRule || (t._virtual && t._recId));
  const mvArgs = canMv ? _mMoveToTodayArgs(t) : null;
  const _mvIsRecurring = mvArgs && (mvArgs[1] === 'wrrule' || mvArgs[1] === 'wrec' || mvArgs[1] === 'rec');
  const mvBtn = canMv
    ? (_mvIsRecurring
        ? `<button class="m-mv-today" onclick="event.stopPropagation();_mOvRowMoveClick('${mvArgs[1]}','${mvArgs[0]}','${mvArgs[2]}')">→ Today</button>`
        : `<button class="m-mv-today" onclick="event.stopPropagation();mMoveToToday('${mvArgs[0]}','${mvArgs[1]}'${mvArgs[2] !== undefined ? `,'${mvArgs[2]}'` : ''})">→ Today</button>`)
    : '';

  // data-rid/data-rtype(+per-type extras) mirror mTaskRow's own convention exactly, so the
  // shared tap-menu/edit system (_mShowTaskMenu/_mRowEdit — click for menu, double-click/
  // -tap for edit, both scoped to the tapped row's actual type) works here unmodified —
  // see mInitWeekDblTap. data-tid/data-tname (real tasks only) are unchanged from before —
  // the existing hold-and-drag-to-a-different-day gesture (mInitWkDrag) still keys off them.
  const rtype = canEdit ? 'task' : (t._type || (t._isWrec ? 'wrec' : t._isWrRule ? 'wrrule' : t._virtual ? 'rec' : 'other'));
  const ruleId = t._isWrRule ? t._ruleId : t._recId;
  const extraAttrs = [
    canEdit ? ` data-tid="${t.id}" data-tname="${escHtml(t.name || '')}"` : '',
    rtype === 'shop' ? ` data-shopid="${t._shopId}"` : '',
    (rtype === 'wrec' || rtype === 'wrrule' || rtype === 'rec') && ruleId !== undefined ? ` data-ruleid="${ruleId}" data-wkkey="${t._wkKey || ''}"` : '',
    rtype === 'vid' && t._vidId !== undefined ? ` data-vidid="${t._vidId}"` : '',
    rtype === 'vidstep' && t._vidId !== undefined ? ` data-vidid="${t._vidId}" data-vidstep="${t._vidStep}" data-day="${t.due_date}"` : ''
  ].join('');

  return `<div class="m-wk-row${t.done ? ' m-wk-done' : ''}${ov ? ' m-ov' : ''}" data-rid="${t.id}" data-rtype="${rtype}"${extraAttrs}>
    ${band}
    ${chk}
    <span class="m-wk-task-name${t.done ? ' done' : ''}">${escHtml(t.name || '')}</span>
    ${mvBtn}
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

    html += `<div class="m-wk-day${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}" data-ds="${ds}">
      <div class="m-wk-hd">
        <span class="m-wk-dname">${_WK_DAYS[i]}</span>
        <span class="m-wk-ddate">${dateStr}</span>
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
  // GAP leaves today's card sitting a little below the header instead of flush against
  // it — a plain top margin on .m-wk-day.is-today can't do this: this scroll math always
  // re-aligns the card's (post-margin) top edge right at the header's bottom edge, so any
  // margin just gets scrolled past rather than becoming visible breathing room. This is
  // the one place that actually controls it.
  const GAP = 10;
  const target = Math.max(0, sc.scrollTop + (todayEl.getBoundingClientRect().top - scTop - headerH) - GAP);
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

// ── Week: quick-add ───────────────────────────────────────────────────────────
// Week's header "+" opens the exact same full-featured quick-add popup Today's "+" uses
// (types, travel, shopping, recurring/WR creation, etc.) instead of the old bare-bones
// per-day name+category sheet (#mWkAddSheet, retired) — always targets today's own date
// (mAddTask's ds computation keys off _mTodayOffset, which only means something on the
// Today tab; force it to 0 here so a stale offset left over from swiping Today forward/
// back doesn't silently misdate an add made from Week).
function mWeekQuickAdd() {
  _mTodayOffset = 0;
  mOpenQuickAdd();
}

// ── Week: back to today ───────────────────────────────────────────────────────
// Header sun icon (left of "+") — jumps the infinite-scroll list back to the default
// range and re-scrolls to today, same as this tab's own initial tab-open behavior
// (mRenderWeek(true)). Useful once you've scrolled away browsing other weeks.
function mWeekGoToday() {
  mRenderWeek(true);
}

// ── Week drag: hold + drag row to reorder within a day, or move it to another day ────
// Replaces the old floating-ghost-pill approach with the same live-reparent technique
// Today's own drag-reorder uses (mInitTodayDrag/_mTodDragMove/_mTodDragEnd, above) —
// dragging the actual row gives the same direct-manipulation feel Today has, and lets
// ONE gesture cover both cases Week needs that Today never had to: dropping among a
// DIFFERENT day's rows changes due_date (as before), dropping among the row's OWN day's
// rows just reorders it (writes _dayOrder, no due_date change) — Today only ever has
// one day's list, so it never needed the "which container did this land in" question.
let _mWkDrag = null;

function _mWkDragMove(e) {
  if (!_mWkDrag) return;
  e.preventDefault(); // block scroll while dragging
  const list = document.getElementById('mWeekList');
  if (!list) return;
  const touch = e.touches[0];
  const {el} = _mWkDrag;

  // Auto-scroll the actual scrolling element (page or document — see _mWkScroller) when
  // near top/bottom edges, same threshold/speed as before.
  const scroller = _mWkScroller();
  const mr = scroller.getBoundingClientRect ? scroller.getBoundingClientRect() : {top: 0, bottom: window.innerHeight};
  const EDGE = 80, SPEED = 8;
  if (touch.clientY > mr.bottom - EDGE)      scroller.scrollTop += SPEED;
  else if (touch.clientY < mr.top + EDGE)    scroller.scrollTop -= SPEED;

  // el has pointer-events:none while we hit-test so elementFromPoint sees what's under it
  el.style.pointerEvents = 'none';
  const hit = document.elementFromPoint(touch.clientX, touch.clientY);
  el.style.pointerEvents = '';
  const targetDay = hit?.closest('.m-wk-day[data-ds]');
  if (!targetDay || !list.contains(targetDay)) return;
  const targetRow = hit?.closest('.m-wk-row[data-rid]');

  if (targetRow && targetRow !== el && targetDay.contains(targetRow)) {
    const rect = targetRow.getBoundingClientRect();
    const before = touch.clientY < rect.top + rect.height / 2;
    targetDay.insertBefore(el, before ? targetRow : targetRow.nextSibling);
  } else if (!targetDay.contains(el)) {
    // Hovering a day with nothing under the finger yet (empty space, or a day with no
    // real rows) — drop at the end, but before the "—" empty placeholder if present.
    targetDay.insertBefore(el, targetDay.querySelector('.m-wk-empty') || null);
  }

  document.querySelectorAll('.m-wk-day[data-ds]').forEach(d => {
    d.classList.toggle('m-wk-drop-target', d === targetDay && d.dataset.ds !== _mWkDrag.origDs);
  });
}

// Single tap -> task menu, double tap -> edit — same routing as Today's own
// mInitTodayDblTap/mInitShopDblTap (both mobile-overview.js), just scoped to #mWeekList.
// _mShowTaskMenu/_mRowEdit are generic (read el.dataset.*, no #mTodayList-specific
// assumptions) so they work here unmodified as long as mWkTaskRow emits the same
// data-rid/data-rtype/data-* attributes mTaskRow does — which it now does.
// Coexists with mInitWkDrag's own 480ms hold-drag (below) exactly the way Today's two
// listeners already coexist on #mTodayList: a real drag moves the finger past this
// listener's own 10px tap threshold, so it silently bails out instead of also opening
// a menu.
let _wkTapTimer = null;
function mInitWeekDblTap() {
  const list = document.getElementById('mWeekList');
  if (!list || list._dblTapInited) return;
  list._dblTapInited = true;
  let tapStartX = 0, tapStartY = 0;
  list.addEventListener('touchstart', e => {
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }, {passive: true});
  list.addEventListener('touchend', e => {
    const row = e.target.closest('.m-wk-row[data-rid]');
    if (!row) return;
    if (e.target.closest('.m-chk-wrap')) return; // checkbox owns its own tap
    if (e.target.closest('.m-mv-today')) return; // "→ Today" button owns its own tap
    const ct = e.changedTouches[0];
    if (Math.abs(ct.clientX - tapStartX) > 10 || Math.abs(ct.clientY - tapStartY) > 10) return;
    const id = row.dataset.rid;
    if (_isDblTap(id)) {
      if (_wkTapTimer) { clearTimeout(_wkTapTimer); _wkTapTimer = null; }
      _mRowEdit(row);
      return;
    }
    clearTimeout(_wkTapTimer);
    _wkTapTimer = setTimeout(() => { _wkTapTimer = null; _mShowTaskMenu(row); }, 350);
  }, {passive: true});
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
      const dayEl = rowEl.closest('.m-wk-day[data-ds]');
      const origDs = dayEl?.dataset.ds;
      if (!origDs) return;
      // Snapshot this day's row order BEFORE the drag starts moving anything, so drop can
      // tell "landed back where it started" (no-op) from "actually reordered".
      const origOrder = [...dayEl.querySelectorAll('.m-wk-row[data-rid]')].map(r => r.dataset.rid);

      rowEl.classList.add('m-wk-row-dragging');
      _mWkDrag = {tid: rowEl.dataset.tid, el: rowEl, origDs, origOrder};
      document.addEventListener('touchmove', _mWkDragMove, {passive: false});
      navigator.vibrate?.(8);
    }, 480);
  }, {passive: true});

  list.addEventListener('touchmove', e => {
    if (!pressTimer) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 8 ||
        Math.abs(e.touches[0].clientY - touchStartY) > 8) {
      clearTimeout(pressTimer); pressTimer = null;
    }
  }, {passive: true});

  function endDrag(cancelled) {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!_mWkDrag) return;
    document.removeEventListener('touchmove', _mWkDragMove);
    const {tid, el, origDs, origOrder} = _mWkDrag;
    _mWkDrag = null;
    el.classList.remove('m-wk-row-dragging');
    document.querySelectorAll('.m-wk-day').forEach(d => d.classList.remove('m-wk-drop-target'));

    if (cancelled) { mRenderWeek(); return; }

    const targetDay = el.closest('.m-wk-day[data-ds]');
    const targetDs = targetDay?.dataset.ds;
    if (!targetDs) { mRenderWeek(); return; }
    const newOrder = [...targetDay.querySelectorAll('.m-wk-row[data-rid]')].map(r => r.dataset.rid);

    if (targetDs === origDs) {
      // Pure reorder within the same day — same _dayOrder mechanism Today's own
      // drag-reorder writes (mInitTodayDrag, above), so it round-trips through desktop's
      // sort correctly too. No-op if it landed back exactly where it started.
      if (JSON.stringify(newOrder) === JSON.stringify(origOrder)) return;
      const m = _dayOrder();
      const prevOrder = m[origDs] ? [...m[origDs]] : null;
      m[origDs] = newOrder;
      _dayOrderSet(m);
      mRenderWeek();
      pushUndo(() => { const m2 = _dayOrder(); if (prevOrder) m2[origDs] = prevOrder; else delete m2[origDs]; _dayOrderSet(m2); renderAll(); }, 'Reordered day');
      return;
    }

    // Moved to a different day — changes due_date (as before), and ALSO captures where it
    // landed within the target day's order (dropping it at a specific spot should stick,
    // same as a plain same-day reorder — otherwise it'd land there visually during the
    // drag and then jump on the next render once the natural sort re-runs).
    const t = st.tasks.find(x => String(x.id) === String(tid));
    if (!t) { mRenderWeek(); return; }
    const _prevDue = (t.due_date || '').split('T')[0];
    t.due_date = targetDs;
    _mMoveTaskBlocks(tid, _prevDue, targetDs);
    const m = _dayOrder();
    const prevTargetOrder = m[targetDs] ? [...m[targetDs]] : null;
    m[targetDs] = newOrder;
    _dayOrderSet(m);
    save();
    mRenderWeek();
    pushUndo(() => {
      const t2 = st.tasks.find(x => String(x.id) === String(tid));
      if (t2) { t2.due_date = _prevDue; _mMoveTaskBlocks(tid, targetDs, _prevDue); }
      const m2 = _dayOrder();
      if (prevTargetOrder) m2[targetDs] = prevTargetOrder; else delete m2[targetDs];
      _dayOrderSet(m2);
      save(); renderAll();
      sbReq('PATCH', 'tasks', {due_date: _prevDue}, `?id=eq.${tid}`);
    }, 'Moved task');
    sbReq('PATCH', 'tasks', {due_date: targetDs}, `?id=eq.${tid}`);
  }

  list.addEventListener('touchend', () => endDrag(false), {passive: true});
  list.addEventListener('touchcancel', () => endDrag(true), {passive: true});
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
// Row markup ported from mTaskRow's Today-list convention (.m-row-outer/.m-row,
// .m-chk-wrap circle checkbox) so Shop reads as the same list system as Today instead of
// its own older glass-pill style. No left color band (unlike Today's rows) — every Shop
// row was the same shopping-orange, so it carried no information; overdue items still get
// the tinted-background treatment (m-ov) that Today's overdue rows use.
function mShopRow(s) {
  const overdue = !!(s.due_date && isOv(s.due_date));
  let dueTxt = '';
  if (s.due_date) {
    const d = new Date(s.due_date + 'T00:00:00');
    dueTxt = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  }
  return `<div class="m-row-outer" data-rid="${s.id}" data-rtype="shop" data-shopid="${s.id}">
    <div class="m-row${overdue ? ' m-ov' : ''}">
      <label class="m-chk-wrap"><input type="checkbox" onchange="togShop('${s.id}',this.checked)"></label>
      <span class="m-row-name">${escHtml(s.name || '')}</span>
      ${dueTxt ? `<span class="m-shop-due-lbl">${dueTxt}</span>` : ''}
    </div>
  </div>`;
}

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

  // Known stores (M_SHOP_STORES, below) group in that fixed order — HEB first, matching
  // the store picker's own order — not alphabetically (that put Costco ahead of HEB).
  // Anything else (a custom "Other" name, or the literal "Other") sorts alphabetically
  // after the known ones.
  const storeNames = Object.keys(groups).sort((a, b) => {
    const pa = M_SHOP_STORES.indexOf(a), pb = M_SHOP_STORES.indexOf(b);
    if (pa !== -1 && pb !== -1) return pa - pb;
    if (pa !== -1) return -1;
    if (pb !== -1) return 1;
    return a.localeCompare(b);
  });
  if (!storeNames.length) {
    list.innerHTML = `<div class="m-empty"><div class="m-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="m-empty-txt">Nothing on the list</div></div>`;
    return;
  }
  list.innerHTML = storeNames.map(store =>
    `<div class="m-shop-store-hd">${escHtml(store)}</div>` + groups[store].map(s => mShopRow(s)).join('')
  ).join('');

  // Checked state set directly (not baked into the template) so togShop's own
  // optimistic-then-confirm flow doesn't need a full re-render to reflect a toggle.
  storeNames.forEach(store => {
    groups[store].forEach(s => {
      const outer = list.querySelector(`.m-row-outer[data-shopid="${s.id}"]`);
      const chk = outer?.querySelector('input[type=checkbox]');
      if (chk) chk.checked = !!s.done;
    });
  });
}

// Single tap -> task menu (Edit/Delete, via _mShowTaskMenu's existing 'shop' rtype
// branch), double tap -> edit sheet directly. Exact port of mInitTodayDblTap, scoped to
// #mShopList — reuses _mShowTaskMenu/_mRowEdit as-is since both already handle rtype
// 'shop' generically (built for when shop rows show up on the Today list).
let _shopTapTimer = null;
function mInitShopDblTap() {
  const list = document.getElementById('mShopList');
  if (!list || list._dblTapInited) return;
  list._dblTapInited = true;
  let tapStartX = 0, tapStartY = 0;
  list.addEventListener('touchstart', e => {
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }, {passive: true});
  list.addEventListener('touchend', e => {
    const outer = e.target.closest('.m-row-outer[data-rid]');
    if (!outer) return;
    if (e.target.closest('.m-chk-wrap')) return; // checkbox owns its own tap
    const ct = e.changedTouches[0];
    if (Math.abs(ct.clientX - tapStartX) > 10 || Math.abs(ct.clientY - tapStartY) > 10) return;
    const id = outer.dataset.rid;
    if (_isDblTap(id)) {
      if (_shopTapTimer) { clearTimeout(_shopTapTimer); _shopTapTimer = null; }
      _mRowEdit(outer);
      return;
    }
    clearTimeout(_shopTapTimer);
    _shopTapTimer = setTimeout(() => { _shopTapTimer = null; _mShowTaskMenu(outer); }, 350);
  }, {passive: true});
}

// Add shop item — store/link handling mirrors Today's own Shopping-type add branch
// (mAddTask's `cat === 'Shopping'` case) exactly: _mShopAddStore picker, 'Other' hands off
// to the free-text field, link is optional.
async function mAddShopItem() {
  const nameEl = document.getElementById('mShopNewName');
  const n = nameEl.value.trim();
  if (!n) return;
  let store = _mShopAddStore || 'HEB';
  if (store === 'Other') store = document.getElementById('mShopAddStoreCustom')?.value.trim() || 'Other';
  const link = document.getElementById('mShopAddLink')?.value.trim() || null;
  const s = {id: 'l-' + Date.now(), name: n, store, link, done: false};
  st.shopping.push(s);
  save(); mRenderShop();
  nameEl.value = '';
  const customEl = document.getElementById('mShopAddStoreCustom'); if (customEl) customEl.value = '';
  const linkEl = document.getElementById('mShopAddLink'); if (linkEl) linkEl.value = '';
  mCloseShopAdd();
  const sv = await sbReq('POST', 'shopping_list', {name: n, store, link, done: false});
  if (sv && sv[0]) {
    const i = st.shopping.findIndex(x => x.id === s.id);
    if (i > -1) st.shopping[i] = sv[0];
    save();
  }
}

// Delete shop item directly (task menu's Delete button — mTaskMenuDelete)
async function mDeleteShopDirect(id) {
  const s = st.shopping.find(x => String(x.id) === String(id));
  if (!s) return;
  st.shopping = st.shopping.filter(x => String(x.id) !== String(id));
  save(); renderAll(); // not just mRenderShop() — the task menu's Delete now also reaches here from Week
  await sbReq('DELETE', 'shopping_list', null, `?id=eq.${id}`);
}

// Shop edit sheet
let _mShopEditId = null;
// Known store-picker options — any other stored value (e.g. a prior custom name) falls
// back to "Other" with that value pre-filled in the free-text field.
const M_SHOP_STORES = ['HEB', 'Costco', 'Ikea', 'Online'];
function mOpenShopEdit(id) {
  const s = st.shopping.find(x => String(x.id) === String(id));
  if (!s) return;
  _mShopEditId = String(id);
  document.getElementById('mShopEditName').value = s.name || '';
  // Set picker state directly (not via mSelectShopEditStore) — that function also steals
  // focus to the custom field when landing on "Other", which would fight the name-field
  // focus below on every open.
  const knownStore = M_SHOP_STORES.includes(s.store) ? s.store : 'Other';
  _mShopEditStoreVal = knownStore;
  const lbl = document.getElementById('mShopEditStoreLbl'); if (lbl) lbl.textContent = knownStore;
  const cf = document.getElementById('mShopEditStoreCustomField'); if (cf) cf.style.display = knownStore === 'Other' ? '' : 'none';
  const customEl = document.getElementById('mShopEditStoreCustom'); if (customEl) customEl.value = knownStore === 'Other' ? (s.store || '') : '';
  document.getElementById('mShopEditLink').value = s.link || '';
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
  document.getElementById('mShopEditStoreOpts')?.classList.remove('open');
}

// Shop edit sheet's store picker — same "Other" -> free-text pattern as
// mSelectShopAddStore/Today's mSelectStore, scoped to #mShopEditStoreOpts instead.
let _mShopEditStoreVal = 'HEB';
function mToggleShopEditStorePick() {
  document.getElementById('mShopEditStoreOpts')?.classList.toggle('open');
}
function mSelectShopEditStore(store) {
  _mShopEditStoreVal = store;
  const lbl = document.getElementById('mShopEditStoreLbl');
  if (lbl) lbl.textContent = store;
  document.getElementById('mShopEditStoreOpts')?.classList.remove('open');
  const isOther = store === 'Other';
  const f = document.getElementById('mShopEditStoreCustomField');
  if (f) f.style.display = isOther ? '' : 'none';
  if (isOther) document.getElementById('mShopEditStoreCustom')?.focus();
}

async function mSaveShopEdit() {
  if (!_mShopEditId) return;
  const s = st.shopping.find(x => String(x.id) === String(_mShopEditId));
  if (!s) return;
  const name = document.getElementById('mShopEditName').value.trim();
  if (!name) return;
  let store = _mShopEditStoreVal || s.store;
  if (store === 'Other') store = document.getElementById('mShopEditStoreCustom')?.value.trim() || 'Other';
  const link = document.getElementById('mShopEditLink')?.value.trim() || null;
  const due_date = document.getElementById('mShopEditDue').value || null;
  const time = document.getElementById('mShopEditTime').value || null;
  const id = _mShopEditId;
  s.name = name; s.store = store; s.link = link; s.due_date = due_date; s.default_start_time = time;
  // renderAll() (not mRenderShop()+mRenderToday() only) — this sheet now also opens from
  // Week's tap menu, so Week needs to pick up the change too.
  save(); mCloseShopEdit(); renderAll();
  const patch = {name, store, link, due_date};
  if (time !== null) patch.default_start_time = time;
  await sbReq('PATCH', 'shopping_list', patch, `?id=eq.${id}`);
}

async function mDeleteShopItem() {
  if (!_mShopEditId) return;
  const id = _mShopEditId;
  st.shopping = st.shopping.filter(x => String(x.id) !== String(id));
  save(); mCloseShopEdit(); renderAll();
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
  requestAnimationFrame(() => { _mSyncMonthScrollHeight(); requestAnimationFrame(() => _mMoScrollToMonthStart()); });
}

// Sets #mMonthScroll's height explicitly from real viewport measurements instead of
// trusting the flex:1/min-height:0 chain to bound it correctly. If that chain fails
// for any reason, the calendar's content grows taller than the screen and scrolling
// stops working as expected (the whole page grows instead of just this region
// scrolling internally) — an explicit pixel height sidesteps the problem outright.
function _mSyncMonthScrollHeight() {
  const scroller = document.getElementById('mMonthScroll');
  if (!scroller) return;
  const header = document.getElementById('mHeader');
  const nav = document.getElementById('mNav');
  const dayHdr = document.getElementById('mMonthDayHdr');
  const detail = document.getElementById('mMonthDetail');
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  const navH = nav ? nav.offsetHeight : 0;
  const dayHdrH = dayHdr ? dayHdr.offsetHeight : 0;
  const detailH = detail ? detail.offsetHeight : 0;
  const avail = window.innerHeight - headerBottom - navH - dayHdrH - detailH - 12;
  scroller.style.flex = 'none';
  scroller.style.height = Math.max(120, avail) + 'px';
}
window.addEventListener('resize', () => { if (_mCurTab === 'month') _mSyncMonthScrollHeight(); _mNavMoveHighlight(false); });

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
    // Target the specific date's cell, not "the row for this weekOff" — a week that
    // spans a month boundary now renders as two partial rows (see _mMoWeekRowHtml), so
    // looking up by weekOff alone could land on the wrong one (the tail of the prior month).
    const targetEl = document.querySelector(`.m-mo-day[data-ds="${targetDs}"]`);
    const row = targetEl && targetEl.closest('.m-mo-week');
    const scroller = document.getElementById('mMonthScroll');
    // Direct scrollTop math instead of scrollIntoView — see _mMoScrollToMonthStart for why.
    if (row && scroller) scroller.scrollTop += row.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    _mUpdateMonthTitle();
  });
}

// Tracks which month/year is currently docked at the top of the scroll view (set by
// _mUpdateMonthTitle) so picking just a month (or just a year) from its own dropdown
// keeps the OTHER value as-is, rather than resetting it.
let _mMonthDisplayedMo = new Date().getMonth();
let _mMonthDisplayedYr = new Date().getFullYear();
const _M_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function mToggleMonthDrop() {
  document.getElementById('mMonthYearDrop')?.classList.remove('open');
  const el = document.getElementById('mMonthMonthDrop');
  if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  el.innerHTML = _M_MONTH_NAMES.map((name, mi) => `<div class="m-mo-hdr-drop-opt${mi === _mMonthDisplayedMo ? ' is-current' : ''}" onclick="mPickMonth(${mi})">${name}</div>`).join('');
  el.classList.add('open');
}

function mPickMonth(mi) {
  document.getElementById('mMonthMonthDrop')?.classList.remove('open');
  const now = new Date();
  mMonthJumpToOffset((_mMonthDisplayedYr - now.getFullYear()) * 12 + (mi - now.getMonth()));
}

function mToggleYearDrop() {
  document.getElementById('mMonthMonthDrop')?.classList.remove('open');
  const el = document.getElementById('mMonthYearDrop');
  if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  const nowYr = new Date().getFullYear();
  let html = '';
  for (let y = 2026; y <= Math.max(nowYr + 5, 2031); y++) html += `<div class="m-mo-hdr-drop-opt${y === _mMonthDisplayedYr ? ' is-current' : ''}" onclick="mPickYear(${y})">${y}</div>`;
  el.innerHTML = html;
  el.classList.add('open');
}

function mPickYear(yr) {
  document.getElementById('mMonthYearDrop')?.classList.remove('open');
  const now = new Date();
  mMonthJumpToOffset((yr - now.getFullYear()) * 12 + (_mMonthDisplayedMo - now.getMonth()));
}

// "+" button in the month header — same quick-add popup Today/Week use (type picker:
// Travel/Shopping/Weekly Reset/Recurring/plain), not the heavier full-add sheet. mAddTask()
// derives its due date from _mTodayOffset (see mWeekQuickAdd's identical trick), so this
// sets that offset to the day-gap between today and whichever day is selected on the
// calendar before opening it — targets the selected day instead of always today.
function mMonthQuickAdd() {
  const target = _mMonthSelectedDs || d2s(getDayDate(0));
  const today = d2s(getDayDate(0));
  _mTodayOffset = Math.round((new Date(target + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000);
  mOpenQuickAdd();
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
    // Bug fix: the grouping key and the color MUST use the exact same isOverdue/isImportant
    // conditions (requiring !t.done). A prior version checked isOv() alone for the grouping
    // key but sourced the color from a separate done-unaware helper — so a done task landed
    // in the '_overdue' bucket (wrong group) while colorFor[key] ended up being whichever
    // task in that bucket was processed last (inconsistent color).
    const noCheck = t._type === 'travel' || t._type === 'birthday' || t._type === 'holiday';
    const isOverdue = !noCheck && isOv(t.due_date) && !t.done;
    const isImportant = !!t.important && !t.done;
    const key = isOverdue ? '_overdue' : isImportant ? '_important' : _mMonthCatKey(t).toLowerCase();
    const color = isOverdue ? OV.d : isImportant ? IMP.d : gc(_mMonthCatKey(t)).d;
    counts[key] = (counts[key] || 0) + 1;
    colorFor[key] = color;
  });
  const rank = k => k === '_overdue' ? -2 : k === '_important' ? -1 : (order.indexOf(k) === -1 ? 999 : order.indexOf(k));
  const keys = Object.keys(counts).sort((a, b) => rank(a) - rank(b));
  if (keys.length === 1) return `<span class="m-mo-dot" style="background:${colorFor[keys[0]]}"></span>`;
  const total = items.length;
  const segs = keys.map(k => `<span style="flex:${counts[k] / total};background:${colorFor[k]}"></span>`).join('');
  return `<div class="m-mo-bar">${segs}</div>`;
}

// One week's row(s) of day cells. When the Mon-Sun week crosses a month boundary, the
// row SPLITS into two partial rows at exactly that boundary (like iOS Calendar's
// continuous list) — the outgoing month's tail days on one line, a month-name divider,
// then the incoming month's days starting fresh on the next line. Both partial rows
// stay full 7-column grids (blank cells for the days that belong to the other row) so
// they still line up under the M/T/W/T/F/S/S header. Each day's badge is built from
// mGetDayTasks — the exact same source the tap-to-detail panel uses.
function _mMoWeekRowHtml(weekOff, forceLabel) {
  const dates = getWkDates(weekOff);
  const today = d2s(getDayDate(0));
  let splitIdx = -1;
  for (let i = 1; i < 7; i++) {
    if (dates[i].getMonth() !== dates[0].getMonth()) { splitIdx = i; break; }
  }
  const cellHtml = d => {
    const ds = d2s(d);
    const isToday = ds === today;
    const badge = _mMonthDayBadge(mGetDayTasks(ds, weekOff));
    // Badge always sits in its own fixed-height slot (even when empty) so the day
    // number never shifts depending on whether that day has a badge or not.
    return `<div class="m-mo-day${isToday ? ' is-today' : ''}${_mMonthSelectedDs === ds ? ' selected' : ''}" data-ds="${ds}" onclick="mMonthSelectDay('${ds}')"><span class="m-mo-num">${d.getDate()}</span><div class="m-mo-badge-slot">${badge}</div></div>`;
  };
  const blankCell = () => '<div class="m-mo-day m-mo-day-empty"></div>';
  const monthLabel = d => `<div class="m-mo-month-divider">${d.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</div>`;

  if (splitIdx === -1) {
    const divider = (dates[0].getDate() === 1 || forceLabel) ? monthLabel(dates[0]) : '';
    const cells = dates.map(cellHtml).join('');
    return `${divider}${_mMoTravelLabelsHtml(dates, 0, 6)}<div class="m-mo-week" data-wk="${weekOff}" data-mon="${d2s(dates[0])}">${cells}${_mMoTravelBarsHtml(dates, 0, 6)}</div>`;
  }
  let html = (dates[0].getDate() === 1 || forceLabel) ? monthLabel(dates[0]) : '';
  html += _mMoTravelLabelsHtml(dates, 0, splitIdx - 1);
  const firstCells = dates.slice(0, splitIdx).map(cellHtml).join('') + Array(7 - splitIdx).fill(0).map(blankCell).join('');
  html += `<div class="m-mo-week" data-wk="${weekOff}" data-mon="${d2s(dates[0])}">${firstCells}${_mMoTravelBarsHtml(dates, 0, splitIdx - 1)}</div>`;
  html += monthLabel(dates[splitIdx]);
  html += _mMoTravelLabelsHtml(dates, splitIdx, 6);
  const secondCells = Array(splitIdx).fill(0).map(blankCell).join('') + dates.slice(splitIdx).map(cellHtml).join('');
  html += `<div class="m-mo-week" data-wk="${weekOff}" data-mon="${d2s(dates[splitIdx])}">${secondCells}${_mMoTravelBarsHtml(dates, splitIdx, 6)}</div>`;
  return html;
}

// Small text lane above each week row showing the trip name over its date span (iOS
// Calendar-style all-day event label) — the travel bar itself (_mMoTravelBarsHtml, below)
// carries only a title tooltip, no visible text, so multi-day trips had no on-screen name.
// Same left/width percentage math as that bar, kept as a separate lane instead of text
// inside the bar so it never has to fight the day numbers for legibility/z-index.
function _mMoTravelLabelsHtml(dates, colStart, colEnd) {
  const wkStart = d2s(dates[0]), wkEnd = d2s(dates[6]);
  const trips = (st.travel || []).filter(tv => {
    const s = tv.start_date ? tv.start_date.split('T')[0] : null;
    if (!s) return false;
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    return s <= wkEnd && e >= wkStart;
  });
  if (!trips.length) return '';
  const ts = gc('travel');
  const labels = trips.map(tv => {
    const s = tv.start_date.split('T')[0];
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    const startsHere = s >= wkStart, endsHere = e <= wkEnd;
    const startIdx = startsHere ? dates.findIndex(d => d2s(d) === s) : 0;
    const endIdx = endsHere ? dates.findIndex(d => d2s(d) === e) : 6;
    if (endIdx < colStart || startIdx > colEnd) return '';
    const segStart = Math.max(startIdx, colStart);
    const segEnd = Math.min(endIdx, colEnd);
    const left = (segStart / 7 * 100).toFixed(4);
    const width = ((segEnd - segStart + 1) / 7 * 100).toFixed(4);
    return `<div class="m-mo-trip-label" style="left:calc(${left}% + 2px);width:calc(${width}% - 4px);background:${ts.bg};color:${ts.t}">${escHtml(tv.name || '')}</div>`;
  }).join('');
  return labels ? `<div class="m-mo-trip-lane">${labels}</div>` : '';
}

// A continuous colored bar spanning each trip's date range within this week row, like
// iOS Calendar's multi-day all-day event bars. colStart/colEnd (0-6, inclusive) clip
// rendering to one partial row's column range when the week is split across a month
// boundary — the same 7-column percentage math applies to both partial rows since each
// is still a full 7-column grid (see _mMoWeekRowHtml).
function _mMoTravelBarsHtml(dates, colStart, colEnd) {
  const wkStart = d2s(dates[0]), wkEnd = d2s(dates[6]);
  const trips = (st.travel || []).filter(tv => {
    const s = tv.start_date ? tv.start_date.split('T')[0] : null;
    if (!s) return false;
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    return s <= wkEnd && e >= wkStart;
  });
  if (!trips.length) return '';
  const ts = gc('travel');
  return trips.map(tv => {
    const s = tv.start_date.split('T')[0];
    const e = tv.end_date ? tv.end_date.split('T')[0] : s;
    const startsHere = s >= wkStart, endsHere = e <= wkEnd;
    const startIdx = startsHere ? dates.findIndex(d => d2s(d) === s) : 0;
    const endIdx = endsHere ? dates.findIndex(d => d2s(d) === e) : 6;
    if (endIdx < colStart || startIdx > colEnd) return ''; // no overlap with this segment
    const segStart = Math.max(startIdx, colStart);
    const segEnd = Math.min(endIdx, colEnd);
    // Rounded only at the trip's true start/end (and only when that end actually falls
    // in THIS segment) — square everywhere else, so it reads as one continuous pill
    // across week rows AND across a month-boundary split.
    const roundLeft = startsHere && segStart === startIdx;
    const roundRight = endsHere && segEnd === endIdx;
    const left = (segStart / 7 * 100).toFixed(4);
    const width = ((segEnd - segStart + 1) / 7 * 100).toFixed(4);
    const radius = `${roundLeft ? '5px' : '0'} ${roundRight ? '5px' : '0'} ${roundRight ? '5px' : '0'} ${roundLeft ? '5px' : '0'}`;
    // Inset a couple px so two different trips landing on adjacent days (side by side
    // in the same week) show a visible gap instead of touching edge-to-edge. Safe to
    // do unconditionally — it only affects a trip's own outer edges, never the day
    // boundaries within a single trip's own bar.
    return `<div class="m-mo-travel-bar" style="left:calc(${left}% + 2px);width:calc(${width}% - 4px);border-radius:${radius};background:${ts.d}" title="${escHtml(tv.name || '')}"></div>`;
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

// Long-press-drag across day cells → create a multi-day travel task. Same idiom as
// mInitBlockDrag/mInitWkDrag (480ms long-press arms the drag; a plain tap never gets
// this far so mMonthSelectDay's onclick still fires normally). Delegated on
// #mMonthWeeks so it survives re-renders (weeks are re-rendered often via infinite scroll).
let _mMoDrag = null;
function mInitMonthDrag() {
  const wrap = document.getElementById('mMonthWeeks');
  if (!wrap || wrap._moDragInited) return;
  wrap._moDragInited = true;

  let pressTimer = null;
  let touchStartX = 0, touchStartY = 0;

  wrap.addEventListener('touchstart', e => {
    const dayEl = e.target.closest('.m-mo-day[data-ds]');
    if (!dayEl) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    pressTimer = setTimeout(() => {
      pressTimer = null;
      const startDs = dayEl.dataset.ds;
      _mMoDrag = {startDs, endDs: startDs};
      dayEl.classList.add('drag-selected');
      const scroller = document.getElementById('mMonthScroll');
      if (scroller) scroller.style.overflowY = 'hidden';
      document.addEventListener('touchmove', _mMoDragMove, {passive: false});
    }, 480);
  }, {passive: true});

  wrap.addEventListener('touchmove', e => {
    if (!pressTimer) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 8 || Math.abs(e.touches[0].clientY - touchStartY) > 8) {
      clearTimeout(pressTimer); pressTimer = null;
    }
  }, {passive: true});

  wrap.addEventListener('touchend', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; return; }
    if (!_mMoDrag) return;
    document.removeEventListener('touchmove', _mMoDragMove);
    const {startDs, endDs} = _mMoDrag;
    _mMoDrag = null;
    document.querySelectorAll('#mMonthWeeks .m-mo-day.drag-selected').forEach(el => el.classList.remove('drag-selected'));
    const scroller = document.getElementById('mMonthScroll');
    if (scroller) scroller.style.overflowY = '';
    // A long-press with no movement (startDs===endDs) is just a long-press, not a drag —
    // the plain tap's own onclick (mMonthSelectDay) already handled day selection.
    if (startDs && endDs && startDs !== endDs) {
      const start = startDs <= endDs ? startDs : endDs;
      const end = startDs <= endDs ? endDs : startDs;
      mOpenFullAdd();
      mSelectCat('fulladd', 'Travel');
      document.getElementById('mFullAddDue').value = start;
      const endEl = document.getElementById('mFullAddEnd');
      if (endEl) endEl.value = end;
    }
  }, {passive: true});
}

function _mMoDragMove(e) {
  if (!_mMoDrag) return;
  e.preventDefault();
  const t = e.touches[0];
  // elementFromPoint naturally skips .m-mo-day-empty placeholders (pointer-events:none),
  // so a drag crossing a month-boundary split row just no-ops over those cells.
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const dayEl = el && el.closest('.m-mo-day[data-ds]');
  if (!dayEl) return;
  const ds = dayEl.dataset.ds;
  if (ds === _mMoDrag.endDs) return;
  _mMoDrag.endDs = ds;
  const lo = _mMoDrag.startDs <= ds ? _mMoDrag.startDs : ds;
  const hi = _mMoDrag.startDs <= ds ? ds : _mMoDrag.startDs;
  document.querySelectorAll('#mMonthWeeks .m-mo-day[data-ds]').forEach(d => {
    d.classList.toggle('drag-selected', d.dataset.ds >= lo && d.dataset.ds <= hi);
  });
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
  const yearEl = document.getElementById('mMonthYearBtn');
  if (!scroller || !titleEl) return;
  const rect = scroller.getBoundingClientRect();
  const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 4);
  const row = el && el.closest('.m-mo-week');
  if (!row) return;
  const d = new Date(row.dataset.mon + 'T12:00:00');
  _mMonthDisplayedMo = d.getMonth();
  _mMonthDisplayedYr = d.getFullYear();
  titleEl.innerHTML = `${d.toLocaleDateString('en-US', {month: 'long'})}<span class="m-mo-title-caret">▾</span>`;
  if (yearEl) yearEl.innerHTML = `${d.getFullYear()}<span class="m-mo-title-caret">▾</span>`;
}

// Default view is the START of the current month (day 1's row), not today's own row —
// today can be mid-month, which read as "starting halfway through" the month.
function _mMoScrollToMonthStart(attempt) {
  attempt = attempt || 0;
  const scroller = document.getElementById('mMonthScroll');
  const now = new Date();
  const firstDs = d2s(new Date(now.getFullYear(), now.getMonth(), 1));
  const targetEl = scroller && scroller.querySelector(`.m-mo-day[data-ds="${firstDs}"]`);
  if (!targetEl) { if (attempt < 25) setTimeout(() => _mMoScrollToMonthStart(attempt + 1), 40); return; }
  const row = targetEl.closest('.m-mo-week');
  if (row) {
    // Compute the offset directly and apply it to the scroller's own scrollTop —
    // scrollIntoView() can walk up and scroll ANY scrollable ancestor it finds along
    // the way (e.g. the document itself), which can visually shift the sticky header
    // relative to content. Setting scrollTop directly only ever touches this element.
    scroller.scrollTop += row.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }
  _mUpdateMonthTitle();
}

function mMonthSelectDay(ds) {
  _mMonthSelectedDs = ds;
  // Toggle the selected class directly — no re-render, so scroll position is preserved
  document.querySelectorAll('#mMonthWeeks .m-mo-day.selected').forEach(el => el.classList.remove('selected'));
  const el = document.querySelector(`#mMonthWeeks .m-mo-day[data-ds="${ds}"]`);
  if (el) el.classList.add('selected');
  _mRenderMonthDetail(ds);
  // Detail panel's height varies with its task count (up to its own max-height cap) —
  // resync so #mMonthScroll's explicit height still exactly fills the remaining space.
  requestAnimationFrame(_mSyncMonthScrollHeight);
}

// Rows reuse mTaskRow verbatim (same band+circle-checkbox markup, same data-rid/data-rtype
// attributes) so the shared tap-menu/edit system (_mShowTaskMenu/_mRowEdit, wired up here via
// mInitMonthDblTap) works unmodified — exact same list convention as Today/Week.
// Fills column 1 first, only spilling into column 2 once there's enough to split evenly —
// 1-2 tasks always render as one short column instead of an artificially-padded two-column
// block, so a light day stays short instead of showing a bunch of blank room.
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
    const half = tasks.length > 2 ? Math.ceil(tasks.length / 2) : tasks.length;
    const col1 = tasks.slice(0, half), col2 = tasks.slice(half);
    html += col2.length
      ? `<div class="m-mo-detail-cols"><div class="m-mo-detail-col">${col1.map(mTaskRow).join('')}</div><div class="m-mo-detail-col">${col2.map(mTaskRow).join('')}</div></div>`
      : col1.map(mTaskRow).join('');
  }
  detail.innerHTML = html;
}

// Single tap -> task menu, double tap -> edit — same idiom as mInitTodayDblTap/
// mInitWeekDblTap, scoped to #mMonthDetail. Delegated on the container (not per-row) since
// _mRenderMonthDetail fully replaces its innerHTML on every day selection.
let _moTapTimer = null;
function mInitMonthDblTap() {
  const detail = document.getElementById('mMonthDetail');
  if (!detail || detail._dblTapInited) return;
  detail._dblTapInited = true;
  let tapStartX = 0, tapStartY = 0;
  detail.addEventListener('touchstart', e => {
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }, {passive: true});
  detail.addEventListener('touchend', e => {
    const outer = e.target.closest('.m-row-outer[data-rid]');
    if (!outer) return;
    if (e.target.closest('.m-chk-wrap')) return; // checkbox owns its own tap
    if (e.target.closest('.m-mv-today')) return; // "→ Today" button owns its own tap
    const ct = e.changedTouches[0];
    if (Math.abs(ct.clientX - tapStartX) > 10 || Math.abs(ct.clientY - tapStartY) > 10) return;
    const id = outer.dataset.rid;
    if (_isDblTap(id)) {
      if (_moTapTimer) { clearTimeout(_moTapTimer); _moTapTimer = null; }
      _mRowEdit(outer);
      return;
    }
    clearTimeout(_moTapTimer);
    _moTapTimer = setTimeout(() => { _moTapTimer = null; _mShowTaskMenu(outer); }, 350);
  }, {passive: true});
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
// Wraps the shared toggleDark() (features.js) — that function toggles body.dark/html.init-dark,
// persists cfg.dark, and re-renders, but its background handling (applyTheme()) is built for
// desktop's decorative theme gradients, not mobile's flat --bg tokens: applyTheme() always
// re-sets the --bg custom property (and, when switching to light, body's own inline
// background) to a THEMES[...] value, clobbering whatever mobile.css intended. This wrapper
// is the final word on mobile's background after toggleDark() runs — it force-sets the
// correct flat --bg for the new state regardless of what applyTheme() just did.
//
// This also fixes a real bug (reported 2026-08-26): switching dark→light left the sticky
// #mHeader showing its old dark background until a manual refresh. #mHeader's background is
// `var(--bg)`, and applyTheme() DOES reset that variable correctly and synchronously — but a
// sticky-positioned element on iOS Safari can keep its previously-composited background
// on-screen when only a CSS custom property changes, with no accompanying layout/paint
// trigger. Forcing a reflow (the same `void el.offsetHeight` trick already used elsewhere in
// this codebase for an analogous dark-mode flash bug) makes it repaint immediately.
function mToggleDark() {
  toggleDark();
  const isDark = document.body.classList.contains('dark');
  document.documentElement.style.setProperty('--bg', isDark ? '#16141f' : '#ffffff');
  document.body.style.background = '';
  const hdr = document.getElementById('mHeader');
  if (hdr) void hdr.offsetHeight;
  const nav = document.getElementById('mNav');
  if (nav) void nav.offsetHeight;
  void document.body.offsetHeight;
}

async function mInit() {
  // Visible build stamp (login screen + More tab) so a "did my change actually load"
  // question can be answered by looking at the screen instead of guessing — reads
  // window._BUILD (set inline in mobile.html's <head>) so it always reflects whatever
  // actually loaded, never needs manual updating.
  document.querySelectorAll('.m-build-stamp').forEach(el => { el.textContent = 'Build ' + (window._BUILD || '?'); });
  load();
  // Apply dark mode immediately after load() restores cfg.dark — mirrors desktop's init()
  // (features.js). Must also clear the inline --bg custom property that features.js's
  // initTheme()/applyTheme() (script-top-level, runs before this) unconditionally sets on
  // <html> regardless of cfg.dark — an inline style always outranks mobile.css's
  // `:root`/`html.init-dark{--bg:...}` rules, so without removing it the page keeps
  // whatever decorative desktop gradient theme (default 'peach', a warm/orange gradient)
  // is in localStorage._dashTheme no matter what mobile.css says. This must run for BOTH
  // states, not just dark — a light-mode-only gap here previously left the peach gradient
  // showing through even after mobile.css's own light --bg was changed.
  if (cfg.dark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('init-dark');
    document.documentElement.style.setProperty('--bg', '#16141f');
  } else {
    document.documentElement.style.setProperty('--bg', '#ffffff');
  }
  document.body.style.background = '';
  _fetchHolidays();
  // Clear stale local overrides on mobile — always trust Supabase as source of truth
  if (typeof localOverrides !== 'undefined') { for (const k in localOverrides) delete localOverrides[k]; }
  _mSetDate();
  // Restore the last-used tab NOW, synchronously off load()'s cached data — not after
  // checkAuth()/syncAll() resolve, further down. #mTodayPage has no inline display:none
  // in mobile.html (it's the default-visible page), so leaving this until after the two
  // awaits below let it paint on screen for however long that network round-trip took,
  // every single refresh, before snapping to the real last tab. Same fix already applied
  // to the login screen (see "Boot loading" below hideLoginOverlay/showLoginOverlay) —
  // never let the wrong screen paint while waiting on the network; restore synchronously
  // from what's already on disk instead.
  mShowTab(['today','tb','week','month','shop','extras','recipes'].includes(localStorage._mLastTab) ? localStorage._mLastTab : 'today');
  mInitPickers();
  mInitTodayDblTap();
  mInitTodayDrag();
  mInitShopDblTap();
  mInitPTR();
  mInitTBSwipe();
  mInitBlockDrag();
  mInitWeekScroll();
  mInitWkDrag();
  mInitWeekDblTap();
  mInitMonthDrag();
  mInitMonthDblTap();
  const authed = await checkAuth();
  if (!authed) return;
  hideLoginOverlay();
  // #mApp is display:none until hideLoginOverlay() just above adds .ready — the early
  // mShowTab() call further up (restoring the last tab) ran while it was still hidden, so
  // its own _mNavMoveHighlight(true) measured zero-size rects (a hidden ancestor collapses
  // getBoundingClientRect() to nothing) and landed the sliding pill near Today's slot no
  // matter which tab was actually restored — while the CONTENT and the active button's own
  // color were both already correct (those don't depend on layout). Netted out as "Today
  // looks selected via the pill, Week looks selected via its own color" at once. Snap
  // (not animate) the pill to the real position now that #mApp is actually measurable.
  _mNavMoveHighlight(false);
  await syncAll(); // renderAll() inside this re-renders whichever tab mShowTab already picked, above
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
