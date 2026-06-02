import { getProducts, getProductById, getReviews } from '@/lib/db';
import ClientProductDetail from '@/components/ClientProductDetail';

const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

// Generate static params for all products so they can be pre-rendered at build time
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({
    id: p.id,
  }));
}

// Generate dynamic metadata (Title, Description, OpenGraph) for SEO
export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: 'Product Not Found | Jilbab Store',
      description: 'The requested product could not be found.',
    };
  }

  let imageUrl = (product.images && product.images.length > 0)
    ? product.images[0]
    : (product.image || '/assets/logo.png');

  // OpenGraph needs an absolute, non-base64 URL; fall back to the logo.
  if (!imageUrl || imageUrl.startsWith('data:')) {
    imageUrl = '/assets/logo.png';
  }

  const title = `${product.title} | Jilbab Store`;
  const description = product.description || `اشترِ ${product.title} من متجر جلباب — أزياء محتشمة عصرية.`;
  const url = `/product/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'Jilbab Store',
      images: [{ url: imageUrl, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  
  // Fetch data on the server to pass as initial state for instant SEO load
  const product = await getProductById(id);
  
  if (!product) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Product not found</h2>
      </div>
    );
  }

  const reviews = await getReviews(id);

  // Related products by relevance: same subsection → same section → same
  // category → anything else, de-duplicated, capped at 4.
  const allProducts = await getProducts();
  const others = allProducts.filter(p => p.id !== id);
  const seen = new Set();
  const related = [];
  const add = (list) => {
    for (const p of list) {
      if (related.length >= 4) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id); related.push(p);
    }
  };
  add(others.filter(p => product.subsectionId && p.subsectionId === product.subsectionId));
  add(others.filter(p => product.sectionId && p.sectionId === product.sectionId));
  add(others.filter(p => product.category && p.category === product.category));
  add(others);
  const relatedProducts = related.slice(0, 4);

  // Product structured data (JSON-LD) for rich search results.
  const ratings = reviews.filter(r => typeof r.rating === 'number');
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
  const ogImage = (product.images?.[0] && !product.images[0].startsWith('data:')) ? product.images[0] : undefined;
  const totalStock = (product.variants || []).reduce((s, v) => s + ((Number(v.stock) || 0) - (Number(v.reserved) || 0)), 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.title,
    ...(ogImage ? { image: ogImage } : {}),
    ...(product.category ? { category: product.category } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ILS',
      price: Number(product.price) || 0,
      availability: totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(avg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: ratings.length } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClientProductDetail
        initialProduct={sanitize(product)}
        initialReviews={sanitize(reviews)}
        relatedProducts={sanitize(relatedProducts)}
      />
    </>
  );
}
