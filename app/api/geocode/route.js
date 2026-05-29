import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    // Photon by Komoot (Built on Nominatim but with fuzzy ElasticSearch for typos)
    // Bounding Box limits search strictly to Israel/Palestine (minLon,minLat,maxLon,maxLat)
    const bbox = '34.0,29.4,35.9,33.4';
    // Force the search engine to ONLY return actual cities, towns, and villages, completely ignoring identically named streets
    const tags = '&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village';
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=${bbox}${tags}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'ar,he,en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding provider error' }, { status: response.status });
    }

    const data = await response.json();
    
    // Convert GeoJSON from Photon into the {lat, lon} format our frontend expects
    let formattedData = [];
    if (data.features && data.features.length > 0) {
      formattedData = [{
        lat: data.features[0].geometry.coordinates[1],
        lon: data.features[0].geometry.coordinates[0]
      }];
    }
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Server-side geocoding error:", error);
    return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
  }
}
