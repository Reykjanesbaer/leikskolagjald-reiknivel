# leikskolagjald-reiknivel

Reiknivél fyrir áætluð leikskólagjöld hjá Reykjanesbæ, sem hægt er að fella
inn á vefsíður. Engin byggingarskref og engir pakkar, bara statískar skrár
sem eru hýstar á GitHub Pages og hægt er að fella inn hvar sem er, þar á
meðal í Payload CMS.

**Reiknivélin:** <https://reykjanesbaer.github.io/leikskolagjald-reiknivel/>
**Forskoðun og kóðasmiður:** <https://reykjanesbaer.github.io/leikskolagjald-reiknivel/ritstjorn/>

- Gjaldskráin er gögn í [`gjaldskra/`](gjaldskra/) og er uppfærð einu sinni
  á ári án þess að snerta reiknikóðann.
- Útlitið er stillt með færibreytum í slóðinni, svo sama reiknivélin getur
  litið ólíkt út eftir því hvar hún er felld inn.
- Útreikningurinn er óbreyttur frá upprunalegu reiknivélinni — sjá
  [Útreikningur](#útreikningur).

> **Ath.** Slóð reiknivélarinnar er óbreytt (rót verkefnisins), svo
> innfellingin sem er þegar á vef bæjarins heldur áfram að virka. Kóðasmiður
> ritstjóra fluttist á `/ritstjorn/`.

---

## Innfelling

### 1. Með iframe (mælt með)

Öruggasta leiðin. Virkar alls staðar þar sem HTML er leyft og krefst ekki
`<script>`. Límdu þetta í HTML-reit eða `Code`/`HTML` blokk í Payload:

```html
<iframe
  src="https://reykjanesbaer.github.io/leikskolagjald-reiknivel/"
  title="Leikskólagjald reiknivél"
  loading="lazy"
  scrolling="no"
  style="width:100%;max-width:min(672px,100%);height:911px;border:0;display:block;margin-left:0;margin-right:auto">
</iframe>
```

Spássíurnar ráða staðsetningunni á síðunni: `margin-left:0;margin-right:auto`
setur reiknivélina vinstra megin, `margin-left:auto;margin-right:auto` í
miðju og `margin-left:auto;margin-right:0` hægra megin. Auto-spássíur
yfirskrifa miðjun sem kemur úr umlykjandi gámi, bæði með `text-align` og flex.

Hámarksbreiddin er alltaf höfð sem `min(<gildi>, 100%)`, svo reiknivélin
flæðir aldrei út fyrir á síma.

Hæðin er fast gildi hér og ræðst af innihaldinu, ekki breiddinni. Veldu hana
eftir stillingum — kóðasmiðurinn reiknar hana, svo afritaðu kóðann þaðan
frekar en að breyta honum í höndunum:

| Stillingar | Hæð |
| --- | --- |
| Sjálfgefið (1 barn) | `911px` |
| 2 börn | `1087px` |
| 3 börn | `1263px` |
| 5 börn | `1615px` |
| Hvert barn umfram það fyrsta | `+176px` |
| `food=0` (án sundurliðunar) | `−153px` |
| `note=0` (án fyrirvara) | `−65px` |
| `title=0` (án titils) | `−54px` |

Á mjóum skjá vefst texti í fleiri línur og reiknivélin verður hærri. Viljirðu
að hæðin fylgi innihaldinu nákvæmlega — líka þegar gestur breytir fjölda
barna — notaðu skriftuna.

### 2. Með skriftu (sjálfvirk hæð)

Ef vefumsjónarkerfið leyfir `<script>` stillir þessi útgáfa hæðina sjálf
eftir innihaldi: ekkert autt svæði og ekkert afklippt.

```html
<script
  src="https://reykjanesbaer.github.io/leikskolagjald-reiknivel/embed.js"
  data-theme="auto"
  data-maxchildren="5"
  data-align="left"
  data-width="100%"
  data-max-width="672px">
</script>
```

Allar `data-*` færibreytur samsvara færibreytunum í töflunni hér að neðan
(`data-theme` → `?theme=`, `data-maxchildren` → `?maxchildren=`).

Þrjár eru undantekning. Þær eru ekki sendar áfram á reiknivélina, heldur
stýra þær aðeins iframe-inum sjálfum:

| Eigind | Gildi | Sjálfgefið | Lýsing |
| --- | --- | --- | --- |
| `data-width` | `1`–`100%` eða `200`–`2000px` | `100%` | Breidd |
| `data-max-width` | `1`–`100%`, `200`–`2000px` eða `none` | `672px` | Hámarksbreidd, alltaf klemmd við 100 % |
| `data-align` | `left`, `center`, `right` | `left` | Staðsetning á síðunni |

Tala án einingar er px og gildi utan marka falla á sjálfgefið. `embed.js`
staðfestir breiddirnar með sama falli og kóðasmiðurinn (`parseSize` í
[`reiknivel/config.js`](reiknivel/config.js)).

> **Ath.** Margar Payload-uppsetningar hreinsa `<script>` úr ritlinum
> (`lexical`/`slate` sanitizing). Ef skriftan skilar engu skaltu nota
> iframe-leiðina — hún gefur sömu útkomu, bara með fastri hæð.

#### Eldri innfellingar

Innfellingar sem eru þegar á vefnum og hlusta á `postMessage` með
`{ calcHeight }` halda áfram að virka óbreyttar:

```html
<script>
  window.addEventListener('message', function (e) {
    if (e.data && Object.prototype.hasOwnProperty.call(e.data, 'calcHeight')) {
      var iframe = document.querySelector('iframe[title="Leikskólagjald Reiknivél"]');
      if (iframe) iframe.style.height = e.data.calcHeight + 'px';
    }
  });
</script>
```

Reiknivélin sendir bæði gömlu skilaboðin og ný
(`{ type: 'leikskolagjald:height', id, height }`), og nú við hverja
stærðarbreytingu (`ResizeObserver`) í stað þess að giska á tímasetningu.
Í nýjum innfellingum er rétt að athuga `e.origin` áður en skilaboð eru tekin
gild, eins og `embed.js` gerir.

### 3. Sem eigin Payload-blokk

Ef þið viljið gefa ritstjórum val í stað þess að líma HTML er tilbúin blokk í
[`payload/`](payload/) — afritið möppuna inn í verkefnið og fylgið
[`payload/README.md`](payload/README.md).

---

## Stillingar

Allar stillingar eru færibreytur í slóðinni. Ógild gildi (utan bils eða
óþekkt orð) falla á sjálfgefið gildi.

| Færibreyta | Gildi | Sjálfgefið | Lýsing |
| --- | --- | --- | --- |
| `theme` | `auto`, `light`, `dark` | `auto` | Þema. `auto` fylgir `prefers-color-scheme` |
| `radius` | `0`–`32` | `16` | Hornarúnnun í px |
| `title` | `0`, `1` | `1` | Sýna titil og tákn |
| `food` | `0`, `1` | `1` | Sýna sundurliðun fæðisgjalds |
| `note` | `0`, `1` | `1` | Sýna fyrirvara |
| `frame` | `0`, `1` | `1` | Sýna ramma og bakgrunn (`0` = gegnsætt, fellur inn í síðuna) |
| `ar` | t.d. `2026` | virka árið | Hvaða gjaldskrá er notuð |
| `dchildren` | `1`–`maxchildren` | `1` | Sjálfgefinn fjöldi barna |
| `dhours` | gildi úr `klukkustundir` | `4` | Sjálfgefnar klukkustundir |
| `dsub` | `0`, `1` | `0` | Niðurgreitt sjálfgefið hakað |
| `maxchildren` | `1`–`10` | `5` | Flest börn í valmyndinni |
| `accent` | hex án `#` | `1D4D91` | Höfuðlitur |
| `onaccent` | hex án `#` | `FFFFFF` | Texti á höfuðlit |
| `bg` | hex án `#` | — | Bakgrunnur í ljósu þema |
| `bgdark` | hex án `#` | — | Bakgrunnur í dökku þema |

Litafæribreytur taka sex stafa hex með eða án `#` (`%23` í slóð), í há- eða
lágstöfum. Litirnir ganga inn sem CSS-breytur (`--c-accent`,
`--c-on-accent`, `--c-bg`), ekki sem inline-stílar á einstök element.

### Dæmi

```
?theme=dark
?frame=0&note=0
?dchildren=2&dhours=8&dsub=1
?maxchildren=3&accent=2760AB&onaccent=FFFFFF
?bg=F7F9FB&bgdark=16191B
?ar=2027
```

---

## Gjaldskrá

Gjaldskráin er gögn, ekki kóði. Hún er í [`gjaldskra/`](gjaldskra/), ein skrá
á ár, og reiknikóðinn veit ekkert um einstakar tölur.

```
gjaldskra/
  index.json   Hvaða ár eru til og hvert er virkt
  2026.json    Gjaldskrá ársins
```

`gjaldskra/2026.json`:

| Reitur | Lýsing |
| --- | --- |
| `ar` | Ártal, t.d. `"2026"` |
| `gildirFra` | Dagsetning, t.d. `"2026-01-01"` |
| `klukkustundir` | Valmyndin: `[4, 4.5, … 8.5]` |
| `dvalargjald` | Tafla klukkustund → krónur á mánuði |
| `aukaKlukkustund` | Heil aukaklukkustund í krónum |
| `faedisgjald` | Fæðisgjald á mánuði |
| `faedisgjaldSundurlidun` | Línurnar í sundurliðuninni (`heiti`, `verd`) |
| `nidurgreidsla` | Hlutfall, `0.25` = 25 % afsláttur |
| `nidurgreidslaUndantekningar` | Föst niðurgreidd gjöld sem víkja frá reglunni |
| `systkinaafslattur` | Hlutfall dvalargjalds sem greitt er fyrir hvert barn |

Reglurnar:

- **`klukkustundir` ræður valmyndinni.** Gildi sem er ekki í `dvalargjald` er
  reiknað út frá hæsta gjaldinu plús `Math.round(aukaKlukkustund / 2)` fyrir
  hvern hálftíma umfram. Þannig er 8,5 klst. reiknað út frá 8 klst.
- **`systkinaafslattur`** er hlutfall dvalargjalds sem greitt er fyrir hvert
  barn. Síðasta gildið gildir líka um öll börn þar á eftir, svo
  `[1, 0.5, 0]` þýðir: fyrsta barn 100 %, annað 50 %, öll hin 0 %, sama hve
  börnin eru mörg.
- **`nidurgreidslaUndantekningar`** heldur utan um tilvik þar sem niðurgreidda
  gjaldið er fast og víkur frá reglunni. Í gjaldskrá 2026 er þetta 8,5 klst.
  (30.052 kr., ekki 30.051 kr. sem reglan gæfi). **Ekki fjarlægja það.**
- Stemmi `faedisgjald` og summa `faedisgjaldSundurlidun` ekki notar
  reiknivélin skráða `faedisgjald` og kóðasmiðurinn sýnir viðvörun. Þetta er
  algengasta villan við árlega uppfærslu.

### Uppfærsla gjaldskrár

Einu sinni á ári, skref fyrir skref:

1. Opnaðu **[kóðasmiðinn](https://reykjanesbaer.github.io/leikskolagjald-reiknivel/ritstjorn/)**
   og skrunaðu niður í hlutann **Gjaldskrá**.
2. Sláðu nýju tölurnar inn í reitina. Forskoðunin uppfærist jafnóðum, svo þú
   sérð strax hvað hver breyting þýðir í krónum. Ógild gildi (tómt, neikvætt,
   prósenta yfir 100) eru merkt og ekki notuð.
3. Uppfærðu **Ár** og **Gildir frá**.
4. Stemmi sundurliðun fæðisgjalds ekki við skráða fæðisgjaldið birtist
   viðvörun. Lagaðu hana áður en lengra er haldið.
5. Smelltu á **Afrita gjaldskrá (JSON)**.
6. Vistaðu JSON-ið í repóinu sem `gjaldskra/<ár>.json`, t.d.
   `gjaldskra/2027.json`.
7. Bættu árinu við `gjaldskra/index.json`:

   ```json
   {
     "virkt": "2026",
     "ar": [
       { "ar": "2026", "gildirFra": "2026-01-01", "skra": "2026.json" },
       { "ar": "2027", "gildirFra": "2027-01-01", "skra": "2027.json" }
     ]
   }
   ```

   Athugaðu að `virkt` er enn `"2026"` — nýja gjaldskráin er komin inn en
   ekki tekin í gildi.
8. Staðfestu nýju gjaldskrána með slóðinni
   `https://reykjanesbaer.github.io/leikskolagjald-reiknivel/?ar=2027`. Á
   meðan sýna allar innfellingar á vefnum áfram gildandi gjaldskrá.
9. Þegar nýja gjaldskráin tekur gildi: breyttu `"virkt"` í `"2027"`. Allar
   innfellingar fylgja í sama vetfangi, því ártalið er hvergi í
   innfellingarkóðanum.

Breytingar í kóðasmiðnum eru **aðeins til að prófa og vistast hvergi** — til
að festa nýja gjaldskrá þarf að vista JSON-ið í repóinu.

Gjaldskrártölur fara aldrei í innfellingarkóðann eða slóðina. Slóðin yrði
allt of löng og verð myndu frjósa inni í gömlum innfellingum á síðum
bæjarins. Aðeins `ar` fer í slóðina.

---

## Útreikningur

Útreikningurinn er **óbreyttur** frá upprunalegu reiknivélinni, sem er
geymd orðrétt sem
[`docs/upprunaleg-reiknivel.html`](docs/upprunaleg-reiknivel.html).

[`test/utreikningur.test.js`](test/utreikningur.test.js) ber nýja
útreikninginn saman við frosið afrit af upprunalega React-kóðanum fyrir
**öll 100 tilvikin** — 1–5 börn × 10 klukkustundastillingar ×
niðurgreitt/ekki — og krefst þess að hver einasta krónutala stemmi. Prófið
keyrir í CI við hverja breytingu:

```bash
node test/utreikningur.test.js
```

Prófið athugar líka að 8,5 klst. niðurgreitt skili 30.052 kr., að
sundurliðun fæðisgjalds stemmi í öllum skrám í `gjaldskra/`, að virka árið
sé til og að óþekkt ár falli á það.

Reikniaðgerðirnar sjálfar eru í
[`reiknivel/utreikningur.js`](reiknivel/utreikningur.js) — hreint safn án
DOM-snertingar og án fastra talna.

---

## Uppbygging

```
index.html          Reiknivélin sjálf (það sem innfellingar vísa á)
embed.js            Innfellingarskrifta með sjálfvirkri hæð
ritstjorn/
  index.html        Forskoðun og kóðasmiður fyrir ritstjóra
reiknivel/
  reiknivel.css     Útlit, þemu og viðbrögð við þröngu plássi
  reiknivel.js      Teikning, atburðir og hæðarskilaboð
  utreikningur.js   Reikniaðgerðir, engin DOM-snerting
  config.js         Sjálfgefnar stillingar, lestur færibreyta, litir, breidd, hæð
gjaldskra/
  index.json        Tiltæk ár og virka árið
  2026.json         Gjaldskrá ársins
payload/            Tilbúin Payload 3 blokk (afritast inn í vefverkefnið)
  blocks/Leikskolagjald/config.ts
  blocks/Leikskolagjald/Component.tsx
test/
  utreikningur.test.js  Samanburður við upprunalegu reiknivélina
docs/
  upprunaleg-reiknivel.html  Upprunalega React-reiknivélin, óbreytt
.github/workflows/
  deploy.yml        Sjálfvirk birting á GitHub Pages
  test.yml          Keyrir prófið
```

Engar dependencies, ekkert build. Til að keyra staðbundið dugar hvaða
statíski þjónn sem er:

```bash
npx http-server . -p 8080
# opnaðu http://127.0.0.1:8080/ (reiknivélin)
#    eða http://127.0.0.1:8080/ritstjorn/ (kóðasmiðurinn)
```

Kóðasmiðurinn notar raunverulegu reiknivélina í iframe og sendir henni nýjar
stillingar og gjaldskrá til prófunar með `postMessage` (aðeins frá sama
uppruna), svo forskoðunin endurhleðst ekki og valið í henni helst.

### Hýsing

`deploy.yml` birtir `main` á GitHub Pages sjálfkrafa. Til að virkja þetta í
fyrsta sinn: **Settings → Pages → Source → GitHub Actions**. Þangað til
heldur fyrri birting áfram að virka, svo reiknivélin dettur ekki út.

Líka er hægt að hýsa reiknivélina annars staðar, því ekkert bindur hana við
GitHub Pages. Afritið bara skrárnar og uppfærið slóðirnar í
innfellingarkóðanum og í `payload/blocks/Leikskolagjald/Component.tsx`.

### Letur

Reiknivélin notar **Plus Jakarta Sans** frá Google Fonts, eins og fyrri
útgáfa hennar, og fellur á kerfisletur ef það hleðst ekki. Leturskráin er
eina beiðnin sem fer út fyrir vefinn; viljið þið losna við hana má hýsa
letrið með reiknivélinni og uppfæra `--c-font` í
[`reiknivel/reiknivel.css`](reiknivel/reiknivel.css).

---

## Aðgengi

- Hvert `select` og hver gátreitur hefur sýnilegt `<label>` tengt með
  `for`/`id`, og reiknivélin virkar með lyklaborði eingöngu.
- Niðurstöðusvæðið er `aria-live="polite"` og tilkynnir **aðeins
  heildartöluna** þegar hún breytist, ekki alla sundurliðunina.
- Sýnilegur fókushringur á öllum stýringum, líka í dökku þema.
- Öll samsetning texta og bakgrunns nær AA (4,5:1 fyrir venjulegan texta,
  3:1 fyrir stóran) í báðum þemum. Höfuðliturinn er notaður óbreyttur á
  fleti en ljósaður eða dekkaður fyrir texta þar til hann nær markinu
  (`laesilegur()` í [`reiknivel/config.js`](reiknivel/config.js)), svo þetta
  gildir líka um liti sem ritstjóri velur sjálfur.
- `lang="is"` og tölur sniðnar með `Intl.NumberFormat("is-IS")`.
- Dökkt þema er raunverulegt þema með eigin litum, ekki öfugsnúnir litir, og
  `theme=auto` bregst við þegar notandinn skiptir um stillingu í
  stýrikerfinu á meðan síðan er opin.

---

## Umsjón

Reykjanesbær — vefstjórn / stafrænar lausnir.

Verkefnið byggir á eldri HTML-reiknivél sem var vistuð undir
<https://www.reykjanesbaer.is/static/files/vef/calc-leikskolar/reiknivelin_026.html>.
