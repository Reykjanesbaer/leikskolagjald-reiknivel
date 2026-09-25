/*
 * Leikskólagjald — reikniaðgerðir.
 *
 * Hreint reikniaðgerðasafn: engin DOM-snerting, engin gagnasókn, engar
 * fastar tölur. Allar tölur koma úr gjaldskránni (gjaldskra/<ár>.json).
 *
 * Reglurnar eru þær sömu og í upprunalegu reiknivélinni
 * (docs/upprunaleg-reiknivel.html). Samanburðarprófið í
 * test/utreikningur.test.js ber þær saman fyrir öll 100 tilvik
 * (1–5 börn × 10 klukkustundastillingar × niðurgreitt/ekki) og má ekki
 * sýna frávik. Breyttu því engri námundun hér án þess að keyra það.
 */
(function (global) {
  'use strict';

  /* Lykill klukkustundar í gjaldskrártöflunni: 4 -> "4", 4.5 -> "4.5" */
  function hourKey(h) { return String(h); }

  /* Krónutala á íslensku sniði. Notað af bæði reiknivél og kóðasmið. */
  var nf = null;
  function kr(a) {
    if (!nf) nf = new Intl.NumberFormat('is-IS');
    return nf.format(a) + ' kr.';
  }

  /* --------------------------------------------------------------------
   * Staðfesting gjaldskrár
   * ------------------------------------------------------------------ */

  function tala(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return +v;
    return null;
  }

  /*
   * Staðfestir gjaldskrá úr JSON og skilar hreinu afriti með tölum sem
   * tölum. Kastar Error með íslenskum skilaboðum ef eitthvað vantar eða
   * er ógilt, svo reiknivélin geti birt skýr skilaboð í stað þess að
   * teikna sig hálfa.
   */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Gjaldskráin er ekki hlutur.');
    var villur = [];
    var gj = {
      ar: String(raw.ar == null ? '' : raw.ar),
      gildirFra: String(raw.gildirFra == null ? '' : raw.gildirFra),
      klukkustundir: [],
      dvalargjald: {},
      aukaKlukkustund: 0,
      faedisgjald: 0,
      faedisgjaldSundurlidun: [],
      nidurgreidsla: 0,
      nidurgreidslaUndantekningar: {},
      systkinaafslattur: [1]
    };

    if (!gj.ar) villur.push('„ar“ vantar');

    /* klukkustundir ræður valmyndinni */
    if (!Array.isArray(raw.klukkustundir) || !raw.klukkustundir.length) {
      villur.push('„klukkustundir“ verður að vera listi með að minnsta kosti einu gildi');
    } else {
      raw.klukkustundir.forEach(function (h) {
        var n = tala(h);
        if (n === null || n <= 0) villur.push('ógild klukkustund: ' + h);
        else gj.klukkustundir.push(n);
      });
      gj.klukkustundir.sort(function (a, b) { return a - b; });
    }

    /* dvalargjald: tafla klukkustund -> krónur */
    if (!raw.dvalargjald || typeof raw.dvalargjald !== 'object') {
      villur.push('„dvalargjald“ vantar');
    } else {
      Object.keys(raw.dvalargjald).forEach(function (k) {
        var n = tala(raw.dvalargjald[k]);
        if (n === null || n < 0) villur.push('ógilt dvalargjald fyrir ' + k + ' klst.');
        else gj.dvalargjald[k] = n;
      });
      if (!Object.keys(gj.dvalargjald).length) villur.push('„dvalargjald“ er tómt');
    }

    [['aukaKlukkustund', 0], ['faedisgjald', 0]].forEach(function (par) {
      var n = tala(raw[par[0]]);
      if (n === null || n < par[1]) villur.push('„' + par[0] + '“ vantar eða er ógilt');
      else gj[par[0]] = n;
    });

    if (!Array.isArray(raw.faedisgjaldSundurlidun)) {
      villur.push('„faedisgjaldSundurlidun“ verður að vera listi');
    } else {
      raw.faedisgjaldSundurlidun.forEach(function (it) {
        var n = it ? tala(it.verd) : null;
        if (!it || !it.heiti || n === null || n < 0) villur.push('ógild lína í sundurliðun fæðisgjalds');
        else gj.faedisgjaldSundurlidun.push({ heiti: String(it.heiti), verd: n });
      });
    }

    var nid = tala(raw.nidurgreidsla);
    if (nid === null || nid < 0 || nid > 1) villur.push('„nidurgreidsla“ verður að vera hlutfall á milli 0 og 1');
    else gj.nidurgreidsla = nid;

    if (raw.nidurgreidslaUndantekningar != null) {
      if (typeof raw.nidurgreidslaUndantekningar !== 'object') {
        villur.push('„nidurgreidslaUndantekningar“ verður að vera hlutur');
      } else {
        Object.keys(raw.nidurgreidslaUndantekningar).forEach(function (k) {
          var n = tala(raw.nidurgreidslaUndantekningar[k]);
          if (n === null || n < 0) villur.push('ógild niðurgreiðsluundantekning fyrir ' + k + ' klst.');
          else gj.nidurgreidslaUndantekningar[k] = n;
        });
      }
    }

    if (!Array.isArray(raw.systkinaafslattur) || !raw.systkinaafslattur.length) {
      villur.push('„systkinaafslattur“ verður að vera listi með að minnsta kosti einu hlutfalli');
    } else {
      var hlutf = [];
      raw.systkinaafslattur.forEach(function (r) {
        var n = tala(r);
        if (n === null || n < 0 || n > 1) villur.push('ógilt hlutfall í systkinaafslætti: ' + r);
        else hlutf.push(n);
      });
      if (hlutf.length) gj.systkinaafslattur = hlutf;
    }

    if (villur.length) throw new Error('Gjaldskráin er ógild: ' + villur.join('; ') + '.');
    return gj;
  }

  /* --------------------------------------------------------------------
   * Útreikningur
   * ------------------------------------------------------------------ */

  /*
   * Dvalargjald fyrir klukkustundafjölda, óniðurgreitt.
   *
   * Gildi sem er ekki í töflunni er reiknað út frá hæsta gjaldinu plús
   * Math.round(aukaKlukkustund / 2) fyrir hvern hálftíma umfram — eins og
   * upprunalega reiknivélin gerði fyrir 8,5 klst.:
   * careFeeLookup[8] + Math.round(EXTRA_HOUR_RATE / 2).
   */
  function dvalargjald(gj, klst) {
    var tafla = gj.dvalargjald;
    if (tafla[hourKey(klst)] != null) return tafla[hourKey(klst)];
    var lyklar = Object.keys(tafla).map(Number).sort(function (a, b) { return a - b; });
    var haest = lyklar[lyklar.length - 1];
    var threp = Math.max(1, Math.round((klst - haest) / 0.5));
    return tafla[hourKey(haest)] + threp * Math.round(gj.aukaKlukkustund / 2);
  }

  /* Dvalargjald eftir niðurgreiðslu (undantekning hefur forgang) */
  function nidurgreittGjald(gj, klst) {
    var grunnur = dvalargjald(gj, klst);
    var undan = gj.nidurgreidslaUndantekningar[hourKey(klst)];
    if (undan != null) return undan;
    return Math.ceil(grunnur * (1 - gj.nidurgreidsla));
  }

  /* Hlutfall dvalargjalds sem greitt er fyrir barn nr. i (0-grunnað).
     Síðasta gildið gildir um öll börn þar á eftir. */
  function systkinahlutfall(gj, i) {
    var r = gj.systkinaafslattur;
    return i < r.length ? r[i] : r[r.length - 1];
  }

  /*
   * Reikningur eins mánaðar.
   *
   *   { born: [{ nr, dvalargjald, afslattur, faedisgjald, samtals }], samtals }
   *
   * dvalargjald er gjaldið eftir niðurgreiðslu en fyrir systkinaafslátt —
   * sama tala og upprunalega reiknivélin birti í línunni „Dvalargjald“.
   */
  function reikna(gj, fjoldiBarna, klst, nidurgreitt) {
    var gjald = nidurgreitt ? nidurgreittGjald(gj, klst) : dvalargjald(gj, klst);
    var faedi = gj.faedisgjald;
    var born = [];
    var samtals = 0;
    for (var i = 0; i < fjoldiBarna; i++) {
      var hlutf = systkinahlutfall(gj, i);
      var dvol = Math.round(gjald * hlutf);
      var samtalsBarn = dvol + faedi;
      born.push({
        nr: i + 1,
        dvalargjald: gjald,
        afslattur: Math.round(gjald * (1 - hlutf)),
        faedisgjald: faedi,
        samtals: samtalsBarn
      });
      samtals += samtalsBarn;
    }
    return { born: born, samtals: samtals };
  }

  /*
   * Sundurliðun fæðisgjalds á móti skráðu fæðisgjaldi. Reiknivélin notar
   * alltaf skráða faedisgjald; kóðasmiðurinn sýnir viðvörun ef þau stemma
   * ekki. Þetta er algengasta villan við árlega uppfærslu.
   */
  function faedisgjaldSumma(gj) {
    var summa = gj.faedisgjaldSundurlidun.reduce(function (a, b) { return a + b.verd; }, 0);
    return { summa: summa, stemmir: summa === gj.faedisgjald };
  }

  /* --------------------------------------------------------------------
   * Val á ári
   * ------------------------------------------------------------------ */

  /*
   * Hvaða gjaldskrárár á að nota. Skráin gjaldskra/index.json segir hvaða
   * ár eru til og hvert er virkt; ?ar=<ár> velur annað. Óþekkt ár (eða
   * engin færibreyta) fellur á virka árið, svo næsta árs gjaldskrá má
   * setja inn fyrirfram og prófa hana með slóð áður en skipt er yfir.
   * Skilar null ef engin gjaldskrá er skráð.
   */
  function veljaAr(index, beidni) {
    var listi = (index && Array.isArray(index.ar) ? index.ar : []).filter(function (e) {
      return e && e.ar != null;
    });
    if (!listi.length) return null;
    var til = listi.map(function (e) { return String(e.ar); });
    var spurt = beidni == null ? '' : String(beidni).trim();
    if (til.indexOf(spurt) !== -1) return spurt;
    var virkt = index.virkt == null ? '' : String(index.virkt).trim();
    return til.indexOf(virkt) !== -1 ? virkt : til[0];
  }

  /* Skráarnafn gjaldskrárinnar fyrir ár, t.d. "2026" -> "2026.json" */
  function skraFyrirAr(index, ar) {
    var f = (index && Array.isArray(index.ar) ? index.ar : []).filter(function (e) {
      return e && String(e.ar) === String(ar);
    })[0];
    return f && f.skra ? String(f.skra) : ar + '.json';
  }

  global.LeikskolagjaldReikn = {
    kr: kr,
    veljaAr: veljaAr,
    skraFyrirAr: skraFyrirAr,
    hourKey: hourKey,
    normalize: normalize,
    dvalargjald: dvalargjald,
    nidurgreittGjald: nidurgreittGjald,
    systkinahlutfall: systkinahlutfall,
    reikna: reikna,
    faedisgjaldSumma: faedisgjaldSumma
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
