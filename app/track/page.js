"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

export default function TrackOrder() {
  const { t, lang } = useLanguage();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest return request (from the tracking page)
  const [showReturn, setShowReturn] = useState(false);
  const [retPhone, setRetPhone] = useState('');
  const [retReason, setRetReason] = useState('');
  const [retBusy, setRetBusy] = useState(false);
  const [retMsg, setRetMsg] = useState(null); // { type, text }

  const submitGuestReturn = async (e) => {
    e.preventDefault();
    if (retBusy) return;
    setRetBusy(true); setRetMsg(null);
    try {
      const res = await fetch('/api/returns/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, phone: retPhone.trim(), reason: retReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRetMsg({ type: 'error', text: data.error || 'تعذّر إرسال الطلب' }); }
      else { setRetMsg({ type: 'success', text: 'تم إرسال طلب الإرجاع بنجاح، سنتواصل معك قريباً ✓' }); setShowReturn(false); }
    } catch {
      setRetMsg({ type: 'error', text: 'تعذّر إرسال الطلب' });
    } finally { setRetBusy(false); }
  };

  const doTrack = async (id) => {
    if (!id || !id.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id.trim() })
      });
      if (res.ok) {
        setOrder(await res.json());
      } else {
        setError(t('orderNotFound'));
      }
    } catch (err) {
      setError(t('orderTrackingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (e) => { e.preventDefault(); doTrack(orderId); };

  // Auto-track when arriving from the order-confirmation page (?order=...).
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get('order');
      if (id) { setOrderId(id); doTrack(id); }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusStep = (status) => {
    const s = status || '';
    if (s === 'ملغي' || s === 'مرتجع') return -1;
    if (s === 'تم التوصيل') return 4;
    if (s === 'جاري التوصيل') return 3;
    if (s === 'تم التجهيز') return 2;
    if (s.includes('قيد المعالجة')) return 1;
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
                <div style={{ height: '100%', background: 'var(--accent-color)', width: `${Math.max(0, (getStatusStep(order.status) - 1)) / 3 * 100}%`, transition: 'width 0.5s ease' }}></div>
              </div>

              {[
                { step: 1, icon: 'fa-box', label: t('statusProcessing'), done: 'var(--accent-color)' },
                { step: 2, icon: 'fa-box-open', label: 'تم التجهيز', done: 'var(--accent-color)' },
                { step: 3, icon: 'fa-truck-fast', label: t('statusDelivery'), done: 'var(--accent-color)' },
                { step: 4, icon: 'fa-check', label: t('statusDelivered'), done: '#27ae60' },
              ].map(({ step, icon, label, done }) => {
                const reached = getStatusStep(order.status) >= step;
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '0.5rem', width: '25%' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: reached ? done : 'var(--surface-color)', color: reached ? '#fff' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `2px solid ${reached ? done : 'var(--border-color)'}`, transition: 'all 0.3s ease' }}>
                      <i className={`fa-solid ${icon}`}></i>
                    </div>
                    <span style={{ fontWeight: reached ? 'bold' : 'normal', color: reached ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{t('customerDetails')}</h3>
            <p><strong>{t('nameLabel') || 'الاسم:'}</strong> {order.customerName}</p>
            <p><strong>{t('addressLabel') || 'المدينة:'}</strong> {order.city}</p>
            
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

          {/* Guest return request — only once the order is delivered */}
          {order.status === 'تم التوصيل' && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              {retMsg && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600,
                  background: retMsg.type === 'success' ? '#ecfdf5' : '#fef2f2', color: retMsg.type === 'success' ? '#059669' : '#dc2626' }}>
                  {retMsg.text}
                </div>
              )}
              {!showReturn && retMsg?.type !== 'success' && (
                <button onClick={() => setShowReturn(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1.4rem', borderRadius: '99px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  <i className="fa-solid fa-rotate-left"></i> طلب إرجاع / استرداد
                </button>
              )}
              {showReturn && (
                <form onSubmit={submitGuestReturn} style={{ background: 'var(--bg-color)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <strong>طلب إرجاع للطلب #{order.id.slice(0, 8)}</strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>أدخل رقم الهاتف المستخدم في الطلب للتحقق.</p>
                  <input type="tel" dir="ltr" required value={retPhone} onChange={e => setRetPhone(e.target.value)} placeholder="05XXXXXXXX"
                    style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }} />
                  <textarea required value={retReason} onChange={e => setRetReason(e.target.value)} placeholder="سبب الإرجاع…" rows={3}
                    style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button type="submit" disabled={retBusy || !retPhone.trim() || !retReason.trim()} className="btn-primary" style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', opacity: (retBusy || !retPhone.trim() || !retReason.trim()) ? 0.6 : 1 }}>
                      {retBusy ? '...' : 'إرسال الطلب'}
                    </button>
                    <button type="button" onClick={() => setShowReturn(false)} style={{ padding: '0.7rem 1.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>إلغاء</button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
