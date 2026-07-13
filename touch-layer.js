/* touch-layer.js — iPad / touch enhancements for the desktop dashboard.
 *
 * SAFETY MODEL (read before editing):
 *   - Loaded ONLY when index.html sees `?ipadtest=1` in the URL (opt-in).
 *     Your normal laptop and iPad/iPhone URLs never load it, so they are 100% unaffected.
 *   - Everything is wrapped in try/catch so a failure can never break the page.
 *   - It only ACTS on a coarse-pointer (touch) device. On a mouse/trackpad it does nothing.
 *   - It never modifies desktop code paths. It REUSES them: touch gestures are translated
 *     into the SAME synthetic drag events (dragstart/dragover/dragleave/drop/dragend) the
 *     mouse produces, so every existing handler — dStart, dropOnTB, dropOnTodayList, weekly
 *     cal cells, kanban, unassigned — runs unchanged and Supabase sync is identical.
 *
 * PHASE 2 (current) — full overview interactivity:
 *   - Long-press any draggable row/chip → pick up, drag to ANY desktop drop zone
 *     (time grid, today list, weekly cal days, WR cell, kanban, unassigned). Drop-zone
 *     highlight comes from the desktop's own dragover/dragleave handlers.
 *   - Long-press + release WITHOUT moving → the row's context menu (same as right-click).
 *   - Double-tap → same as double-click (edit modal / quick-add on empty list space).
 *   - Auto-scroll when dragging near the top/bottom edge of the screen or a scrollable list.
 *   - Bigger touch targets for checkboxes and X buttons; iOS text-selection callout
 *     suppressed on task rows so long-press feels native.
 */
