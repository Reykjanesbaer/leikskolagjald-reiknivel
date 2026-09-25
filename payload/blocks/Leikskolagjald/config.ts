import type { Block, TextField } from 'payload'

/**
 * Leikskólagjald — fellir leikskólagjaldareiknivélina inn á síðu.
 *
 * Reiknivélin sjálf er hýst á GitHub Pages og birtist í iframe, svo hún
 * dregur engar dependencies inn í Payload-verkefnið. Sjá payload/README.md.
 *
 * Gjaldskrártölur eru hvergi hér: þær eru gögn í gjaldskra/<ár>.json í
 * repói reiknivélarinnar. Ritstjóri getur í mesta lagi valið árið.
 */
const UNITS = [
  { label: '%', value: '%' },
  { label: 'px', value: 'px' },
]

/* Sömu mörk og parseSize í reiknivel/config.js */
function sizeValidate(unitField: string, optional: boolean) {
  return (
    value: number | null | undefined,
    { siblingData }: { siblingData: Record<string, unknown> },
  ) => {
    if (value === null || value === undefined) {
      return optional ? true : 'Settu inn breidd.'
    }
    const unit = siblingData?.[unitField] === '%' ? '%' : 'px'
    const [min, max] = unit === '%' ? [1, 100] : [200, 2000]
    return value >= min && value <= max ? true : `Gildið verður að vera ${min}–${max} ${unit}.`
  }
}

/* Valfrjáls hex-litur; tómt = sjálfgefinn litur reiknivélarinnar */
function colorField(name: string, label: string, placeholder: string): TextField {
  return {
    name,
    type: 'text',
    label,
    admin: { placeholder, width: '50%' },
    validate: (value: string | null | undefined) => {
      if (!value) return true
      return /^#?[0-9A-Fa-f]{6}$/.test(value.trim()) ? true : 'Hex-litur, t.d. 1D4D91'
    },
  }
}

export const Leikskolagjald: Block = {
  slug: 'leikskolagjald',
  interfaceName: 'LeikskolagjaldBlock',
  labels: {
    singular: 'Leikskólagjald reiknivél',
    plural: 'Leikskólagjald reiknivélar',
  },
  fields: [
    {
      name: 'thema',
      type: 'select',
      label: 'Litaþema',
      defaultValue: 'auto',
      options: [
        { label: 'Fylgir stillingum notanda', value: 'auto' },
        { label: 'Ljóst', value: 'light' },
        { label: 'Dökkt', value: 'dark' },
      ],
    },
    {
      name: 'hornarunnun',
      type: 'number',
      label: 'Hornarúnnun (px)',
      defaultValue: 16,
      min: 0,
      max: 32,
    },
    { name: 'synaTitil', type: 'checkbox', label: 'Sýna titil og tákn', defaultValue: true },
    {
      name: 'synaFaedi',
      type: 'checkbox',
      label: 'Sýna sundurliðun fæðisgjalds',
      defaultValue: true,
    },
    { name: 'synaFyrirvara', type: 'checkbox', label: 'Sýna fyrirvara', defaultValue: true },
    {
      name: 'synaRamma',
      type: 'checkbox',
      label: 'Sýna ramma og bakgrunn',
      defaultValue: true,
      admin: { description: 'Slökkt = gegnsætt, fellur inn í síðuna.' },
    },
    {
      type: 'collapsible',
      label: 'Litir',
      admin: {
        initCollapsed: true,
        description:
          'Hex-litur án #, t.d. 1D4D91. Tómt = sjálfgefinn litur. ' +
          'Reiknivélin ljósar höfuðlitinn sjálf fyrir smáan texta í dökku þema svo birtuskil nái AA.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            colorField('accent', 'Höfuðlitur', '1D4D91'),
            colorField('onaccent', 'Texti á höfuðlit', 'FFFFFF'),
          ],
        },
        {
          type: 'row',
          fields: [
            colorField('bg', 'Bakgrunnur (ljóst þema)', 'FFFFFF'),
            colorField('bgdark', 'Bakgrunnur (dökkt þema)', '1B2024'),
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'breidd',
          type: 'number',
          label: 'Breidd',
          defaultValue: 100,
          validate: sizeValidate('breiddEining', false),
          admin: { width: '60%', description: '1–100 % eða 200–2000 px' },
        },
        {
          name: 'breiddEining',
          type: 'select',
          label: 'Eining',
          defaultValue: '%',
          options: UNITS,
          admin: { width: '40%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'hamarksbreidd',
          type: 'number',
          label: 'Hámarksbreidd',
          defaultValue: 672,
          validate: sizeValidate('hamarksbreiddEining', true),
          admin: {
            width: '60%',
            description: '1–100 % eða 200–2000 px. Tómt = ekkert hámark.',
          },
        },
        {
          name: 'hamarksbreiddEining',
          type: 'select',
          label: 'Eining',
          defaultValue: 'px',
          options: UNITS,
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'stadsetning',
      type: 'radio',
      label: 'Staðsetning á síðu',
      defaultValue: 'left',
      options: [
        { label: 'Vinstri', value: 'left' },
        { label: 'Miðja', value: 'center' },
        { label: 'Hægri', value: 'right' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      type: 'collapsible',
      label: 'Sjálfgefin gildi',
      admin: {
        initCollapsed: true,
        description: 'Hvernig reiknivélin stendur þegar gestur opnar síðuna.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'fjoldiBarna',
              type: 'number',
              label: 'Fjöldi barna',
              defaultValue: 1,
              min: 1,
              max: 10,
              admin: { width: '50%' },
            },
            {
              name: 'flestBorn',
              type: 'number',
              label: 'Flest börn í valmynd',
              defaultValue: 5,
              min: 1,
              max: 10,
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'klukkustundir',
          type: 'number',
          label: 'Klukkustundir á dag',
          defaultValue: 4,
          min: 0,
          max: 24,
          admin: {
            step: 0.5,
            description: 'Verður að vera eitt af gildunum í gjaldskránni, t.d. 4, 4,5 … 8,5.',
          },
        },
        {
          name: 'nidurgreitt',
          type: 'checkbox',
          label: 'Niðurgreitt sjálfgefið hakað',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'ar',
      type: 'text',
      label: 'Gjaldskrárár',
      admin: {
        placeholder: 'virka árið',
        description:
          'Tómt = virka árið í gjaldskra/index.json. Settu ártal hér aðeins til að ' +
          'sýna aðra gjaldskrá en þá sem er í gildi.',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        return /^\d{4}$/.test(value.trim()) ? true : 'Fjögurra stafa ártal, t.d. 2026'
      },
    },
  ],
}
