import { NextRequest, NextResponse } from 'next/server'

interface AnafDateGenerale {
  denumire?: string
  adresa?: string
  nrRegCom?: string
  cui?: number
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
function parseCityCounty(adresa: string): { city: string; county: string } {
  const parts = adresa.split(',').map(p => p.trim())
  let city = ''
  let county = ''

  for (const part of parts) {
    const upper = part.toUpperCase()

    if (upper.startsWith('JUD.') || upper.startsWith('JUDET') || upper.startsWith('JUDEȚUL')) {
      county = part.replace(/^JUD(ET|EȚUL)?\.?\s*/i, '').trim()
      county = county.charAt(0).toUpperCase() + county.slice(1).toLowerCase()
      continue
    }

    if (/^SECTOR\s+\d/i.test(upper)) {
      city = 'București'
      county = 'București'
      continue
    }

    if (
      !upper.startsWith('STR') && !upper.startsWith('BD') &&
      !upper.startsWith('BDUL') && !upper.startsWith('CALEA') &&
      !upper.startsWith('NR.') && !upper.startsWith('BL.') &&
      !upper.startsWith('SC.') && !upper.startsWith('AP.') &&
      !upper.startsWith('ET.') && !upper.match(/^\d/) &&
      part.length > 2
    ) {
      city = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }
  }

  return { city, county }
}

// Fetch cu timeout manual (compatibil cu toate versiunile Node.js)
async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawCui: string = String(body.cui ?? '').trim()

    if (!rawCui) {
      return NextResponse.json({ error: 'CUI lipsă.' }, { status: 400 })
    }

    // Curăță prefix RO și spații, convertim la număr
    const cuiNumber = parseInt(rawCui.replace(/^RO\s*/i, '').replace(/[\s\-]/g, ''), 10)
    if (isNaN(cuiNumber) || cuiNumber <= 0) {
      return NextResponse.json(
        { error: 'CUI invalid. Introduceți doar cifre (ex: 12345678 sau RO12345678).' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const ANAF_URL = 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva'

    let anafRes: Response
    try {
      anafRes = await fetchWithTimeout(
        ANAF_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify([{ cui: cuiNumber, data: today }]),
        },
        10000 // 10 secunde
      )
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      const isTimeout = msg.includes('abort') || msg.includes('timeout')
      return NextResponse.json(
        { error: isTimeout ? 'Timeout — ANAF nu a răspuns în 10 secunde. Încearcă din nou.' : `Nu s-a putut conecta la ANAF: ${msg}` },
        { status: 504 }
      )
    }

    if (!anafRes.ok) {
      const errText = await anafRes.text().catch(() => '')
      console.error('[anaf-lookup] HTTP error', anafRes.status, errText)
      return NextResponse.json(
        { error: `Serviciul ANAF a returnat eroare ${anafRes.status}. Încearcă din nou mai târziu.` },
        { status: 502 }
      )
    }

    let anafData: AnafResponse
    try {
      anafData = await anafRes.json()
    } catch {
      return NextResponse.json(
        { error: 'Răspuns invalid de la ANAF. Încearcă din nou.' },
        { status: 502 }
      )
    }

    if (!anafData.found?.length) {
      return NextResponse.json(
        { error: `CUI-ul ${cuiNumber} nu a fost găsit în baza de date ANAF.` },
        { status: 404 }
      )
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
    console.error('[anaf-lookup] Unexpected error:', err)
    return NextResponse.json({ error: 'Eroare internă neașteptată.' }, { status: 500 })
  }
}
