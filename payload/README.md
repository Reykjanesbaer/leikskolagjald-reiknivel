# Leikskólagjaldsblokk fyrir Payload 3

Blokk sem lætur ritstjóra setja leikskólagjaldareiknivélina inn á síðu án
þess að líma HTML. Reiknivélin sjálf er hýst á GitHub Pages og birtist í
iframe, svo hér bætast engar dependencies við verkefnið — bara tvær skrár.

```
payload/blocks/Leikskolagjald/
  config.ts       Skilgreining blokkarinnar (svið sem ritstjóri fyllir út)
  Component.tsx   Framendinn sem teiknar iframe-inn
```

## Uppsetning

### 1. Afritaðu möppuna

Settu `blocks/Leikskolagjald/` inn í verkefnið þar sem aðrar blokkir eru,
t.d. `src/blocks/Leikskolagjald/`.

### 2. Bættu blokkinni við `layout` á Pages

```ts
// src/collections/Pages/index.ts
import { Leikskolagjald } from '../../blocks/Leikskolagjald/config'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        // … blokkirnar sem fyrir eru
        Leikskolagjald,
      ],
    },
  ],
}
```

### 3. Skráðu íhlutinn í `RenderBlocks.tsx`

```tsx
// src/blocks/RenderBlocks.tsx
import { LeikskolagjaldComponent } from '@/blocks/Leikskolagjald/Component'

const blockComponents = {
  // … það sem fyrir er
  leikskolagjald: LeikskolagjaldComponent,
}
```

Lykillinn `leikskolagjald` verður að vera sá sami og `slug` í `config.ts`.

### 4. Búðu til týpur

```bash
pnpm payload generate:types
```

Þetta býr til `LeikskolagjaldBlock` í `payload-types.ts` (nafnið kemur úr
`interfaceName`), sem `Component.tsx` flytur inn.

### 5. Migration — aðeins ef Postgres er undir

Postgres-adapterinn býr til töflur fyrir nýjar blokkir, svo breytingin þarf
migration:

```bash
pnpm payload migrate:create leikskolagjald_block
pnpm payload migrate
```

MongoDB þarf ekkert af þessu.

## CSP

Ef framendinn keyrir með `Content-Security-Policy` þarf að hleypa
reiknivélinni í gegn, annars birtist tómur rammi:

```
frame-src https://reykjanesbaer.github.io;
```

## Hvað ritstjóri stillir

| Svið | Lýsing |
| --- | --- |
| Litaþema | Fylgir stillingum notanda (sjálfgefið), ljóst eða dökkt |
| Hornarúnnun | 0–32 px (sjálfgefið 16) |
| Sýna titil og tákn | Hausinn efst |
| Sýna sundurliðun fæðisgjalds | Reiturinn neðst |
| Sýna fyrirvara | Smáa letrið neðst |
| Sýna ramma og bakgrunn | Slökkt = gegnsætt, fellur inn í síðuna |
| Litir (lokað sjálfgefið) | Höfuðlitur, texti á höfuðlit og bakgrunnur í hvoru þema |
| Breidd | Tala + eining: 1–100 % eða 200–2000 px (sjálfgefið 100 %) |
| Hámarksbreidd | Tala + eining: 1–100 % eða 200–2000 px (sjálfgefið 672 px). Tómt = ekkert hámark |
| Staðsetning á síðu | Vinstri, miðja eða hægri |
| Sjálfgefin gildi (lokað sjálfgefið) | Fjöldi barna, flest börn í valmynd, klukkustundir, niðurgreitt |
| Gjaldskrárár | Tómt = virka árið. Ártal hér sýnir aðra gjaldskrá en þá sem er í gildi |

### Gjaldskráin er ekki í blokkinni

Verð eru hvergi í Payload. Þau eru gögn í `gjaldskra/<ár>.json` í repói
reiknivélarinnar og eru uppfærð þar einu sinni á ári — sjá kaflann
„Uppfærsla gjaldskrár“ í [README verkefnisins](../README.md). Þannig frjósa
verð ekki inni í gömlum síðum og allar innfellingar uppfærast í einu.

Reiturinn **Gjaldskrárár** er aðeins til að sýna aðra gjaldskrá en þá sem er
í gildi, t.d. næsta árs gjaldskrá á upplýsingasíðu áður en hún tekur gildi.
Sé hann tómur fylgir reiknivélin virka árinu sjálfkrafa.

### Litir

Reitirnir taka hex-lit með eða án `#`, t.d. `1D4D91`. Ógildur litur er
stöðvaður við vistun og tómur reitur þýðir sjálfgefinn lit. Aðeins litir sem
víkja frá sjálfgefnu fara í slóð reiknivélarinnar.

Reiknivélin sér sjálf um birtuskil: höfuðliturinn er notaður óbreyttur á
fleti (samtalsstikuna) en ljósaður eða dekkaður fyrir texta þar til hann nær
AA (4,5:1) á bakgrunni þemans.

### Breidd

Breidd og hámarksbreidd fara á `style` iframe-sins, ekki í slóð
reiknivélarinnar. Hámarksbreiddin er alltaf klemmd,
`max-width: min(<gildi>, 100%)` (eða `100%` ef ekkert hámark), svo
reiknivélin flæðir aldrei út fyrir á síma.

## Hæð

Ólíkt breidd ræðst hæð reiknivélarinnar af innihaldinu: fjölda barna og því
hvort titill, sundurliðun og fyrirvari eru sýnd. `Component.tsx` reiknar
hana með sömu gildum og `hydur()` í
[`reiknivel/config.js`](../reiknivel/config.js).

Hæðin er ágiskun: á mjóum skjá vefst texti í fleiri línur og reiknivélin
verður hærri. Ágiskunin er vísvitandi höfð ívið rúm svo ekkert klippist af.
Nákvæm hæð krefst skilaboða frá iframe-inum (`embed.js` gerir það), en þá
þyrfti íhluturinn JavaScript í vafra.

Breytist útlit reiknivélarinnar þarf að uppfæra gildin í `H` í
`Component.tsx` og í `config.js`.

## Af hverju ekki `embed.js`?

Skriftan `embed.js` í rót verkefnisins gerir sama gagn á venjulegum
vefsíðum, en hún virkar ekki inni í React:

- Skriftur sem React setur inn (t.d. gegnum `dangerouslySetInnerHTML`) eru
  ekki keyrðar af vafranum.
- `document.currentScript` er `null` þegar skrifta er sett inn eftir á, svo
  `embed.js` fyndi ekki staðinn til að setja iframe-inn á.
