"use client";
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';

export default function CartSidebar() {
  const { cart, isCartOpen, closeCart, removeFromCart, cartTotal } = useCart();
  const { t } = useLanguage();

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
              <span>{cartTotal.toFixed(2)} {t('price')}</span>
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