(function () {
  'use strict';
  try {
    var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (coarse) document.documentElement.classList.add('touch');

    // Small confirmation badge so you can verify on a real iPad that the layer loaded.
    try {
      var badge = document.createElement('div');
      badge.id = '_touchLayerBadge';
      badge.textContent = 'iPad layer · P2 full · ' + (coarse ? 'touch' : 'mouse');
      badge.style.cssText =
        'position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(20,20,30,.85);' +
        'color:#fff;font:11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:5px 9px;' +
        'border-radius:7px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3)';
      var mount = function () { (document.body || document.documentElement).appendChild(badge); };
      if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
    } catch (e) {}

    // On a mouse device we add no behavior — the desktop DnD already works.
    if (!coarse) { console.log('[touch-layer] mouse device — no touch behavior added'); return; }

    // ── Touch-only CSS: bigger targets, no iOS callout/selection on rows ──
    try {
      var css = document.createElement('style');
      css.textContent =
        'html.touch .ti,html.touch [draggable="true"]{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}' +
        'html.touch{-webkit-tap-highlight-color:transparent}' +
        'html.touch body{touch-action:manipulation}' + /* kills 300ms double-tap-zoom delay */
        /* Invisible padded hit area around small controls — no visual/layout change */
        'html.touch .chk-wrap,html.touch .delbtn,html.touch .wr-ov-move{position:relative}' +
        'html.touch .chk-wrap::after,html.touch .delbtn::after,html.touch .wr-ov-move::after{content:"";position:absolute;inset:-9px}';
      (document.head || document.documentElement).appendChild(css);
    } catch (e) {}

    // ── Config ──
    var LONGPRESS_MS = 320;   // hold this long on a task to pick it up
    var CANCEL_MOVE = 12;     // px of movement before pickup = it's a scroll, not a drag
    var DBLTAP_MS = 350;      // two taps within this window = double-click
    var DBLTAP_DIST = 30;     // ...and within this many px of each other
    var EDGE = 80;            // px from screen top/bottom that triggers auto-scroll

    // ── State ──
    var pressTimer = null, dragging = false, srcEl = null, ghost = null;
    var startX = 0, startY = 0, curX = 0, curY = 0;
    var movedFar = false;      // finger travelled since pickup → real drag, not a press-menu
    var ctxFired = false;      // long-press context menu fired on a non-draggable target
    var lastOver = null;       // element currently receiving dragover
    var scrollTimer = null;
    var lastTapT = 0, lastTapX = 0, lastTapY = 0, lastTapEl = null;

    // Synthetic drag event the desktop handlers can't tell apart from a mouse one.
    // All overview handlers read the global `dragId`, but we attach a dataTransfer
    // stub anyway so any handler that touches it doesn't throw.
    function dndEvent(type, x, y) {
      var ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y });
      try {
        Object.defineProperty(ev, 'dataTransfer', { value: {
          setData: function () {}, getData: function () { return ''; },
          setDragImage: function () {}, effectAllowed: 'move', dropEffect: 'move', types: [], files: []
        } });
      } catch (e) {}
      return ev;
    }

    function draggableFrom(el) {
      return el && el.closest ? el.closest('[draggable="true"]') : null;
    }
    // Don't start a drag from an interactive control (checkbox, delete button, etc.)
    function isInteractive(el) {
      return !!(el.closest && el.closest('input,button,a,select,textarea,.chk-wrap,.delbtn,.wr-ov-move'));
    }

    function makeGhost(el, x, y) {
      try {
        var r = el.getBoundingClientRect();
        var g = el.cloneNode(true);
        g.id = '_touchDragGhost';
        g.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;' +
          'width:' + r.width + 'px;opacity:.9;transform:translate(' + (x - r.width / 2) + 'px,' + (y - 18) + 'px) rotate(1.5deg);' +
          'box-shadow:0 8px 24px rgba(0,0,0,.28);border-radius:10px;background:var(--card,#fff);' +
          'transition:none;overflow:hidden';
        document.body.appendChild(g);
        return g;
      } catch (e) { return null; }
    }
    function moveGhost(x, y) {
      if (!ghost) return;
      var w = ghost.offsetWidth || 200;
      ghost.style.transform = 'translate(' + (x - w / 2) + 'px,' + (y - 18) + 'px) rotate(1.5deg)';
    }

    // Element under the finger, ignoring the ghost.
    function hoverTarget(x, y) {
      if (ghost) ghost.style.display = 'none';
      var el = document.elementFromPoint(x, y);
      if (ghost) ghost.style.display = '';
      return el;
    }

    // Feed the desktop's own dragover/dragleave so its drop-zone highlights just work.
    function updateHover(x, y) {
      var el = hoverTarget(x, y);
      if (el !== lastOver) {
        if (lastOver) { try { lastOver.dispatchEvent(dndEvent('dragleave', x, y)); } catch (e) {} }
        lastOver = el;
      }
      if (el) { try { el.dispatchEvent(dndEvent('dragover', x, y)); } catch (e) {} }
    }

    // Auto-scroll while the finger sits near a screen edge (runs on a timer because
    // touchmove stops firing when the finger holds still).
    function scrollable(el) {
      while (el && el !== document.body) {
        var s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4) return el;
        el = el.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    }
    function edgeScroll() {
      if (!dragging) return;
      var dy = curY < EDGE ? -14 : (curY > innerHeight - EDGE ? 14 : 0);
      if (!dy) return;
      try { scrollable(hoverTarget(curX, curY)).scrollTop += dy; } catch (e) {}
      updateHover(curX, curY);
    }

    function beginDrag(x, y) {
      dragging = true; movedFar = false;
      // Runs the element's own dragstart handler (inline dStart(...) or a listener) —
      // that sets the global dragId exactly like a mouse drag.
      try { srcEl.dispatchEvent(dndEvent('dragstart', x, y)); } catch (e) {}
      ghost = makeGhost(srcEl, x, y);
      try { srcEl.style.opacity = '.35'; } catch (e) {}
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
      clearInterval(scrollTimer); scrollTimer = setInterval(edgeScroll, 60);
    }

    function endDrag(x, y, cancelled) {
      var el = srcEl;
      clearInterval(scrollTimer); scrollTimer = null;
      if (dragging && !cancelled) {
        try {
          if (!movedFar) {
            // Long-press + release in place = context menu (same as right-click).
            el.dispatchEvent(dndEvent('contextmenu', x, y));
          } else {
            var under = hoverTarget(x, y);
            // Fire the SAME drop a mouse would — bubbles up to whichever desktop drop
            // handler owns this spot (tbGrid, today list, weekly cal, kanban, ...).
            if (under) under.dispatchEvent(dndEvent('drop', x, y));
          }
        } catch (e) {}
      }
      // Cleanup — dragend runs the element's own ondragend/dEnd; a final dragleave
      // clears any highlight left on a zone we hovered but didn't drop on.
      try { if (lastOver) lastOver.dispatchEvent(dndEvent('dragleave', x, y)); } catch (e) {}
      try { if (el) el.dispatchEvent(dndEvent('dragend', x, y)); } catch (e) {}
      try { if (typeof window.dEnd === 'function' && el) window.dEnd({ currentTarget: el }); } catch (e) {}
      try { if (el) el.style.opacity = ''; } catch (e) {}
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null; lastOver = null;
      dragging = false; movedFar = false; srcEl = null;
    }

    // ── Touch handlers ──
    document.addEventListener('touchstart', function (e) {
      if (dragging || e.touches.length !== 1) return;
      var t = e.touches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      if (!el) return;
      startX = curX = t.clientX; startY = curY = t.clientY;
      ctxFired = false;
      clearTimeout(pressTimer);
      if (isInteractive(el)) return; // plain taps on controls behave natively
      var row = draggableFrom(el);
      if (row) {
        srcEl = row;
        pressTimer = setTimeout(function () { if (srcEl) beginDrag(startX, startY); }, LONGPRESS_MS);
      } else {
        // Non-draggable target (e.g. overdue WR rows): long-press = its context menu.
        var tgt = el;
        pressTimer = setTimeout(function () {
          ctxFired = true;
          if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e2) {} }
          try { tgt.dispatchEvent(dndEvent('contextmenu', startX, startY)); } catch (e2) {}
        }, LONGPRESS_MS);
      }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      curX = t.clientX; curY = t.clientY;
      if (!dragging) {
        // Moved before the long-press fired → user is scrolling, not dragging. Abort.
        if (Math.abs(curX - startX) > CANCEL_MOVE || Math.abs(curY - startY) > CANCEL_MOVE) {
          clearTimeout(pressTimer); srcEl = null;
        }
        return;
      }
      if (Math.abs(curX - startX) > CANCEL_MOVE || Math.abs(curY - startY) > CANCEL_MOVE) movedFar = true;
      e.preventDefault();               // we own the gesture now — stop the page scrolling
      moveGhost(curX, curY);
      updateHover(curX, curY);
    }, { passive: false });

    document.addEventListener('touchend', function (e) {
      clearTimeout(pressTimer);
      var pt = (e.changedTouches && e.changedTouches[0]) || { clientX: startX, clientY: startY };
      if (dragging) {
        // Suppress the browser's follow-up click so it can't instantly close the
        // context menu we just opened or re-select the row after a drop.
        if (e.cancelable) e.preventDefault();
        endDrag(pt.clientX, pt.clientY, false);
        lastTapT = 0;
        return;
      }
      if (ctxFired) { if (e.cancelable) e.preventDefault(); ctxFired = false; lastTapT = 0; srcEl = null; return; }
      srcEl = null;
      // ── Double-tap = double-click (edit modal, quick-add on empty list space) ──
      var el = document.elementFromPoint(pt.clientX, pt.clientY);
      if (el && !isInteractive(el)) {
        var now = e.timeStamp || 0;
        var sameSpot = Math.abs(pt.clientX - lastTapX) < DBLTAP_DIST && Math.abs(pt.clientY - lastTapY) < DBLTAP_DIST;
        var row = (el.closest && el.closest('.ti')) || el;
        if (now - lastTapT < DBLTAP_MS && sameSpot && row === lastTapEl) {
          lastTapT = 0; lastTapEl = null;
          try { row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window, clientX: pt.clientX, clientY: pt.clientY })); } catch (e2) {}
        } else {
          lastTapT = now; lastTapX = pt.clientX; lastTapY = pt.clientY; lastTapEl = row;
        }
      } else { lastTapT = 0; lastTapEl = null; }
    }, { passive: false });

    document.addEventListener('touchcancel', function () {
      clearTimeout(pressTimer); ctxFired = false;
      if (dragging) endDrag(curX, curY, true); else srcEl = null;
    }, { passive: true });

    console.log('[touch-layer] Phase 2 active — long-press to drag or open menu, double-tap to edit');
  } catch (e) {
    console.warn('[touch-layer] init failed (page unaffected):', e);
  }
})();
