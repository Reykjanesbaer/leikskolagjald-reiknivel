/*
 * Samanburðarpróf: nýi útreikningurinn á móti upprunalegu reiknivélinni.
 *
 *   node test/utreikningur.test.js
 *
 * Engar dependencies. Prófið hleður reiknivel/utreikningur.js eins og
 * vafrinn gerir (node:vm), svo skráin sjálf þarf enga Node-sértæka línu.
 *
 * FROSNA VIÐMIÐIÐ hér fyrir neðan er orðrétt afrit af útreikningnum úr
 * React-reiknivélinni (docs/upprunaleg-reiknivel.html, calculateTotal) með
 * sömu hörðkóðuðu tölunum og hún notaði. Því má aldrei breyta: það er
 * skjalfesta staðan sem gjaldskrá 2026 verður að skila upp á krónu.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

/* ==================================================================== */
/* Frosna viðmiðið — upprunalega reiknivélin, óbreytt                    */
/* ==================================================================== */

var FOOD_FEE = 12165;
var EXTRA_HOUR_RATE = 6903;
var SUBSIDY_DISCOUNT = 0.25;
var careFeeLookup = {
  4: 18308, 4.5: 20597, 5: 22885, 5.5: 25174, 6: 27462,
  6.5: 29751, 7: 32039, 7.5: 34328, 8: 36616
};
var HOURS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5];

function upprunalegt(numChildren, hours, subsidized) {
  var baseCareFee;
  if (hours <= 8) {
    baseCareFee = careFeeLookup[hours];
  } else {
    var extraHalfHour = Math.round(EXTRA_HOUR_RATE / 2);
    baseCareFee = careFeeLookup[8] + extraHalfHour;
  }

  var finalCareFee = baseCareFee;
  if (subsidized) {
    if (hours === 8.5) {
      finalCareFee = 30052;
    } else {
      finalCareFee = Math.ceil(baseCareFee * (1 - SUBSIDY_DISCOUNT));
    }
  }

  var results = [];
  var total = 0;
  for (var i = 0; i < numChildren; i++) {
    var multiplier = i === 0 ? 1.0 : (i === 1 ? 0.5 : 0.0);
    var childCare = Math.round(finalCareFee * multiplier);
    var childTotal = childCare + FOOD_FEE;

    results.push({
      childNum: i + 1,
      originalCareFee: finalCareFee,
      discount: Math.round(finalCareFee * (1 - multiplier)),
      careFee: childCare,
      foodFee: FOOD_FEE,
      total: childTotal
    });
    total += childTotal;
  }
  return { results: results, total: total };
}

/* ==================================================================== */
/* Nýja safnið, hlaðið eins og í vafra                                   */
/* ==================================================================== */

