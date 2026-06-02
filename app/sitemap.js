import { getProducts } from '@/lib/db';

const SITE = 'https://jilbab.store';

export default async function sitemap() {
  const staticRoutes = ['', '/search', '/track', '/wishlist', '/returns', '/privacy', '/support']
    .map((path) => ({
      url: `${SITE}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? 1 : 0.6,
    }));

  let productRoutes = [];
  try {
    const products = await getProducts();
    productRoutes = products.map((p) => ({
      url: `${SITE}/product/${p.id}`,
      lastModified: p.createdAt ? new Date(p.createdAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    // If the catalog can't be read at build time, ship the static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
