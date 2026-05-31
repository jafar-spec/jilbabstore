"use client";
import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderDoc } from '@/lib/db';

export default function CourierDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courierTab, setCourierTab] = useState('to_deliver');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [authorized, setAuthorized] = useState(false);

  // Check authorization directly from sessionStorage — no AuthContext needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('store_auth_role');
      if (role === 'courier') {
        setAuthorized(true);
        fetchData();
      } else {
        window.location.replace('/login');
      }
    }
  }, []);

  // Block back button
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined' && sessionStorage.getItem('store_auth_role') !== 'courier') {
        window.location.replace('/login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderDoc(orderId, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      showToast(`تم تحديث الحالة إلى: ${newStatus}`, 'success');

      const currentOrder = orders.find(o => o.id === orderId);
      const customerEmail = currentOrder?.shipping?.email || currentOrder?.customerInfo?.email;
      if (customerEmail && (newStatus === 'جاري التوصيل' || newStatus === 'تم التوصيل')) {
        const orderNum = orderId.slice(0, 8);
        let subject = '';
        let htmlContent = '';
        
        if (newStatus === 'جاري التوصيل') {
          subject = `Your Order #${orderNum} is Out for Delivery!`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#7c3aed;">Great news!</h2>
            <p>Your Jilbab Store order <strong>#${orderNum}</strong> is out for delivery.</p>
          </div>`;
        } else {
          subject = `Order #${orderNum} Delivered Successfully`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#10b981;">Delivered!</h2>
            <p>Your order <strong>#${orderNum}</strong> has been delivered. Thank you!</p>
          </div>`;
        }

        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: [customerEmail], subject, htmlContent })
        }).catch(err => console.error("Email error:", err));
      }
    } catch (err) {
      console.error(err);
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('store_auth_role');
    window.location.replace('/login');
  };

  if (!authorized) {
    return <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>جاري التحميل...</div>;
  }

  const filteredOrders = orders.filter(o => courierTab === 'to_deliver' ? o.status === 'جاري التوصيل' : o.status === 'تم التوصيل');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', flexDirection: 'column' }}>
      {/* Header with logout */}
      <header style={{ background: 'var(--surface-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>🚚 بوابة المندوبين</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>متجر جلباب</p>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ 
            padding: '0.7rem 1.5rem', 
            background: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          تسجيل الخروج
        </button>
      </header>

      <main style={{ padding: '1.5rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setCourierTab('to_deliver')} 
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', background: courierTab === 'to_deliver' ? 'var(--accent-color)' : 'var(--glass-bg)', color: courierTab === 'to_deliver' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            🚛 جاري التوصيل ({orders.filter(o => o.status === 'جاري التوصيل').length})
          </button>
          <button 
            onClick={() => setCourierTab('delivered')} 
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', background: courierTab === 'delivered' ? 'var(--accent-color)' : 'var(--glass-bg)', color: courierTab === 'delivered' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            ✅ تم التوصيل ({orders.filter(o => o.status === 'تم التوصيل').length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.2rem' }}>جاري تحميل الطلبات...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
                <h3>لا توجد طلبات هنا حالياً</h3>
              </div>
            ) : (
              filteredOrders.sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0)).map(order => {
                const addr = order.shipping || order.customerInfo || {};
                const fullAddress = `${addr.city || ''} ${addr.neighborhood || ''} ${addr.street || ''}`;
                return (
                  <div key={order.id} style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.8rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>#{order.id.slice(0, 8)}</span>
                      <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>₪{order.total?.toFixed(2)}</span>
                    </div>
                    
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '1.1rem' }}>{addr.fullName || 'غير متوفر'}</div>
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '0.5rem' }}>
                        📍 <span>{fullAddress} {addr.buildingFloor ? `(${addr.buildingFloor})` : ''}</span>
                      </div>
                      {addr.notes && (
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          <strong>ملاحظة:</strong> {addr.notes}
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    {order.items && order.items.length > 0 && (
                      <div style={{ background: 'var(--bg-color)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                        <strong>المنتجات:</strong>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                            {item.title} × {item.quantity} {item.size ? `(${item.size})` : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                      <a href={`tel:${addr.phone1}`} style={{ textAlign: 'center', padding: '0.8rem', background: '#e3f2fd', color: '#1976d2', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem' }}>
                        📞 اتصال
                      </a>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noreferrer" style={{ textAlign: 'center', padding: '0.8rem', background: '#e8f5e9', color: '#388e3c', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem' }}>
                        🗺️ الخريطة
                      </a>
                    </div>
                    
                    {courierTab === 'to_deliver' ? (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'تم التوصيل')}
                        style={{ width: '100%', padding: '1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                      >
                        ✅ إنهاء التوصيل (تم)
                      </button>
                    ) : (
                      <button 
                        disabled
                        style={{ width: '100%', padding: '1rem', background: '#ecf0f1', color: '#95a5a6', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}
                      >
                        ✔️ تم التوصيل مسبقاً
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {toast.show && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#e74c3c' : '#27ae60', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 'bold' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