function hladaSafni() {
  var sandbox = { Intl: Intl, Math: Math, Object: Object, Array: Array, JSON: JSON };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  var src = fs.readFileSync(path.join(ROOT, 'reiknivel', 'utreikningur.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'reiknivel/utreikningur.js' });
  if (!sandbox.LeikskolagjaldReikn) throw new Error('utreikningur.js skilaði engu safni.');
  return sandbox.LeikskolagjaldReikn;
}

function lesaJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/* ==================================================================== */
/* Próframmi                                                             */
/* ==================================================================== */

var keyrd = 0;
var villur = [];

function profa(heiti, fn) {
  keyrd++;
  try {
    fn();
  } catch (e) {
    villur.push(heiti + ': ' + e.message);
  }
}

function jafnt(fekk, atti, hvad) {
  if (fekk !== atti) {
    throw new Error(hvad + ' — fékk ' + fekk + ', átti að vera ' + atti);
  }
}

/* ==================================================================== */
/* Prófin                                                                */
/* ==================================================================== */

var R = hladaSafni();
var gj = R.normalize(lesaJson('gjaldskra/2026.json'));

/* 1. Öll 100 tilvikin: 1–5 börn × 10 klukkustundastillingar × niðurgreitt/ekki */
var tilvik = 0;
[1, 2, 3, 4, 5].forEach(function (born) {
  HOURS.forEach(function (klst) {
    [false, true].forEach(function (nidurgreitt) {
      tilvik++;
      var merki = born + ' börn, ' + klst + ' klst.' + (nidurgreitt ? ', niðurgreitt' : '');
      profa('Tilvik ' + tilvik + ' (' + merki + ')', function () {
        var gamalt = upprunalegt(born, klst, nidurgreitt);
        var nytt = R.reikna(gj, born, klst, nidurgreitt);
        jafnt(nytt.samtals, gamalt.total, 'Samtals á mánuði');
        jafnt(nytt.born.length, gamalt.results.length, 'Fjöldi barna í niðurstöðu');
        gamalt.results.forEach(function (g, i) {
          var n = nytt.born[i];
          jafnt(n.nr, g.childNum, 'Barn nr.');
          jafnt(n.dvalargjald, g.originalCareFee, 'Dvalargjald, barn ' + g.childNum);
          jafnt(n.afslattur, g.discount, 'Systkinaafsláttur, barn ' + g.childNum);
          jafnt(n.faedisgjald, g.foodFee, 'Fæðisgjald, barn ' + g.childNum);
          jafnt(n.samtals, g.total, 'Samtals, barn ' + g.childNum);
        });
      });
    });
  });
});

profa('Tilvikin eru 100', function () { jafnt(tilvik, 100, 'Fjöldi tilvika'); });

/* 2. Hörðkóðaða undantekningin: 8,5 klst. niðurgreitt er 30.052, ekki 30.051 */
profa('8,5 klst. niðurgreitt = 30.052 kr.', function () {
  jafnt(R.nidurgreittGjald(gj, 8.5), 30052, 'Niðurgreitt dvalargjald við 8,5 klst.');
  jafnt(Math.ceil(R.dvalargjald(gj, 8.5) * 0.75), 30051, 'Reiknaða talan (til viðmiðunar)');
});

/* 3. Klukkustundir utan töflunnar: hæsta gjaldið + hálf aukaklukkustund á hvern hálftíma */
profa('Klukkustundir utan töflunnar', function () {
  jafnt(R.dvalargjald(gj, 8.5), 36616 + Math.round(6903 / 2), 'Dvalargjald við 8,5 klst.');
  jafnt(R.dvalargjald(gj, 9), 36616 + 2 * Math.round(6903 / 2), 'Dvalargjald við 9 klst.');
});

/* 4. Systkinaafsláttur: síðasta hlutfallið gildir um öll börn þar á eftir */
profa('Systkinaafsláttur nær yfir fleiri börn en hlutföllin', function () {
  var r = R.reikna(gj, 8, 4, false);
  jafnt(r.born.length, 8, 'Fjöldi barna');
  jafnt(r.born[2].samtals, r.born[7].samtals, 'Barn 3 og barn 8 greiða það sama');
  jafnt(r.samtals, 18308 + Math.round(18308 * 0.5) + 8 * 12165, 'Samtals fyrir 8 börn');
});

/* 5. Allar gjaldskrárskrár: sundurliðun fæðisgjalds og virka árið */
var index = lesaJson('gjaldskra/index.json');

profa('gjaldskra/index.json: virka árið er til', function () {
  var virkt = R.veljaAr(index, null);
  jafnt(virkt, String(index.virkt), 'Virka árið');
});

profa('Óþekkt ár fellur á virka árið', function () {
  jafnt(R.veljaAr(index, '1999'), String(index.virkt), 'Ár sem er ekki til');
  jafnt(R.veljaAr(index, ''), String(index.virkt), 'Tóm færibreyta');
  jafnt(R.veljaAr(index, index.virkt), String(index.virkt), 'Virka árið sjálft');
});

index.ar.forEach(function (e) {
  var rel = 'gjaldskra/' + R.skraFyrirAr(index, e.ar);
  profa('Gjaldskrá ' + e.ar + ' (' + rel + ')', function () {
    var g = R.normalize(lesaJson(rel));
    jafnt(g.ar, String(e.ar), 'Ár í skránni');
    jafnt(g.klukkustundir.length > 0, true, 'klukkustundir eru til');
    var f = R.faedisgjaldSumma(g);
    jafnt(f.stemmir, true, 'Sundurliðun fæðisgjalds leggst saman í ' + g.faedisgjald +
      ' (fékk ' + f.summa + ')');
    g.klukkustundir.forEach(function (klst) {
      jafnt(isFinite(R.dvalargjald(g, klst)), true, 'Dvalargjald reiknast fyrir ' + klst + ' klst.');
    });
  });
});

/* 6. Ógild gjaldskrá stöðvast með skýrum skilaboðum */
profa('Ógild gjaldskrá kastar Error', function () {
  var raw = lesaJson('gjaldskra/2026.json');
  delete raw.dvalargjald;
  var kastadi = false;
  try { R.normalize(raw); } catch (e) { kastadi = /Gjaldskráin er ógild/.test(e.message); }
  jafnt(kastadi, true, 'normalize kastar á gjaldskrá án dvalargjalds');
});

/* ==================================================================== */
/* Niðurstaða                                                            */
/* ==================================================================== */

if (villur.length) {
  console.error('\n' + villur.length + ' af ' + keyrd + ' prófum brugðust:\n');
  villur.forEach(function (v) { console.error('  ✗ ' + v); });
  console.error('');
  process.exit(1);
}

console.log('✓ ' + keyrd + ' próf í lagi — 100 tilvik bera saman við upprunalegu reiknivélina án fráviks.');
