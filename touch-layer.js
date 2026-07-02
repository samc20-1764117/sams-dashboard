/* touch-layer.js — iPad / touch enhancements for the desktop dashboard.
 *
 * SAFETY MODEL (read before editing):
 *   - Loaded ONLY when index.html sees `?ipadtest=1` in the URL (opt-in).
 *     Your normal laptop and iPad/iPhone URLs never load it, so they are 100% unaffected.
 *   - Everything is wrapped in try/catch so a failure can never break the page.
 *   - It only ACTS on a coarse-pointer (touch) device. On a mouse/trackpad it does nothing.
 *   - It never modifies desktop code paths. It REUSES them: touch gestures are translated
 *     into the same dragId + dropOnTB flow the mouse uses, so Supabase sync is identical
 *     and automatic. There is no separate data path to keep in sync.
 *
 * PHASE 1 (current): touch drag-and-drop for the OVERVIEW page.
 *   Long-press a task row to pick it up, drag it over the day's time-block grid, release
 *   to schedule it. Reuses dStart() / dropOnTB() verbatim.
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
      badge.textContent = 'iPad layer · P1 drag · ' + (coarse ? 'touch' : 'mouse');
      badge.style.cssText =
        'position:fixed;bottom:8px;left:8px;z-index:2147483647;background:rgba(20,20,30,.85);' +
        'color:#fff;font:11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:5px 9px;' +
        'border-radius:7px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3)';
      var mount = function () { (document.body || document.documentElement).appendChild(badge); };
      if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
    } catch (e) {}

    // On a mouse device we add no behavior — the desktop DnD already works.
    if (!coarse) { console.log('[touch-layer] mouse device — no touch behavior added'); return; }

    // ── Config ──
    var LONGPRESS_MS = 320;   // hold this long on a task to pick it up
    var CANCEL_MOVE = 12;     // px of movement before pickup = it's a scroll, not a drag

    // ── State ──
    var pressTimer = null, dragging = false, srcEl = null, ghost = null;
    var startX = 0, startY = 0, lastHover = null;

    // Find the nearest draggable task row (the mouse code marks these draggable + wires dStart).
    function draggableFrom(el) {
      while (el && el !== document.body) {
        if (el.getAttribute && el.getAttribute('draggable') === 'true' &&
            /ondragstart/.test(el.outerHTML.slice(0, 200)) === false) { /* fallthrough */ }
        if (el.getAttribute && el.getAttribute('draggable') === 'true' && el.getAttribute('ondragstart')) return el;
        el = el.parentNode;
      }
      return null;
    }
    // Pull the exact dragId argument the desktop would use: ondragstart="dStart(event,'<ID>')"
    function dragIdOf(el) {
      var m = /dStart\(event,\s*'([^']*)'/.exec(el.getAttribute('ondragstart') || '');
      return m ? m[1] : null;
    }
    // Don't start a drag from an interactive control (checkbox, delete button, date label, etc.)
    function isInteractive(el) {
      return !!(el.closest && el.closest('input,button,a,select,textarea,label,.chk-wrap,.date-clr,.delbtn'));
    }
    // A minimal event stub so we can reuse dStart/dEnd without a real DragEvent.
    function stub(el, x, y) {
      return { currentTarget: el, target: el, clientX: x, clientY: y,
               preventDefault: function () {}, stopPropagation: function () {},
               dataTransfer: { setData: function () {}, getData: function () { return ''; }, effectAllowed: '', setDragImage: function () {} } };
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
    function highlight(el) {
      var zone = el && el.closest ? el.closest('#tbGrid [data-tbhour], #tbGrid .tb-hour, #tbGrid > *') : null;
      if (zone === lastHover) return;
      if (lastHover) lastHover.style.outline = '';
      lastHover = zone;
      if (zone) zone.style.outline = '2px solid var(--accent,#8b5cf6)';
    }
    function clearHighlight() { if (lastHover) { lastHover.style.outline = ''; lastHover = null; } }

    function beginDrag(x, y) {
      dragging = true;
      var id = dragIdOf(srcEl);
      try { if (id != null && typeof window.dStart === 'function') window.dStart(stub(srcEl, x, y), id); } catch (e) {}
      ghost = makeGhost(srcEl, x, y);
      try { srcEl.style.opacity = '.35'; } catch (e) {}
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    }

    function endDrag(x, y, cancelled) {
      var el = srcEl;
      if (dragging && !cancelled) {
        try {
          var under = hoverTarget(x, y);
          if (under && under.closest && under.closest('#tbGrid')) {
            // Fire the SAME drop the mouse would — bubbles to dropOnTB's listener, which reads
            // the global dragId + clientY and saves to Supabase. Desktop path unchanged.
            under.dispatchEvent(new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
          }
        } catch (e) {}
      }
      // Cleanup — mirror dEnd() so the drop-zone affordances turn off.
      try { if (typeof window.dEnd === 'function') window.dEnd(stub(el, x, y)); } catch (e) {}
      try { if (el) el.style.opacity = ''; } catch (e) {}
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null; clearHighlight();
      dragging = false; srcEl = null;
    }

    // ── Touch handlers ──
    document.addEventListener('touchstart', function (e) {
      if (dragging || e.touches.length !== 1) return;
      var t = e.touches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      if (!el || isInteractive(el)) return;
      var row = draggableFrom(el);
      if (!row || dragIdOf(row) == null) return;
      srcEl = row; startX = t.clientX; startY = t.clientY;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () { if (srcEl) beginDrag(startX, startY); }, LONGPRESS_MS);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!srcEl) return;
      var t = e.touches[0];
      if (!dragging) {
        // Moved before the long-press fired → user is scrolling, not dragging. Abort pickup.
        if (Math.abs(t.clientX - startX) > CANCEL_MOVE || Math.abs(t.clientY - startY) > CANCEL_MOVE) {
          clearTimeout(pressTimer); srcEl = null;
        }
        return;
      }
      e.preventDefault();               // we own the gesture now — stop the page scrolling
      moveGhost(t.clientX, t.clientY);
      highlight(hoverTarget(t.clientX, t.clientY));
    }, { passive: false });

    function finish(e) {
      clearTimeout(pressTimer);
      if (!srcEl) return;
      var pt = (e.changedTouches && e.changedTouches[0]) || { clientX: startX, clientY: startY };
      if (dragging) endDrag(pt.clientX, pt.clientY, false);
      else srcEl = null;
    }
    document.addEventListener('touchend', finish, { passive: true });
    document.addEventListener('touchcancel', function (e) { clearTimeout(pressTimer); if (dragging) endDrag(startX, startY, true); else srcEl = null; }, { passive: true });

    console.log('[touch-layer] Phase 1 active — long-press a task to drag it onto the time grid');
  } catch (e) {
    console.warn('[touch-layer] init failed (page unaffected):', e);
  }
})();
