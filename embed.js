/*
 * leikskolagjald-reiknivel — innfellingarskrifta (embed loader).
 *
 * Notkun á hvaða vefsíðu sem er:
 *
 *   <script src="https://reykjanesbaer.github.io/leikskolagjald-reiknivel/embed.js"
 *           data-theme="auto"
 *           data-maxchildren="5"
 *           data-align="left"
 *           data-width="100%"
 *           data-max-width="672px"></script>
 *
 * Skriftan býr til iframe á staðnum þar sem hún stendur og stillir hæð
 * hans sjálfkrafa eftir innihaldi (reiknivélin lætur vita með postMessage
 * í hvert sinn sem stærðin breytist). Allar data-* færibreytur eru sendar
 * áfram á reiknivélina (data-theme -> ?theme=...), nema þessar þrjár sem
 * stýra aðeins iframe-inum sjálfum:
 *
 *   data-width      1–100% eða 200–2000px, sjálfgefið 100%
 *   data-max-width  1–100%, 200–2000px eða none, sjálfgefið 672px
 *   data-align      left, center, right, sjálfgefið left
 *
 * Tala án einingar er px og ógild gildi falla á sjálfgefið. max-width er
 * alltaf klemmt við 100% svo reiknivélin flæði aldrei út fyrir á síma.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  /* Slóð á möppuna sem embed.js er í — reiknivélin er á sama stað */
  var base = script.src.replace(/[^/]*$/, '');
  var frameId = 'lg-' + Math.random().toString(36).slice(2, 10);

  /* Öll data-* gildi verða að URL-færibreytum */
  var params = new URLSearchParams();
  for (var i = 0; i < script.attributes.length; i++) {
    var attr = script.attributes[i];
    if (attr.name.indexOf('data-') !== 0) continue;
    var key = attr.name.slice(5);
    /* Þessar stýra umgjörðinni, ekki reiknivélinni — ekki sendar áfram */
    if (key === 'width' || key === 'max-width' || key === 'align' || key === 'title') continue;
    params.set(key, attr.value);
  }
  params.set('frameId', frameId);

  /*
   * Breidd og byrjunarhæð eru staðfestar með sömu föllum og kóðasmiðurinn
   * notar (parseSize, sizeCss og hydur í reiknivel/config.js). Skráin er
   * sótt einu sinni, sama hve margar reiknivélar eru á síðunni.
   */
  withConfig(base, function (cfg) {
    var opts = cfg.parse(attrOpts(script, cfg));
    var iframe = document.createElement('iframe');
    iframe.src = base + '?' + params.toString();
    iframe.title = script.getAttribute('data-title') || 'Leikskólagjald reiknivél';
    iframe.loading = 'lazy';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.style.cssText = 'display:block;border:0;' +
      cfg.sizeCss(script.getAttribute('data-width'), script.getAttribute('data-max-width')) + ';' +
      'height:' + cfg.hydur(opts, opts.dchildren) + 'px;' +
      cfg.margins(script.getAttribute('data-align')) +
      'color-scheme:normal;overflow:hidden';

    script.parentNode.insertBefore(iframe, script);

    /*
     * Hæðin leiðrétt þegar reiknivélin lætur vita. Uppruni og sendandi eru
     * athugaðir áður en skilaboðin eru tekin gild, og id-ið greinir á milli
     * ef fleiri en ein reiknivél er á síðunni.
     */
    window.addEventListener('message', function (event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== originOf(base)) return;
      var data = event.data;
      if (!data || data.type !== 'leikskolagjald:height') return;
      if (data.id && data.id !== frameId) return;
      var h = parseInt(data.height, 10);
      if (isFinite(h) && h > 0 && h < 4000) iframe.style.height = h + 'px';
    });
  });

  /* Stillingar af data-* eigindum, á forminu sem cfg.parse tekur við */
  function attrOpts(el, cfg) {
    var o = {};
    cfg.KEYS.forEach(function (k) {
      var v = el.getAttribute('data-' + k);
      if (v !== null) o[k] = v;
    });
    return o;
  }

  function originOf(url) {
    try { return new URL(url, location.href).origin; } catch (e) { return location.origin; }
  }

  function withConfig(base, done) {
    if (window.LeikskolagjaldConfig) { done(window.LeikskolagjaldConfig); return; }
    var waiting = window.__leikskolagjaldConfigWaiting;
    if (waiting) { waiting.push(done); return; }
    waiting = window.__leikskolagjaldConfigWaiting = [done];
    var s = document.createElement('script');
    s.src = base + 'reiknivel/config.js';
    s.onload = function () {
      window.__leikskolagjaldConfigWaiting = null;
      waiting.forEach(function (fn) { fn(window.LeikskolagjaldConfig); });
    };
    (document.head || document.documentElement).appendChild(s);
  }
})();
