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

    // Răspunsul este un obiect direct, mapăm câmpurile necesare
    return NextResponse.json({
      success: true,
      data: {
        denumire: data.name || '',
        adresa: data.address || '',
        nrRegCom: data.registration_number || '',
        platitorTva: data.vat ? 'DA' : 'NU',
        stare: data.state || 'Activ'
      }
    });

  } catch (error: unknown) {
    console.error('Eroare la interogarea OpenAPI:', error);
    return NextResponse.json({ success: false, error: 'Eroare internă la preluarea datelor.' }, { status: 500 });
  }
}
