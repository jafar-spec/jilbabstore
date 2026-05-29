"use client";
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import { getProductById, getReviews, addReview } from '@/lib/db';
import { useWishlist } from '@/context/WishlistContext';

export default function ClientProductDetail({ initialProduct, initialReviews, relatedProducts }) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  
  // Wishlist
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Reviews State
  const [reviews, setReviews] = useState(initialReviews || []);
  const [newReview, setNewReview] = useState({ rating: 5, text: '', name: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Image Gallery & Zoom State
  const defaultImage = (initialProduct?.images && initialProduct.images.length > 0) 
    ? initialProduct.images[0] 
    : (initialProduct?.image || '/assets/logo.png');
  const [mainImage, setMainImage] = useState(defaultImage);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

  useEffect(() => {
    if (initialProduct) {
      if (initialProduct.variants && initialProduct.variants.length > 0) {
          const inStock = initialProduct.variants.filter(v => v.stock > 0);
          if(inStock.length > 0) setSelectedSize(inStock[0].size);
      }
    }
  }, [initialProduct]);

  if (loading) {
    return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('loading')}</div>;
  }

  if (!product) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <h2>{t('noProducts')}</h2>
        <Link href="/" className="btn-primary">{t('home')}</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
      if (product.variants && !selectedSize) {
          showToast(t('sizeRequired'), 'error');
          return;
      }
      const selectedVariant = product.variants ? product.variants.find(v => v.size === selectedSize) : null;
      
      if (selectedVariant && quantity > selectedVariant.stock) {
          showToast(t('quantityExceedsStock').replace('{count}', selectedVariant.stock), 'error');
          return;
      }
      
      addToCart({
          ...product,
          quantity: quantity,
          selectedSize: selectedSize || 'عام',
          sku: selectedVariant ? selectedVariant.sku : null,
          image: mainImage // Pass the currently selected main image
      });
      showToast(t('addedToCart'), 'success');
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${mainImage})`,
      backgroundPosition: `${x}% ${y}%`
    });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.text.trim()) {
      showToast(t('reviewFieldsRequired'), 'error');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await addReview(product.id, newReview);
      setReviews([{ ...newReview, createdAt: new Date().toISOString() }, ...reviews]);
      setNewReview({ rating: 5, text: '', name: '' });
      showToast(t('reviewAddedSuccess'), 'success');
    } catch (err) {
      showToast(t('reviewAddedError'), 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <main>
      
      <div style={{ padding: '8rem 5% 4rem', minHeight: '100vh' }}>
        
        {/* Breadcrumb Navigation Ribbon */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '2rem', display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>{t('home')}</Link>
          <span>/</span>
          <span>{product.title}</span>
        </div>

        <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Product Image Gallery & Zoom */}
        <div style={{ flex: '1 1 400px', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          
          {/* Main Image with Hover Zoom */}
          <div 
            className="zoom-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoomStyle({ display: 'none' })}
            style={{ 
              background: 'var(--surface-color)', 
              borderRadius: '16px', 
              border: '1px solid var(--glass-border)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'zoom-in',
              aspectRatio: '1 / 1',
              width: '100%'
            }}
          >
            <Image 
              src={mainImage} 
              alt={product.title} 
              fill
              style={{ objectFit: 'cover' }}
            />
            {/* Zoom Lens Overlay */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                backgroundSize: '200%',
                backgroundRepeat: 'no-repeat',
                ...zoomStyle
              }}
            ></div>
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
              {product.images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                  <Image 
                    src={img} 
                    alt={`${product.title} ${idx+1}`}
                    onClick={() => setMainImage(img)}
                    fill
                    style={{ 
                      objectFit: 'cover', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      border: mainImage === img ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                      opacity: mainImage === img ? 1 : 0.6,
                      transition: '0.3s'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Product Details - Amazon Style */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('storeName').toUpperCase()} OFFICIAL
            </div>
            <h1 style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>{product.title}</h1>
            
            {/* Ratings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
              <div style={{ color: '#ff9900', fontSize: '1.2rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i key={star} className={star <= Math.round(averageRating || 5) ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                ))}
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>
                {averageRating > 0 ? `${averageRating} (${reviews.length} ${t('reviews')})` : t('noReviews')}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)', fontVariantNumeric: 'tabular-nums' }}>
              {Number(product.price).toFixed(2)} {t('price')}
            </div>
          </div>

          <div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              {product.description || t('heroSubtitle')}
            </p>
          </div>

          {/* Size Selector */}
          {product.variants && product.variants.length > 0 && (
              <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{t('chooseSize')}: {selectedSize && <span style={{fontWeight: 'normal', color: 'var(--text-secondary)'}}>{selectedSize}</span>}</h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {product.variants.map(variant => {
                          const isOutOfStock = variant.stock <= 0;
                          const isSelected = selectedSize === variant.size;
                          return (
                              <button
                                  key={variant.size}
                                  onClick={() => !isOutOfStock && setSelectedSize(variant.size)}
                                  disabled={isOutOfStock}
                                  style={{
                                      padding: '0.8rem 1.5rem',
                                      borderRadius: '8px',
                                      border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                                      background: isSelected ? 'var(--accent-color)' : 'transparent',
                                      color: isSelected ? '#000' : isOutOfStock ? '#ccc' : 'var(--text-primary)',
                                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                      fontWeight: isSelected ? 'bold' : 'normal',
                                      textDecoration: isOutOfStock ? 'line-through' : 'none',
                                      transition: '0.2s'
                                  }}
                              >
                                  {variant.size}
                              </button>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* Buy Box */}
          <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--accent-color)', marginTop: '2rem' }}>
            
            {product.variants && selectedSize && (
              (() => {
                const variant = product.variants.find(v => v.size === selectedSize);
                if (variant) {
                  if (variant.stock === 0) {
                    return <div style={{ marginBottom: '1rem', color: '#c62828', fontWeight: 'bold' }}><i className="fa-solid fa-triangle-exclamation"></i> {t('outOfStock')}</div>;
                  } else if (variant.stock < 5) {
                    return <div style={{ marginBottom: '1rem', color: '#f57f17', fontWeight: 'bold' }}><i className="fa-solid fa-clock"></i> {t('onlyLeftInStock').replace('{count}', variant.stock)}</div>;
                  }
                }
                return null;
              })()
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <label>{t('quantity')}</label>
              <select 
                value={quantity} 
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                onClick={handleAddToCart}
                disabled={product.variants && selectedSize && product.variants.find(v => v.size === selectedSize)?.stock === 0}
                style={{ flex: 1, padding: '1.2rem', fontSize: '1.2rem', borderRadius: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', opacity: (product.variants && selectedSize && product.variants.find(v => v.size === selectedSize)?.stock === 0) ? 0.5 : 1, cursor: (product.variants && selectedSize && product.variants.find(v => v.size === selectedSize)?.stock === 0) ? 'not-allowed' : 'pointer' }}
              >
                <i className="fa-solid fa-cart-plus"></i> {(product.variants && selectedSize && product.variants.find(v => v.size === selectedSize)?.stock === 0) ? t('soldOut') : t('addToCart')}
              </button>
              
              <button 
                onClick={() => toggleWishlist(product)}
                style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '1.5rem', color: isInWishlist(product.id) ? '#e74c3c' : 'var(--text-secondary)', transition: 'all 0.3s' }}
              >
                <i className={isInWishlist(product.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
              </button>
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-truck-fast" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', width: '24px' }}></i> 
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{t('fastShipping')}</strong>
                  <span>{t('fastShippingDesc')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-arrow-rotate-left" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', width: '24px' }}></i> 
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{t('freeReturns')}</strong>
                  <span>{t('freeReturnsDesc')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Reviews Section */}
        <div style={{ maxWidth: '1200px', margin: '4rem auto 0', padding: '2rem', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            {t('customerReviews')}
          </h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem' }}>
            {/* Reviews List */}
            <div style={{ flex: '1 1 500px' }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {t('beFirstToReview')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reviews.map((rev, i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{rev.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ color: '#ff9900', marginBottom: '1rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i key={star} className={star <= rev.rating ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                        ))}
                      </div>
                      <p style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>{rev.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Review Form */}
            <div style={{ flex: '1 1 400px', background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>{t('writeReview')}</h3>
              <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('rating')}</label>
                  <select 
                    value={newReview.rating} 
                    onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ (4/5)</option>
                    <option value="3">⭐⭐⭐ (3/5)</option>
                    <option value="2">⭐⭐ (2/5)</option>
                    <option value="1">⭐ (1/5)</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('yourName')}</label>
                  <input 
                    type="text" 
                    required
                    value={newReview.name}
                    onChange={e => setNewReview({...newReview, name: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('yourReview')}</label>
                  <textarea 
                    required
                    rows="4"
                    value={newReview.text}
                    onChange={e => setNewReview({...newReview, text: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingReview}
                  style={{ marginTop: '1rem', padding: '1rem', background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmittingReview ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmittingReview ? <i className="fa-solid fa-spinner fa-spin"></i> : t('submitReview')}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div style={{ maxWidth: '1200px', margin: '4rem auto 0', padding: '2rem 0' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', textAlign: 'center' }}>
              {lang === 'ar' ? 'قد يعجبك أيضاً' : 'You Might Also Like'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
              {relatedProducts.map(rp => (
                <Link href={`/product/${rp.id}`} key={rp.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden', transition: 'transform 0.3s' }} className="product-card">
                    <div style={{ position: 'relative', height: '300px' }}>
                      <Image 
                        src={rp.image || (rp.images && rp.images[0]) || '/assets/logo.png'} 
                        alt={rp.title} 
                        fill 
                        style={{ objectFit: 'cover' }} 
                      />
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{rp.title}</h3>
                      <div style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{rp.price} NIS</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
