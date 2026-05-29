# Leikskólagjald reiknivél

Reiknivél fyrir áætlaðan útreikning leikskólagjalda hjá Reykjanesbæ.

## GitHub Pages

Reiknivélin er hýst með GitHub Pages:

https://reykjanesbaer.github.io/leikskolagjald-reiknivel/

## Innfelling

Nota má eftirfarandi iframe-kóða til að fella reiknivélina inn í vef:

```html
<iframe
  src="https://reykjanesbaer.github.io/leikskolagjald-reiknivel/"
  title="Leikskólagjald Reiknivél"
  style="width: 100%; height: 1000px; border: 0;"
></iframe>
```

Ef vefumsjónarkerfið styður sérsniðinn JavaScript-kóða má nota resize-scriptið í `embed-code.html` til að aðlaga hæð iframe eftir efni reiknivélarinnar.

## Content Security Policy

Ef reiknivélin birtist ekki í iframe á Payload/Vercel vefnum þarf að leyfa GitHub Pages slóðina í `frame-src` í CSP headers:

```text
https://reykjanesbaer.github.io
```

Dæmi:

```text
frame-src 'self' ... forms.office.com https://reykjanesbaer.github.io;
```

Þetta er líklega stillt í frontend/deployment config, til dæmis `next.config.js`, `middleware.ts`, `vercel.json` eða server headers.

## Uppruni

Verkefnið byggir á eldri HTML reiknivél sem var vistuð undir:

https://www.reykjanesbaer.is/static/files/vef/calc-leikskolar/reiknivelin_026.html

## Tilgangur

Markmiðið er að varðveita kóða reiknivélarinnar í GitHub svo hægt sé að rekja breytingar, viðhalda útgáfum og þróa lausnina áfram með skýrari hætti.

## Umsjón

Reykjanesbær — vefstjórn / stafrænar lausnir.
