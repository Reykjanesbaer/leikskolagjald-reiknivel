/*
 * Leikskólagjald — sjálfgefnar stillingar, lestur færibreyta, litir og breidd.
 *
 * Hleðst á eftir utreikningur.js og á undan reiknivel.js. embed.js hleður
 * þessa skrá líka (án reiknivel.js) til að nota parseSize og hydur.
 *
 * Kóðasmiðurinn (ritstjorn/index.html) notar þessa sömu skrá, svo sjálfgefin
 * gildi, gildisathugun og hæðarformúla eru skilgreind á einum stað.
 *
 * Gjaldskrártölur eru EKKI hér og fara aldrei í slóðina — þær eru gögn í
 * gjaldskra/<ár>.json. Aðeins ar fer í slóðina.
 */
(function (global) {
  'use strict';

  /* --------------------------------------------------------------------
   * Stillingar. Hver lína: sjálfgefið gildi + hvernig gildi er athugað.
   * Ógild gildi (utan bils, óþekkt orð) falla á sjálfgefið.
   * ------------------------------------------------------------------ */
  var SPEC = {
    theme:       { def: 'auto',   one: ['auto', 'light', 'dark'] },
    radius:      { def: 16,       num: [0, 32], heil: true },
    title:       { def: 1,        bit: true },
    food:        { def: 1,        bit: true },
    note:        { def: 1,        bit: true },
    frame:       { def: 1,        bit: true },
    ar:          { def: '',       ar: true },
    dchildren:   { def: 1,        num: [1, 10], heil: true },
    dhours:      { def: 4,        num: [0, 24] },
    dsub:        { def: 0,        bit: true },
    maxchildren: { def: 5,        num: [1, 10], heil: true },
    accent:      { def: '1D4D91', color: true },
    onaccent:    { def: 'FFFFFF', color: true },
    bg:          { def: '',       color: true, empty: true },
    bgdark:      { def: '',       color: true, empty: true }
  };

  var KEYS = Object.keys(SPEC);
  var COLOR_KEYS = ['accent', 'onaccent', 'bg', 'bgdark'];

  /* Sjálfgefinn bakgrunnur þegar bg / bgdark er tómt — sömu gildi og CSS-ið */
  var BG_FALLBACK = { bg: 'FFFFFF', bgdark: '1B2024' };

  /* „1D4D91“, „#1d4d91“ og „%231D4D91“ → „1D4D91“; annars null */
  function parseColor(raw) {
    if (raw === null || raw === undefined) return null;
    var v = String(raw).trim().replace(/^(#|%23)/i, '');
    return /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
  }

  /* Ártal er fjórir tölustafir; allt annað fellur á virka árið (tómt) */
  function parseAr(raw) {
    var v = String(raw === null || raw === undefined ? '' : raw).trim();
    return /^\d{4}$/.test(v) ? v : null;
  }

  function defaults() {
    var o = {};
    KEYS.forEach(function (k) { o[k] = SPEC[k].def; });
    return o;
  }

  /* Eitt gildi athugað; skilar sjálfgefnu ef það stenst ekki */
  function check(key, raw) {
    var s = SPEC[key];
    if (raw === null || raw === undefined) return s.def;
    if (s.color) {
      if (s.empty && String(raw).trim() === '') return '';
      return parseColor(raw) || s.def;
    }
    if (s.ar) {
      if (String(raw).trim() === '') return '';
      return parseAr(raw) || s.def;
    }
    var v = String(raw).trim().toLowerCase();
    if (s.num) {
      if (!/^\d+(\.\d+)?$/.test(v)) return s.def;
      var n = parseFloat(v);
      if (s.heil) n = Math.round(n);
      return n >= s.num[0] && n <= s.num[1] ? n : s.def;
    }
    if (s.bit) return v === '1' ? 1 : v === '0' ? 0 : s.def;
    return s.one.indexOf(v) !== -1 ? v : s.def;
  }

  /* Allar stillingar úr query-streng eða hlut (t.d. frá kóðasmiðnum) */
  function parse(source) {
    var get;
    if (typeof source === 'string' || source === undefined) {
      var q = new URLSearchParams(source === undefined ? global.location.search : source);
      get = function (k) { return q.get(k); };
    } else {
      get = function (k) { return source[k]; };
    }
    var o = {};
    KEYS.forEach(function (k) { o[k] = check(k, get(k)); });
    if (o.dchildren > o.maxchildren) o.dchildren = o.maxchildren;
    return o;
  }

  /* Aðeins þær stillingar sem víkja frá sjálfgefnu, í fastri röð */
  function changed(o) {
    var out = [];
    KEYS.forEach(function (k) {
      if (o[k] !== SPEC[k].def) out.push([k, String(o[k])]);
    });
    return out;
  }

  /* --------------------------------------------------------------------
   * Birtuskil. Höfuðliturinn er notaður bæði á fleti (með völdum texta á)
   * og sem textalitur. #1D4D91 á dökkum fleti er of dauft fyrir smáan
   * texta, svo textaliturinn er ljósaður (dökkt þema) eða dekkaður (ljóst
   * þema) þar til hann nær AA, 4.5:1. Sjálfgefinn litur á hvítu er 8,6:1
   * og breytist því ekki.
   * ------------------------------------------------------------------ */
  var AA = 4.5;

  function rgb(hex) {
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hex(c) {
    return c.map(function (v) {
      var s = Math.round(Math.max(0, Math.min(255, v))).toString(16).toUpperCase();
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  /* Hlutfallsleg ljósstyrkur (WCAG 2.1) */
  function luminance(c) {
    var a = c.map(function (v) {
      var s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  /* Birtuskil tveggja hex-lita, 1–21 */
  function contrast(a, b) {
    var la = luminance(rgb(a)), lb = luminance(rgb(b));
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /*
   * Sami litur, aðeins ljósari eða dekkri, þar til hann nær marki (AA) á
   * þessum bakgrunni. Skilar hex án #.
   */
  function laesilegur(litur, bakgrunnur, mark) {
    var minnst = mark || AA;
    if (contrast(litur, bakgrunnur) >= minnst) return litur;
    var ljos = luminance(rgb(bakgrunnur)) < 0.5;   /* dökkur bakgrunnur → ljósari litur */
    var markLitur = ljos ? [255, 255, 255] : [0, 0, 0];
    var c = rgb(litur);
    for (var t = 0.05; t <= 1.0001; t += 0.05) {
      var blanda = hex([
        c[0] + (markLitur[0] - c[0]) * t,
        c[1] + (markLitur[1] - c[1]) * t,
        c[2] + (markLitur[2] - c[2]) * t
      ]);
      if (contrast(blanda, bakgrunnur) >= minnst) return blanda;
    }
    return hex(markLitur);
  }

  /* Bakgrunnur reiknivélarinnar eins og hann verður, miðað við þema */
  function bakgrunnur(o, dokkt) {
    var valinn = dokkt ? o.bgdark : o.bg;
    return valinn || (dokkt ? BG_FALLBACK.bgdark : BG_FALLBACK.bg);
  }

  /* --------------------------------------------------------------------
   * Breidd iframe-sins (umgjörð, fer ekki í slóð reiknivélarinnar).
   * „80%“, „480px“ eða „480“ (= px). Gildi utan marka → null.
   * ------------------------------------------------------------------ */
  var SIZE = {
    width:    { def: '100%',  pct: [1, 100], px: [200, 2000], none: false },
    maxWidth: { def: '672px', pct: [1, 100], px: [200, 2000], none: true }
  };

  function parseSize(raw, kind) {
    var s = SIZE[kind];
    if (raw === null || raw === undefined) return null;
    var v = String(raw).trim().toLowerCase().replace(/\s+/g, '');
    if (s.none && v === 'none') return 'none';
    var m = /^(\d+(?:\.\d+)?)(%|px)?$/.exec(v);
    if (!m) return null;
    var n = parseFloat(m[1]), unit = m[2] || 'px';
    var lim = unit === '%' ? s.pct : s.px;
    return n >= lim[0] && n <= lim[1] ? n + unit : null;
  }

  /* Gilt gildi eða sjálfgefið */
  function size(raw, kind) { return parseSize(raw, kind) || SIZE[kind].def; }

  /*
   * CSS fyrir breidd iframe-sins. max-width er alltaf klemmt við 100% svo
   * reiknivélin flæði aldrei út fyrir á mjóum skjá.
   */
  function sizeCss(width, maxWidth) {
    var w = size(width, 'width'), m = size(maxWidth, 'maxWidth');
    return 'width:' + w + ';max-width:' + (m === 'none' ? '100%' : 'min(' + m + ',100%)');
  }

  function margins(align) {
    if (align === 'center') return 'margin-left:auto;margin-right:auto;';
    if (align === 'right') return 'margin-left:auto;margin-right:0;';
    return 'margin-left:0;margin-right:auto;';
  }

  /* --------------------------------------------------------------------
   * Hæð. Ólíkt stefnuhringnum ræðst hæð reiknivélarinnar af innihaldinu,
   * ekki breiddinni, svo hún er reiknuð út frá stillingunum. Gildin eru
   * mæld í Chromium á breiðum skjá (>= 40rem, 2rem innri spássía).
   *
   * Notað fyrir: fasta hæð í iframe-innfellingu, byrjunarhæð í embed.js
   * (sem lagfærir hana svo með skilaboðum frá reiknivélinni) og hæðina í
   * Payload-blokkinni. Sama formúla er endurtekin í
   * payload/blocks/Leikskolagjald/Component.tsx.
   * ------------------------------------------------------------------ */
  var H = {
    pad: 64,         /* 2rem að ofan og neðan (rammalaus útgáfa heldur þeim) */
    title: 54,       /* haus með spássíu undir                              */
    fields: 251,     /* þrír reitir með spássíum                            */
    resultsHead: 88, /* spássía, lína og „Niðurstöður“                      */
    child: 151,      /* barnakort án systkinaafsláttarlínu                  */
    sibling: 25,     /* aukalínan „Systkinaafsláttur“ (börn 2 og upp úr)    */
    total: 81,       /* samtalsstikan                                       */
    foodBase: 87,    /* fæðisgjaldsreitur án lína                           */
    foodLine: 22,    /* hver lína í sundurliðuninni                         */
    note: 65,        /* fyrirvari                                           */
    slaki: 4         /* námundun og rammi                                   */
  };

  /*
   * Gildin eru mæld í Chromium á skjá breiðari en 40rem. Ramminn (frame)
   * breytir ekki hæðinni, því rammalaus útgáfa heldur lóðréttu spássíunum.
   * Á mjóum skjá vefst texti í fleiri línur og reiknivélin verður hærri —
   * embed.js lagfærir hæðina með skilaboðum frá reiknivélinni, en fasta
   * hæðin í iframe-innfellingu er alltaf ágiskun.
   */
  function hydur(o, born, faedislinur) {
    var b = Math.max(1, Math.min(10, Math.round(born || o.dchildren || 1)));
    var linur = faedislinur === undefined ? 3 : faedislinur;
    var h = H.pad + H.fields + H.resultsHead + H.total + H.slaki;
    if (o.title) h += H.title;
    h += b * H.child + Math.max(0, b - 1) * H.sibling;
    if (o.food) h += H.foodBase + linur * H.foodLine;
    if (o.note) h += H.note;
    return Math.round(h);
  }

  global.LeikskolagjaldConfig = {
    SPEC: SPEC,
    KEYS: KEYS,
    COLOR_KEYS: COLOR_KEYS,
    BG_FALLBACK: BG_FALLBACK,
    SIZE: SIZE,
    H: H,
    parseColor: parseColor,
    parseAr: parseAr,
    defaults: defaults,
    check: check,
    parse: parse,
    changed: changed,
    contrast: contrast,
    laesilegur: laesilegur,
    bakgrunnur: bakgrunnur,
    parseSize: parseSize,
    size: size,
    sizeCss: sizeCss,
    margins: margins,
    hydur: hydur
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
