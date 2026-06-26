/* touch-layer.js — iPad / touch enhancements for the desktop dashboard.
 *
 * SAFETY MODEL (read before editing):
 *   - This file is loaded ONLY when index.html sees `?ipadtest=1` in the URL (opt-in).
 *     Your normal laptop and iPad URLs never load it, so they are 100% unaffected.
 *   - Everything here is wrapped in try/catch so a failure can never break the page.
 *   - On a mouse/trackpad device (pointer: fine) it adds NO behavior — only a marker.
 *
 * PHASE 0 (current): detection + a visible confirmation badge only.
 *   No real touch behavior yet. This exists purely so you can verify, on a real iPad,
 *   that device detection works and that your laptop stays untouched.
 */
(function () {
  'use strict';
  try {
    var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var label = coarse ? 'coarse (touch)' : 'fine (mouse/trackpad)';

    // Tag the document so future, gated CSS/JS can target touch devices only.
    if (coarse) document.documentElement.classList.add('touch');

    // Visible confirmation badge — proves the layer loaded and shows what it detected.
    // Removed automatically in later phases; for now it's your test signal.
    var badge = document.createElement('div');
    badge.id = '_touchLayerBadge';
    badge.textContent = 'iPad layer ON · pointer: ' + label;
    badge.style.cssText =
      'position:fixed;bottom:8px;left:8px;z-index:2147483647;' +
      'background:rgba(20,20,30,.85);color:#fff;' +
      'font:11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;' +
      'padding:5px 9px;border-radius:7px;pointer-events:none;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.3)';

    function mount() {
      (document.body || document.documentElement).appendChild(badge);
    }
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);

    console.log('[touch-layer] active — pointer:', label);
  } catch (e) {
    // Never let the touch layer break the dashboard.
    console.warn('[touch-layer] init failed (page unaffected):', e);
  }
})();
