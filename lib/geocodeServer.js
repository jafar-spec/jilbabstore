import { adminDb } from '@/lib/firebaseAdmin';

// Server-side geocoder with a SHARED Firestore cache (geocache collection), so
// coordinates are computed once and reused across all admins/orders. Geocodes
// the FULL address (not just the city) for precise delivery pins, falling back
// to the city if the full address can't be resolved.
const BBOX = '34.0,29.4,35.9,33.4'; // Israel/Palestine bounds
const cacheId = (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, ' ')).slice(0, 300);

async function photon(query, cityOnly = false) {
  const tags = cityOnly ? '&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village' : '';
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${BBOX}${tags}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ar,he,en', 'User-Agent': 'JilbabStore/1.0 (delivery map)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.features?.length) {
    const c = data.features[0].geometry.coordinates;
    return { lat: c[1], lng: c[0] };
  }
  return null;
}

// Geocode { city, address/neighborhood/street } → {lat,lng} (cached).
export async function serverGeocode({ city, address, neighborhood, street } = {}) {
  if (!adminDb) return null;
  const full = [city, neighborhood, street, address].filter(Boolean).join(', ');
  const key = full || city;
  if (!key) return null;

  const ref = adminDb.collection('geocache').doc(cacheId(key));
  try {
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      return d.notFound ? (city ? serverGeocodeCity(city) : null) : { lat: d.lat, lng: d.lng };
    }
    // Try the full address first (precise), then fall back to city-only.
    let geo = await photon(full).catch(() => null);
    if (!geo && city) geo = await photon(city, true).catch(() => null);
    if (geo) {
      await ref.set({ ...geo, at: new Date().toISOString() }).catch(() => {});
      return geo;
    }
    await ref.set({ notFound: true, at: new Date().toISOString() }).catch(() => {});
    return null;
  } catch (e) {
    console.error('serverGeocode failed:', e?.message);
    return null;
  }
}

async function serverGeocodeCity(city) {
  const ref = adminDb.collection('geocache').doc(cacheId(city));
  const snap = await ref.get().catch(() => null);
  if (snap?.exists && !snap.data().notFound) return { lat: snap.data().lat, lng: snap.data().lng };
  const geo = await photon(city, true).catch(() => null);
  if (geo) await ref.set({ ...geo, at: new Date().toISOString() }).catch(() => {});
  return geo;
}
