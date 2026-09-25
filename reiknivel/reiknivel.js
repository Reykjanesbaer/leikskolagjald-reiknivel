/*
 * Leikskólagjald — teikning og atburðir.
 *
 * Hleðst á eftir utreikningur.js og config.js. Öll reiknivinna er í
 * utreikningur.js og öll gildisathugun í config.js; hér er aðeins DOM.
 *
 * Gjaldskráin er sótt úr gjaldskra/ (sjá veljaAr í utreikningur.js).
 * Mistakist það birtast skýr skilaboð — ekki auð reiknivél.
 */
(function (global) {
  'use strict';

  var cfg = global.LeikskolagjaldConfig;
  var R = global.LeikskolagjaldReikn;
  var script = document.currentScript;

  /* Gjaldskrárslóðin er miðuð við þessa skrá, ekki við síðuna */
  var GJALDSKRA = new URL('../gjaldskra/', script.src).href;

  function $(id) { return document.getElementById(id); }

  var calc = $('calc');
  var opts = cfg.parse();
  var frameId = new URLSearchParams(global.location.search).get('frameId') || '';
  var darkMq = global.matchMedia('(prefers-color-scheme: dark)');

  /* Staðfest gjaldskrá, eða null þangað til hún hefur hlaðist */
  var gj = null;

  /* Val notandans í reiknivélinni; upphafsstaðan kemur úr stillingunum */
  var state = { born: opts.dchildren, klst: opts.dhours, nidurgreitt: !!opts.dsub };

  function dokkt() {
    return opts.theme === 'dark' || (opts.theme === 'auto' && darkMq.matches);
  }

  /* --------------------------------------------------------------------
   * Útlit: þema, litir, hornarúnnun og hvað er sýnilegt
   * ------------------------------------------------------------------ */
  function stillaUtlit() {
    var root = document.documentElement;
    root.setAttribute('data-theme', opts.theme);

    /*
     * Textaliturinn er reiknaður út frá bakgrunni þemans svo smár texti
     * nái AA í báðum þemum; fletir halda völdum höfuðlit með völdum texta.
     * Með frame=0 er bakgrunnurinn í raun síðan sjálf, og þá er
     * bakgrunnur þemans besta viðmiðið sem til er.
     */
    var bak = cfg.bakgrunnur(opts, dokkt());
    root.style.setProperty('--c-bg', '#' + bak);
    root.style.setProperty('--c-accent', '#' + opts.accent);
    root.style.setProperty('--c-on-accent', '#' + opts.onaccent);
    root.style.setProperty('--c-accent-text', '#' + cfg.laesilegur(opts.accent, bak));
    root.style.setProperty('--c-radius', opts.radius + 'px');

    calc.classList.toggle('bare', !opts.frame);
    $('head').hidden = !opts.title;
    $('noteBox').hidden = !opts.note;
    $('foodBox').hidden = !opts.food || !gj;
  }

  /* --------------------------------------------------------------------
   * Valmyndir
   * ------------------------------------------------------------------ */
  function fyllaValmyndir() {
    var cs = $('numChildren'), hs = $('hoursSel');
    cs.textContent = '';
    hs.textContent = '';
    for (var n = 1; n <= opts.maxchildren; n++) {
      cs.appendChild(valkostur(n, n + (n === 1 ? ' barn' : ' börn')));
    }
    gj.klukkustundir.forEach(function (h) {
      hs.appendChild(valkostur(h, String(h).replace('.', ',') + ' klst.'));
    });

    state.born = Math.min(Math.max(1, state.born), opts.maxchildren);
    if (gj.klukkustundir.indexOf(state.klst) === -1) state.klst = gj.klukkustundir[0];
    cs.value = String(state.born);
    hs.value = String(state.klst);
    $('subsidized').checked = state.nidurgreitt;
  }

  function valkostur(value, text) {
    var o = document.createElement('option');
    o.value = String(value);
    o.textContent = text;
    return o;
  }

  /* --------------------------------------------------------------------
   * Niðurstöður
   * ------------------------------------------------------------------ */
  function lina(box, heiti, verd, cls) {
    var p = document.createElement('div');
    p.className = 'row' + (cls ? ' ' + cls : '');
    var s = document.createElement('span');
    s.textContent = heiti;
    var b = document.createElement('b');
    b.textContent = verd;
    p.append(s, b);
    box.appendChild(p);
  }

  function teiknaNidurstodur() {
    var r = R.reikna(gj, state.born, state.klst, state.nidurgreitt);
    var box = $('children');
    box.textContent = '';
    r.born.forEach(function (barn) {
      var d = document.createElement('div');
      d.className = 'child';
      var h = document.createElement('h3');
      h.textContent = 'Barn ' + barn.nr;
      d.appendChild(h);
      lina(d, 'Dvalargjald:', R.kr(barn.dvalargjald));
      if (barn.afslattur > 0) lina(d, 'Systkinaafsláttur:', '-' + R.kr(barn.afslattur), 'neg');
      lina(d, 'Fæðisgjald:', R.kr(barn.faedisgjald));
      lina(d, 'Samtals:', R.kr(barn.samtals), 'sum');
      box.appendChild(d);
    });
    $('grandTotal').textContent = R.kr(r.samtals);

    var fl = $('foodList');
    fl.textContent = '';
    gj.faedisgjaldSundurlidun.forEach(function (it) {
      var d = document.createElement('div');
      var b = document.createElement('b');
      b.textContent = '– ' + it.heiti + ' ';
      d.append(b, document.createTextNode(R.kr(it.verd) + ' á mánuði'));
      fl.appendChild(d);
    });

    /* Skjálesari fær aðeins heildartöluna, ekki alla sundurliðunina */
    $('live').textContent = 'Samtals á mánuði ' + R.kr(r.samtals);
  }

  function teikna() {
    stillaUtlit();
    if (!gj) return;
    fyllaValmyndir();
    teiknaNidurstodur();
    sendaHaed();
  }

  /* --------------------------------------------------------------------
   * Villuskilaboð
   * ------------------------------------------------------------------ */
  function villa(texti) {
    var v = $('villa');
    v.hidden = !texti;
    v.textContent = texti || '';
    $('calcForm').hidden = !!texti;
    $('results').hidden = !!texti;
    $('foodBox').hidden = !!texti || !opts.food;
    $('noteBox').hidden = !!texti || !opts.note;
    sendaHaed();
  }

  /* --------------------------------------------------------------------
   * Gjaldskrárhleðsla
   * ------------------------------------------------------------------ */
  function saekjaJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (svar) {
      if (!svar.ok) throw new Error(svar.status + ' ' + svar.statusText);
      return svar.json();
    });
  }

  function hladaGjaldskra() {
    return saekjaJson(GJALDSKRA + 'index.json')
      .then(function (index) {
        var ar = R.veljaAr(index, opts.ar);
        if (!ar) throw new Error('engin gjaldskrá er skráð í gjaldskra/index.json');
        return saekjaJson(GJALDSKRA + R.skraFyrirAr(index, ar));
      })
      .then(function (raw) {
        gj = R.normalize(raw);
        villa(null);
        teikna();
      })
      .catch(function (e) {
        villa('Ekki náðist að lesa gjaldskrána (' + e.message + '). ' +
          'Reiknivélin birtist um leið og hún er tiltæk.');
      });
  }

  /* --------------------------------------------------------------------
   * Hæð send á foreldrasíðu
   *
   * Tvenn skilaboð: gamla formið { calcHeight } óbreytt, svo hlustarar sem
   * eru þegar til á vef bæjarins haldi áfram að virka, og nýja formið sem
   * embed.js notar (með id, svo margar reiknivélar á sömu síðu ruglist
   * ekki). Send við hverja stærðarbreytingu (ResizeObserver), ekki með
   * setTimeout eins og áður.
   * ------------------------------------------------------------------ */
  var sidastaHaed = 0;

  function sendaHaed() {
    if (global.parent === global) return;
    var h = Math.ceil(calc.getBoundingClientRect().height) + 2;
    if (h === sidastaHaed || h <= 2) return;
    sidastaHaed = h;
    try {
      global.parent.postMessage({ calcHeight: h }, '*');
      global.parent.postMessage({ type: 'leikskolagjald:height', id: frameId, height: h }, '*');
    } catch (e) { /* hunsum */ }
  }

  /* --------------------------------------------------------------------
   * Atburðir
   * ------------------------------------------------------------------ */
  $('numChildren').addEventListener('change', function (e) {
    state.born = +e.target.value;
    teikna();
  });
  $('hoursSel').addEventListener('change', function (e) {
    state.klst = +e.target.value;
    teikna();
  });
  $('subsidized').addEventListener('change', function (e) {
    state.nidurgreitt = e.target.checked;
    teikna();
  });

  /* theme=auto bregst við því að notandinn skipti um stillingu á meðan
     síðan er opin */
  if (darkMq.addEventListener) darkMq.addEventListener('change', function () { teikna(); });

  /*
   * Kóðasmiðurinn (sami uppruni) sendir nýjar stillingar og gjaldskrá til
   * prófunar án þess að reiknivélin endurhleðist. Aðeins stýringarnar undir
   * „Sjálfgefin gildi“ mega endurstilla valið í forskoðuninni, svo það sem
   * ritstjórinn er að prófa haldist þegar hann fiktar í útlitinu.
   */
  global.addEventListener('message', function (e) {
    if (e.origin !== global.location.origin || e.source !== global.parent) return;
    var d = e.data;
    if (!d || d.type !== 'leikskolagjald:options') return;
    if (d.options) opts = cfg.parse(d.options);
    if (d.gjaldskra) {
      try {
        gj = R.normalize(d.gjaldskra);
        villa(null);
      } catch (err) {
        villa(err.message);
        return;
      }
    }
    if (d.endurstilla) {
      state.born = opts.dchildren;
      state.klst = opts.dhours;
      state.nidurgreitt = !!opts.dsub;
    }
    teikna();
  });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(sendaHaed).observe(calc);
  } else {
    global.addEventListener('resize', sendaHaed);
  }

  stillaUtlit();
  hladaGjaldskra();
})(typeof globalThis !== 'undefined' ? globalThis : window);
