"use client";
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getOrderById } from '@/lib/db';
import Link from 'next/link';

export default function TrackOrder() {
  const { t, lang } = useLanguage();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setLoading(true);
    setError('');
    setOrder(null);
    
    try {
      const foundOrder = await getOrderById(orderId.trim());
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError(t('orderNotFound'));
      }
    } catch (err) {
      setError(t('orderTrackingError'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    if (status === 'قيد المعالجة' || status === 'قيد المعالجة (مدفوع)') return 1;
    if (status === 'جاري التوصيل') return 2;
    if (status === 'تم التوصيل') return 3;
    if (status === 'ملغي') return -1;
    return 0;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', minHeight: '60vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
        {t('trackingTitle')}
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        {t('trackingDesc')}
      </p>

      <form onSubmit={handleTrack} style={{ display: 'flex', gap: '1rem', maxWidth: '500px', margin: '0 auto', marginBottom: '3rem' }}>
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder={t('trackingPlaceholder')}
          style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '1rem' }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '1rem 2rem', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : t('trackBtn')}
        </button>
      </form>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {order && (
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0 }}>{t('order')} #{order.id.slice(0, 8)}</h2>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)' }}>₪{order.total?.toFixed(2)}</span>
          </div>

          {/* Timeline */}
          {getStatusStep(order.status) === -1 ? (
            <div style={{ textAlign: 'center', color: '#e74c3c', padding: '2rem', background: '#fadbd8', borderRadius: '8px' }}>
              <i className="fa-solid fa-circle-xmark" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <h3>{t('cancelled')}</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginBottom: '3rem', padding: '0 1rem' }}>
              <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '4px', background: 'var(--border-color)', zIndex: 1 }}>
                <div style={{ height: '100%', background: 'var(--accent-color)', width: getStatusStep(order.status) === 1 ? '0%' : getStatusStep(order.status) === 2 ? '50%' : '100%', transition: 'width 0.5s ease' }}></div>
              </div>
              
              {/* Step 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '0.5rem', width: '33%' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: getStatusStep(order.status) >= 1 ? 'var(--accent-color)' : 'var(--surface-color)', color: getStatusStep(order.status) >= 1 ? '#fff' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `2px solid ${getStatusStep(order.status) >= 1 ? 'var(--accent-color)' : 'var(--border-color)'}`, transition: 'all 0.3s ease' }}>
                  <i className="fa-solid fa-box"></i>
                </div>
                <span style={{ fontWeight: getStatusStep(order.status) >= 1 ? 'bold' : 'normal', color: getStatusStep(order.status) >= 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {t('statusProcessing')}
                </span>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '0.5rem', width: '33%' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: getStatusStep(order.status) >= 2 ? 'var(--accent-color)' : 'var(--surface-color)', color: getStatusStep(order.status) >= 2 ? '#fff' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `2px solid ${getStatusStep(order.status) >= 2 ? 'var(--accent-color)' : 'var(--border-color)'}`, transition: 'all 0.3s ease' }}>
                  <i className="fa-solid fa-truck-fast"></i>
                </div>
                <span style={{ fontWeight: getStatusStep(order.status) >= 2 ? 'bold' : 'normal', color: getStatusStep(order.status) >= 2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {t('statusDelivery')}
                </span>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '0.5rem', width: '33%' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: getStatusStep(order.status) >= 3 ? '#27ae60' : 'var(--surface-color)', color: getStatusStep(order.status) >= 3 ? '#fff' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `2px solid ${getStatusStep(order.status) >= 3 ? '#27ae60' : 'var(--border-color)'}`, transition: 'all 0.3s ease' }}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <span style={{ fontWeight: getStatusStep(order.status) >= 3 ? 'bold' : 'normal', color: getStatusStep(order.status) >= 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {t('statusDelivered')}
                </span>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{t('customerDetails')}</h3>
            <p><strong>{t('nameLabel') || 'الاسم:'}</strong> {order.customerInfo?.fullName || order.shipping?.fullName}</p>
            <p><strong>{t('addressLabel') || 'العنوان:'}</strong> {order.customerInfo?.city || order.shipping?.city}, {order.customerInfo?.address || order.shipping?.street}</p>
            
            {order.trackingId && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e8f4f8', borderRadius: '8px', border: '1px solid #bce2f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-barcode" style={{ fontSize: '1.5rem', color: '#0288d1' }}></i>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#0288d1' }}>رقم التتبع (Tracking ID)</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '1px', color: '#01579b' }}>{order.trackingId}</div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
