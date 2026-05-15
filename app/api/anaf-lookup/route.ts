import { NextRequest, NextResponse } from 'next/server'

interface AnafDateGenerale {
  denumire?: string
  adresa?: string
  nrRegCom?: string
  cui?: number
  codPostal?: string
}

interface AnafInregistrareScop {
  scpTVA?: boolean
}

interface AnafFoundItem {
  date_generale?: AnafDateGenerale
  inregistrare_scop_Tva?: AnafInregistrareScop
}

interface AnafResponse {
  cod?: number
  message?: string
  found?: AnafFoundItem[]
  notFound?: number[]
}

// Extrage județul și orașul din șirul de adresă ANAF
// Format tipic: "STR. X NR. 1, LOCALITATE, JUD. CLUJ" sau "STR. X, SECTOR 1, BUCURESTI"
function parseCityCounty(adresa: string): { city: string; county: string } {
  const parts = adresa.split(',').map(p => p.trim())

  let city = ''
  let county = ''

  for (const part of parts) {
    const upper = part.toUpperCase()

    // Detectează județul
    if (upper.startsWith('JUD.') || upper.startsWith('JUDET') || upper.startsWith('JUDEȚUL')) {
      county = part.replace(/^JUD(ET|EȚUL)?\.?\s*/i, '').trim()
      county = county.charAt(0).toUpperCase() + county.slice(1).toLowerCase()
      continue
    }

    // Detectează sectorul București
    if (/^SECTOR\s+\d/i.test(upper)) {
      city = 'București'
      county = 'București'
      continue
    }

    // Ultima componentă care nu e o stradă sau nr. e de obicei orașul
    if (
      !upper.startsWith('STR') &&
      !upper.startsWith('BD') &&
      !upper.startsWith('BDUL') &&
      !upper.startsWith('CALEA') &&
      !upper.startsWith('NR.') &&
      !upper.startsWith('BL.') &&
      !upper.startsWith('SC.') &&
      !upper.startsWith('AP.') &&
      !upper.startsWith('ET.') &&
      !upper.match(/^\d/) &&
      part.length > 2
    ) {
      // Ultimul candidat valid = localitate
      city = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }
  }

  return { city, county }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawCui: string = String(body.cui ?? '').trim()

    if (!rawCui) {
      return NextResponse.json({ error: 'CUI lipsă.' }, { status: 400 })
    }

    // Curăță prefix RO și spații, convertim la număr
    const cuiNumber = parseInt(rawCui.replace(/^RO\s*/i, '').replace(/\s/g, ''), 10)
    if (isNaN(cuiNumber) || cuiNumber <= 0) {
      return NextResponse.json({ error: 'CUI invalid. Introduceți doar cifre (ex: 12345678 sau RO12345678).' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const anafRes = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cui: cuiNumber, data: today }]),
      // Timeout de 8 secunde
      signal: AbortSignal.timeout(8000),
    })

    if (!anafRes.ok) {
      return NextResponse.json(
        { error: `Serviciul ANAF nu este disponibil (${anafRes.status}). Încearcă din nou.` },
        { status: 502 }
      )
    }

    const anafData: AnafResponse = await anafRes.json()

    if (!anafData.found?.length) {
      return NextResponse.json({ error: 'CUI-ul nu a fost găsit în baza de date ANAF.' }, { status: 404 })
    }

    const item = anafData.found[0]
    const dg = item.date_generale ?? {}
    const scpTVA = item.inregistrare_scop_Tva?.scpTVA ?? false

    const adresa = dg.adresa ?? ''
    const { city, county } = parseCityCounty(adresa)

    return NextResponse.json({
      denumire: dg.denumire ?? '',
      adresa,
      nrRegCom: dg.nrRegCom ?? '',
      scpTVA,
      city,
      county,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Timeout — ANAF nu a răspuns în 8 secunde. Încearcă din nou.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Eroare internă.' }, { status: 500 })
  }
}
