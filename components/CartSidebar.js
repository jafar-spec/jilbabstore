"use client";
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';

export default function CartSidebar() {
  const { cart, isCartOpen, closeCart, removeFromCart, cartTotal } = useCart();
  const { t, storeSettings } = useLanguage();

  const freeShippingThreshold = Number(storeSettings?.freeShippingThreshold) || 250;
  const shippingCost = Number(storeSettings?.shippingCost) || 30;
  const isFreeShipping = cartTotal >= freeShippingThreshold;
  const remaining = Math.max(0, freeShippingThreshold - cartTotal);
  const progress = Math.min(100, (cartTotal / freeShippingThreshold) * 100);
  const finalTotal = cartTotal + (isFreeShipping ? 0 : shippingCost);

  return (
    <>
      <div className={`cart-overlay ${isCartOpen ? 'active' : ''}`} onClick={closeCart}></div>
      <aside className={`cart-sidebar ${isCartOpen ? 'active' : ''}`}>
        <div className="cart-header">
          <h2>{t('cartTitle')}</h2>
          <button className="close-cart" onClick={closeCart} aria-label="Close Cart">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div style={{ padding: '0 1.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          {isFreeShipping ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#dcfce7', borderRadius: '8px', padding: '8px 12px',
              color: '#166534', fontSize: '0.82rem', fontWeight: 600
            }}>
              <i className="fa-solid fa-truck-fast"></i>
              🎉 You've unlocked Free Shipping! / شحن مجاني!
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span><i className="fa-solid fa-truck"></i> Add ₪{remaining.toFixed(0)} more for free shipping</span>
                <span>₪{freeShippingThreshold}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  background: 'linear-gradient(90deg, var(--accent-color), #8b5cf6)',
                  width: `${progress}%`, transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          )}
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-cart-arrow-down" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
              <p>{t('emptyCart')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={`${item.id}-${item.selectedSize}`}>
                <div className="cart-item-image" style={{ position: 'relative', width: '80px', height: '100px' }}>
                  <Image 
                    src={item.image || '/assets/black_jilbab_1779926556174.png'} 
                    alt={item.title} 
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="item-details">
                  <div className="item-title">{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {item.selectedSize !== 'عام' && <span>{t('size')} {item.selectedSize}</span>}
                  </div>
                  <div className="item-price">{Number(item.price).toFixed(2)} {t('price')} x {item.quantity}</div>
                </div>
                <button className="remove-item" onClick={() => removeFromCart(item.id, item.selectedSize)} aria-label="Remove item">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>{t('total')}</span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                {!isFreeShipping && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    +₪{shippingCost} shipping
                  </span>
                )}
                {isFreeShipping && (
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                    Free Shipping ✓
                  </span>
                )}
                <span>{finalTotal.toFixed(2)} {t('price')}</span>
              </span>
            </div>
            <Link href="/checkout" style={{ display: 'block', width: '100%' }}>
              <button className="checkout-btn" onClick={closeCart} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {t('checkoutBtn')}
              </button>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
