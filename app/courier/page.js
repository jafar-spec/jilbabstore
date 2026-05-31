"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllOrders, updateOrderDoc } from '@/lib/db';
import Link from 'next/link';

export default function CourierDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courierTab, setCourierTab] = useState('to_deliver');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.replace('/login');
    }
    if (!authLoading && role === 'operator') {
      window.location.replace('/admin');
    }
  }, [user, role, authLoading, router]);

  // Prevent back button from returning here after logout
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
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
      console.error(err);
      showToast('حدث خطأ أثناء جلب الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'courier') {
      fetchData();
    }
  }, [user, role]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderDoc(orderId, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      showToast(`تم تحديث الحالة إلى: ${newStatus}`, 'success');

      // Send email if applicable
      const currentOrder = orders.find(o => o.id === orderId);
      const customerEmail = currentOrder?.shipping?.email || currentOrder?.customerInfo?.email;
      if (customerEmail && (newStatus === 'جاري التوصيل' || newStatus === 'تم التوصيل')) {
        let subject = '';
        let htmlContent = '';
        const orderNum = orderId.slice(0, 8);
        
        if (newStatus === 'جاري التوصيل') {
          subject = `Your Order #${orderNum} is Out for Delivery!`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#7c3aed;">Great news!</h2>
            <p>Your Jilbab Store order <strong>#${orderNum}</strong> is out for delivery with our courier.</p>
            <p>They will contact you shortly.</p>
          </div>`;
        } else if (newStatus === 'تم التوصيل') {
          subject = `Order #${orderNum} Delivered Successfully`;
          htmlContent = `<div style="font-family:sans-serif; text-align:center; padding:20px;">
            <h2 style="color:#10b981;">Delivered!</h2>
            <p>Your order <strong>#${orderNum}</strong> has been successfully delivered.</p>
            <p>Thank you for shopping with Jilbab Store!</p>
          </div>`;
        }

        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [customerEmail],
            subject,
            htmlContent
          })
        }).catch(err => console.error("Error sending status email:", err));
      }

    } catch (err) {
      console.error(err);
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('store_auth_role');
    }
    try {
      const { signOut } = require('firebase/auth');
      const { auth } = require('@/lib/firebase');
      await signOut(auth);
    } catch (e) {
      // Legacy courier may not have Firebase auth
    }
    window.location.replace('/login');
  };

  if (authLoading) {
    return <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>جاري التحميل...</div>;
  }

  if (role !== 'courier') {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface-color)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>بوابة المندوبين</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>متجر جلباب</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.6rem 1.2rem', background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          تسجيل الخروج
        </button>
      </header>

      <main style={{ padding: '2rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Courier Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            onClick={() => setCourierTab('to_deliver')} 
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', background: courierTab === 'to_deliver' ? 'var(--accent-color)' : 'var(--glass-bg)', color: courierTab === 'to_deliver' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: courierTab === 'to_deliver' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none' }}
          >
            <i className="fa-solid fa-truck" style={{ marginLeft: '10px' }}></i> جاري التوصيل
          </button>
          <button 
            onClick={() => setCourierTab('delivered')} 
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', background: courierTab === 'delivered' ? 'var(--accent-color)' : 'var(--glass-bg)', color: courierTab === 'delivered' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: courierTab === 'delivered' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none' }}
          >
            <i className="fa-solid fa-check-circle" style={{ marginLeft: '10px' }}></i> تم التوصيل
          </button>
        </div>

        {/* Orders Grid */}
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {orders
            .filter(o => courierTab === 'to_deliver' ? o.status === 'جاري التوصيل' : o.status === 'تم التوصيل')
            .sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0))
            .map(order => {
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
                    <i className="fa-solid fa-location-dot" style={{ marginTop: '4px', color: '#e74c3c' }}></i>
                    <span>{fullAddress} {addr.buildingFloor ? `(${addr.buildingFloor})` : ''}</span>
                  </div>
                  {addr.notes && (
                    <div style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>ملاحظة:</strong> {addr.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                  <a href={`tel:${addr.phone1}`} style={{ textAlign: 'center', padding: '0.8rem', background: '#e3f2fd', color: '#1976d2', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-phone"></i> اتصال
                  </a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noreferrer" style={{ textAlign: 'center', padding: '0.8rem', background: '#e8f5e9', color: '#388e3c', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-map-location-dot"></i> الخريطة
                  </a>
                </div>
                
                {courierTab === 'to_deliver' ? (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'تم التوصيل')}
                    style={{ width: '100%', padding: '1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                  >
                    <i className="fa-solid fa-check"></i> إنهاء التوصيل (تم)
                  </button>
                ) : (
                  <button 
                    disabled
                    style={{ width: '100%', padding: '1rem', background: '#ecf0f1', color: '#95a5a6', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                  >
                    <i className="fa-solid fa-check-double"></i> تم التوصيل مسبقاً
                  </button>
                )}
              </div>
            )})}
            {orders.filter(o => courierTab === 'to_deliver' ? o.status === 'جاري التوصيل' : o.status === 'تم التوصيل').length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                <h3>لا توجد طلبات هنا حالياً</h3>
              </div>
            )}
        </div>
      </main>

      {toast.show && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#e74c3c' : '#27ae60', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-check-circle'}`}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}
