import { NextResponse } from 'next/server';
import { algoliasearch } from 'algoliasearch';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { ALGOLIA_INDEX, toAlgoliaRecord } from '@/lib/algolia';

// Server-side Algolia indexing (uses the WRITE key — never exposed to clients).
// Requires an authenticated operator/admin.

const writeClient = () => {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const key = process.env.ALGOLIA_WRITE_KEY;
  if (!appId || !key) return null;
  return algoliasearch(appId, key);
};

async function requireAdmin(req) {
  if (!adminAuth || !adminDb) return { error: 'Server not configured', status: 500 };
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(h.split('Bearer ')[1]);
    const snap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!snap.exists || snap.data().role === 'courier') return { error: 'Forbidden', status: 403 };
    return { uid: decoded.uid };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

// Upsert one product, or reindex everything when { all: true }.
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const client = writeClient();
  if (!client) return NextResponse.json({ error: 'Algolia not configured' }, { status: 500 });

  const body = await req.json().catch(() => ({}));

  try {
    if (body.all) {
      const snap = await adminDb.collection('products').get();
      const objects = snap.docs.map(d => toAlgoliaRecord({ id: d.id, ...d.data() }));
      await client.setSettings({
        indexName: ALGOLIA_INDEX,
        indexSettings: {
          searchableAttributes: ['title', 'title_en', 'title_he', 'category', 'colors', 'sizes', 'skus', 'description', 'description_en', 'description_he'],
          attributesForFaceting: ['category', 'sectionId', 'subsectionId'],
        },
      }).catch(() => {});
      if (objects.length) await client.saveObjects({ indexName: ALGOLIA_INDEX, objects });
      return NextResponse.json({ success: true, indexed: objects.length });
    }
    if (body.product) {
      await client.saveObjects({ indexName: ALGOLIA_INDEX, objects: [toAlgoliaRecord(body.product)] });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Nothing to index' }, { status: 400 });
  } catch (e) {
    console.error('Algolia index error', e);
    return NextResponse.json({ error: e.message || 'Index failed' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const client = writeClient();
  if (!client) return NextResponse.json({ error: 'Algolia not configured' }, { status: 500 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await client.deleteObject({ indexName: ALGOLIA_INDEX, objectID: id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
