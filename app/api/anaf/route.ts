import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cui } = body;

    if (!cui) {
      return NextResponse.json({ success: false, error: 'CUI-ul este obligatoriu' }, { status: 400 });
    }

    // Curățăm CUI-ul de caractere non-numerice (ex: eliminăm 'RO', spații, cratime)
    const cleanCui = cui.toString().replace(/[^0-9]/g, '');

    // ANAF cere data curentă în format YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Construim payload-ul exact în formatul strict cerut de ANAF v8
    const anafPayload = [
      {
        cui: parseInt(cleanCui, 10),
        data: dateStr
      }
    ];

    // Apelăm endpoint-ul public ANAF (fără autentificare OAuth)
    const response = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(anafPayload),
    });

    if (!response.ok) {
      throw new Error(`Eroare de la serverul ANAF: ${response.status}`);
    }

    const data = await response.json();

    // Verificăm dacă ANAF a găsit firma
    if (data.cod === 200 && data.found && data.found.length > 0) {
      const companyData = data.found[0];

      // Returnăm datele curățate către frontend-ul Limeeo
      return NextResponse.json({
        success: true,
        data: {
          denumire: companyData.denumire,
          adresa: companyData.adresa,
          nrRegCom: companyData.nrRegCom,
          platitorTva: companyData.scpTVA,
          stare: companyData.stare_inregistrare
        }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Firma nu a fost găsită la ANAF.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Eroare ANAF API:', error);
    return NextResponse.json({ success: false, error: 'Eroare internă la procesarea datelor ANAF.' }, { status: 500 });
  }
}
