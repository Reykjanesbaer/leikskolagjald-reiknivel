import React from 'react'
import type { LeikskolagjaldBlock } from '@/payload-types'

const CALC_URL = 'https://reykjanesbaer.github.io/leikskolagjald-reiknivel/'

/*
 * Hæð reiknivélarinnar ræðst af innihaldinu, ekki breiddinni, svo hún er
 * reiknuð úr stillingunum með sömu gildum og hydur() í
 * reiknivel/config.js. Breytist útlit reiknivélarinnar þarf að uppfæra
 * bæði. Gildin eru mæld á skjá breiðari en 40rem; á mjóum skjá vefst texti
 * í fleiri línur, svo hæðin er alltaf ágiskun (iframe án JavaScript getur
 * ekki tekið við skilaboðum um rétta hæð).
 */
const H = {
  pad: 64,
  title: 54,
  fields: 251,
  resultsHead: 88,
  child: 151,
  sibling: 25,
  total: 81,
  foodBase: 87,
  foodLine: 22,
  note: 65,
  slaki: 4,
}

/* Sundurliðun fæðisgjalds er þrjár línur í gjaldskrá 2026 */
const FAEDISLINUR = 3

function hydur(o: {
  synaTitil: boolean
  synaFaedi: boolean
  synaFyrirvara: boolean
  born: number
}): number {
  const b = Math.max(1, Math.min(10, Math.round(o.born)))
  let h = H.pad + H.fields + H.resultsHead + H.total + H.slaki
  if (o.synaTitil) h += H.title
  h += b * H.child + Math.max(0, b - 1) * H.sibling
  if (o.synaFaedi) h += H.foodBase + FAEDISLINUR * H.foodLine
  if (o.synaFyrirvara) h += H.note
  return h
}

function margins(
  stadsetning: string,
): Pick<React.CSSProperties, 'marginLeft' | 'marginRight'> {
  if (stadsetning === 'center') return { marginLeft: 'auto', marginRight: 'auto' }
  if (stadsetning === 'right') return { marginLeft: 'auto', marginRight: 0 }
  return { marginLeft: 0, marginRight: 'auto' }
}

/* Sama regla og parseColor í reiknivel/config.js; ógilt → null */
function parseColor(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().replace(/^(#|%23)/i, '')
  return /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null
}

/* Sömu mörk og parseSize í reiknivel/config.js; ógilt → null */
function parseSize(n: number | null | undefined, unit: string | null | undefined): string | null {
  if (typeof n !== 'number') return null
  const u = unit === '%' ? '%' : 'px'
  const [min, max] = u === '%' ? [1, 100] : [200, 2000]
  return n >= min && n <= max ? `${n}${u}` : null
}

function inRange(n: number | null | undefined, min: number, max: number, def: number): number {
  return typeof n === 'number' && n >= min && n <= max ? n : def
}

/*
 * Athugið: embed.js er vísvitandi EKKI notuð hér. Skriftur sem React setur
 * inn keyra ekki, og document.currentScript er null þegar skrifta er sett
 * inn eftir á. Iframe-inn er því búinn til beint og íhluturinn er hreinn
 * server-íhlutur án JavaScript í vafra.
 */
export const LeikskolagjaldComponent: React.FC<LeikskolagjaldBlock> = ({
  thema = 'auto',
  hornarunnun,
  synaTitil = true,
  synaFaedi = true,
  synaFyrirvara = true,
  synaRamma = true,
  accent,
  onaccent,
  bg,
  bgdark,
  breidd,
  breiddEining,
  hamarksbreidd,
  hamarksbreiddEining,
  stadsetning = 'left',
  fjoldiBarna,
  flestBorn,
  klukkustundir,
  nidurgreitt,
  ar,
}) => {
  const radius = inRange(hornarunnun, 0, 32, 16)
  const flest = inRange(flestBorn, 1, 10, 5)
  const born = Math.min(inRange(fjoldiBarna, 1, 10, 1), flest)
  const klst = inRange(klukkustundir, 0, 24, 4)

  /*
   * Breidd iframe-sins; max-width alltaf klemmt við 100% (flæðir ekki út á
   * síma). null = ritstjóri tæmdi reitinn (ekkert hámark); undefined = eldra
   * efni án reitsins (sjálfgefið 672px).
   */
  const width = parseSize(breidd, breiddEining) ?? '100%'
  const maxWidth =
    hamarksbreidd === null
      ? '100%'
      : `min(${parseSize(hamarksbreidd, hamarksbreiddEining) ?? '672px'}, 100%)`

  /* Aðeins það sem víkur frá sjálfgefnu fer í slóðina */
  const params = new URLSearchParams()
  if (thema && thema !== 'auto') params.set('theme', thema)
  if (radius !== 16) params.set('radius', String(radius))
  if (synaTitil === false) params.set('title', '0')
  if (synaFaedi === false) params.set('food', '0')
  if (synaFyrirvara === false) params.set('note', '0')
  if (synaRamma === false) params.set('frame', '0')
  if (born !== 1) params.set('dchildren', String(born))
  if (klst !== 4) params.set('dhours', String(klst))
  if (nidurgreitt) params.set('dsub', '1')
  if (flest !== 5) params.set('maxchildren', String(flest))

  const litir: Record<string, string | null | undefined> = { accent, onaccent, bg, bgdark }
  const sjalfgefid: Record<string, string> = { accent: '1D4D91', onaccent: 'FFFFFF' }
  for (const key of ['accent', 'onaccent', 'bg', 'bgdark']) {
    const c = parseColor(litir[key])
    if (c && c !== sjalfgefid[key]) params.set(key, c)
  }

  if (ar && /^\d{4}$/.test(ar.trim())) params.set('ar', ar.trim())

  const query = params.toString()

  return (
    <iframe
      src={CALC_URL + (query ? `?${query}` : '')}
      title="Leikskólagjald reiknivél"
      loading="lazy"
      scrolling="no"
      style={{
        display: 'block',
        width,
        maxWidth,
        height: hydur({
          synaTitil: synaTitil !== false,
          synaFaedi: synaFaedi !== false,
          synaFyrirvara: synaFyrirvara !== false,
          born,
        }),
        border: 0,
        overflow: 'hidden',
        colorScheme: 'normal',
        ...margins(stadsetning ?? 'left'),
      }}
    />
  )
}

export default LeikskolagjaldComponent
