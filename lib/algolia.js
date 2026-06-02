import { algoliasearch } from 'algoliasearch';

export const ALGOLIA_INDEX = 'products';

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

export const algoliaEnabled = !!(APP_ID && SEARCH_KEY);

// Read-only client (search key) — safe in the browser.
let _searchClient = null;
const searchClient = () => {
  if (!algoliaEnabled) return null;
  if (!_searchClient) _searchClient = algoliasearch(APP_ID, SEARCH_KEY);
  return _searchClient;
};

// Return ordered product objectIDs matching the query (typo-tolerant).
export async function searchProductIds(query) {
  const client = searchClient();
  if (!client || !query) return null;
  try {
    const res = await client.searchSingleIndex({
      indexName: ALGOLIA_INDEX,
      searchParams: { query, hitsPerPage: 40, attributesToRetrieve: ['objectID'] },
    });
    // Empty (e.g. index not seeded yet) → null so the caller falls back to local.
    if (!res.hits.length) return null;
    return res.hits.map(h => h.objectID);
  } catch (e) {
    console.warn('Algolia search failed, falling back to local search', e?.message);
    return null; // signal caller to fall back
  }
}

// Full hits (for the quick-search dropdown).
export async function searchProductHits(query) {
  const client = searchClient();
  if (!client || !query) return null;
  try {
    const res = await client.searchSingleIndex({
      indexName: ALGOLIA_INDEX,
      searchParams: { query, hitsPerPage: 12 },
    });
    if (!res.hits.length) return null;
    return res.hits;
  } catch {
    return null;
  }
}

// Build the indexable record from a product document.
export const toAlgoliaRecord = (p) => ({
  objectID: p.id,
  title: p.title,
  description: p.description || '',
  category: p.category || '',
  sectionId: p.sectionId || '',
  subsectionId: p.subsectionId || '',
  price: Number(p.price) || 0,
  image: (p.images && p.images[0]) || p.image || '',
  skus: (p.variants || []).map(v => v.sku).filter(Boolean),
  sizes: (p.variants || []).map(v => v.size).filter(Boolean),
});
