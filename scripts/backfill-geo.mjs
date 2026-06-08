// One-off backfill: geocode existing active orders that have no stored `geo`,
// and write {lat,lng} onto each order (so the admin map shows precise pins).
//
//   node scripts/backfill-geo.mjs
//
// Reads FIREBASE_SERVICE_ACCOUNT_KEY from .env.local. Safe to re-run: orders
// that already have `geo` are skipped, and geocoding results are cached in the
// shared `geocache` collection.
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

// --- Load FIREBASE_SERVICE_ACCOUNT_KEY from .env.local (no dotenv dependency). ---
function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const re = new RegExp(`^${name}=(.*)$`, 'm');
  const m = raw.match(re);
  if (!m) throw new Error(`${name} not found in .env.local`);
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

const serviceAccount = JSON.parse(loadEnvKey('FIREBASE_SERVICE_ACCOUNT_KEY'));
if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BBOX = '34.0,29.4,35.9,33.4';
const cacheId = (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, ' ')).slice(0, 300);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isActive = (s) => !!s && (s.includes('قيد المعالجة') || s === 'جاري التوصيل');

async function photon(query, cityOnly = false) {
  const tags = cityOnly ? '&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village' : '';
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${BBOX}${tags}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ar,he,en', 'User-Agent': 'JilbabStore/1.0 (backfill)' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.features?.length) { const c = data.features[0].geometry.coordinates; return { lat: c[1], lng: c[0] }; }
  return null;
}

async function geocode({ city, address, neighborhood, street }) {
  const full = [city, neighborhood, street, address].filter(Boolean).join(', ');
  const key = full || city;
  if (!key) return null;
  const ref = db.collection('geocache').doc(cacheId(key));
  const snap = await ref.get();
  if (snap.exists) { const d = snap.data(); return d.notFound ? null : { lat: d.lat, lng: d.lng }; }
  let geo = await photon(full).catch(() => null);
  if (!geo && city) geo = await photon(city, true).catch(() => null);
  await ref.set(geo ? { ...geo, at: new Date().toISOString() } : { notFound: true, at: new Date().toISOString() });
  await sleep(1100); // be polite to the public Photon endpoint
  return geo;
}

const snap = await db.collection('orders').get();
let done = 0, skipped = 0, failed = 0;
for (const doc of snap.docs) {
  const o = doc.data();
  if (o.geo && Number.isFinite(o.geo.lat)) { skipped++; continue; }
  if (!isActive(o.status)) { skipped++; continue; }
  const a = o.shipping || o.customerInfo || {};
  const geo = await geocode({ city: a.city, address: a.address, neighborhood: a.neighborhood, street: a.street });
  if (geo) { await doc.ref.update({ geo }); done++; console.log(`✓ ${doc.id.slice(0, 8)} → ${geo.lat.toFixed(4)},${geo.lng.toFixed(4)} (${a.city || ''})`); }
  else { failed++; console.log(`✗ ${doc.id.slice(0, 8)} — could not geocode (${a.city || 'no city'})`); }
}
console.log(`\nDone. geocoded=${done}, skipped=${skipped}, failed=${failed}, total=${snap.size}`);
process.exit(0);
