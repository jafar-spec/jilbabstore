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

  // Next.js metadata parser crashes on base64 data URIs
  if (imageUrl.startsWith('data:')) {
    imageUrl = '/assets/logo.png';
  }

  return {
    title: `${product.title} | Jilbab Store`,
    description: product.description || `Buy ${product.title} at Jilbab Store`,
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

  // Fetch related products (e.g. 4 random products, or same category if implemented)
  const allProducts = await getProducts();
  const relatedProducts = allProducts
    .filter(p => p.id !== id)
    .sort(() => 0.5 - Math.random()) // simple random shuffle
    .slice(0, 4);

  return (
    <ClientProductDetail 
      initialProduct={sanitize(product)} 
      initialReviews={sanitize(reviews)} 
      relatedProducts={sanitize(relatedProducts)} 
    />
  );
}
