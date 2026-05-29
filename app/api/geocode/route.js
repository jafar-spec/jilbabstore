import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&email=jafar.01.salama@gmail.com`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JilbabStoreApp/1.0 (jafar.01.salama@gmail.com)',
        'Accept-Language': 'ar,he,en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding provider error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Server-side geocoding error:", error);
    return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
  }
}
