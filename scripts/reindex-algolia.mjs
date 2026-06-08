// One-off: re-index all products to Algolia with the new localized fields
// (title_en/title_he/description_en/description_he) so Hebrew/English search works.
//
//   node scripts/reindex-algolia.mjs
//
// Reads ALGOLIA + FIREBASE keys from .env.local.
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { algoliasearch } from 'algoliasearch';

function envVal(name) {
  if (process.env[name]) return process.env[name];
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!m) throw new Error(`${name} not found in .env.local`);
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

const sa = JSON.parse(envVal('FIREBASE_SERVICE_ACCOUNT_KEY'));
if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const client = algoliasearch(envVal('NEXT_PUBLIC_ALGOLIA_APP_ID'), envVal('ALGOLIA_WRITE_KEY'));
const INDEX = 'products';

const rec = (p) => ({
  objectID: p.id,
  title: p.title, title_en: p.title_en || '', title_he: p.title_he || '',
  description: p.description || '', description_en: p.description_en || '', description_he: p.description_he || '',
  category: p.category || '', sectionId: p.sectionId || '', subsectionId: p.subsectionId || '',
  price: Number(p.price) || 0, image: (p.images && p.images[0]) || p.image || '',
  skus: (p.variants || []).map(v => v.sku).filter(Boolean),
  sizes: (p.variants || []).map(v => v.size).filter(Boolean),
  colors: (p.colors || []).map(c => c.name).filter(Boolean),
});

const snap = await db.collection('products').get();
const objects = snap.docs.map(d => rec({ id: d.id, ...d.data() }));

await client.setSettings({
  indexName: INDEX,
  indexSettings: {
    searchableAttributes: ['title', 'title_en', 'title_he', 'category', 'colors', 'sizes', 'skus', 'description', 'description_en', 'description_he'],
    attributesForFaceting: ['category', 'sectionId', 'subsectionId'],
  },
});
if (objects.length) await client.saveObjects({ indexName: INDEX, objects });
console.log(`Re-indexed ${objects.length} products to Algolia '${INDEX}' with HE/EN fields.`);
process.exit(0);
