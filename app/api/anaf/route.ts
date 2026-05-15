import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cui } = body;

    if (!cui) {
      return NextResponse.json({ success: false, error: 'CUI-ul este obligatoriu.' }, { status: 400 });
    }

    // Păstrăm doar cifrele
    const cleanCui = cui.toString().replace(/[^0-9]/g, '');

    if (!process.env.OPENAPI_KEY) {
      console.error('Lipsește OPENAPI_KEY din .env.local');
      return NextResponse.json({ success: false, error: 'Eroare de configurare server.' }, { status: 500 });
    }

    // Facem request-ul către OpenAPI
    const response = await fetch(`https://api.openapi.ro/api/companies/${cleanCui}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.OPENAPI_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // OpenAPI returnează 404 dacă firma nu există
      if (response.status === 404) {
        return NextResponse.json({ success: false, error: 'Firma nu a fost găsită.' }, { status: 404 });
      }
      throw new Error(`Eroare de la serverul OpenAPI: ${response.status}`);
    }

    const data = await response.json();

    // Derivăm localitate din câmpul judet (ex: "Municipiul București" → "București")
    const judetRaw: string = data.judet || '';
    const county = judetRaw.replace(/^Municipiul\s+/i, '').replace(/^Județul\s+/i, '').trim();
    // Pentru localitate încercăm să extragem din adresă sau folosim județul simplificat
    let city = county;
    if (data.adresa) {
      const parts = (data.adresa as string).split(',').map((p: string) => p.trim());
      // Căutăm un segment care arată a localitate (nu stradă, nu număr, nu sector)
      for (const part of parts) {
        if (
          !/^(Str|Bd|Bdul|Calea|Sos|Aleea|Nr|Bl|Sc|Ap|Et|Lot|Sect)/i.test(part) &&
          !/^\d/.test(part) &&
          part.length > 2 &&
          part !== judetRaw
        ) {
          city = part;
          break;
        }
      }
    }

    // Răspunsul openapi.ro folosește câmpuri în română
    return NextResponse.json({
      success: true,
      data: {
        denumire: data.denumire || '',
        adresa: data.adresa || '',
        nrRegCom: data.numar_reg_com || '',
        platitorTva: data.tva ? 'DA' : 'NU',
        stare: data.stare || 'Activ',
        localitate: city,
        judet: county,
      }
    });

  } catch (error: unknown) {
    console.error('Eroare la interogarea OpenAPI:', error);
    return NextResponse.json({ success: false, error: 'Eroare internă la preluarea datelor.' }, { status: 500 });
  }
}
