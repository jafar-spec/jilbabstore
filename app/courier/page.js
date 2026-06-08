"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllOrders, getStoreSettings } from '@/lib/db';

const ALLOWED_ROLES = ['courier', 'operator', 'admin'];
const DEFAULT_DEPOT = [31.5, 34.75];

const fmt = (n) => `₪${(Number(n) || 0).toFixed(2)}`;

function distKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function optimiseRoute(orders, depot = DEFAULT_DEPOT) {
  const withGeo = orders.filter(o => o.geo && Number.isFinite(o.geo.lat));
  const noGeo = orders.filter(o => !(o.geo && Number.isFinite(o.geo.lat)));
  const remaining = [...withGeo];
  const route = [];
  let cur = depot;
  while (remaining.length) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distKm(cur, [remaining[i].geo.lat, remaining[i].geo.lng]);
      if (d < bestD) { bestD = d; best = i; }
    }
    const next = remaining.splice(best, 1)[0];
    route.push(next); cur = [next.geo.lat, next.geo.lng];
  }
  return [...route, ...noGeo];
}

function routeUrl(orders, depot = DEFAULT_DEPOT) {
  if (!orders.length) return null;
  const stops = orders.map(o => {
    if (o.geo && Number.isFinite(o.geo.lat)) return `${o.geo.lat},${o.geo.lng}`;
    const a = o.shipping || o.customerInfo || {};
    return encodeURIComponent([a.city, a.neighborhood, a.street, a.address].filter(Boolean).join(' '));
  });
  return `https://www.google.com/maps/dir/${depot.join(',')}/${stops.join('/')}`;
}

// Payment guidance for the courier — the critical "collect cash or not".
function payInfo(o) {
  if (o.paymentMethod === 'cash') return { collect: true, label: `اجمع نقداً: ${fmt(o.total)}`, color: '#c0392b', bg: '#fdecea', icon: 'fa-money-bill-wave' };
  if (o.paymentMethod === 'card') return { collect: false, label: 'مدفوع بالبطاقة — لا تجمع نقوداً', color: '#1e7e34', bg: '#eafaf0', icon: 'fa-credit-card' };
  if (o.paymentMethod === 'paypal') return o.paymentStatus === 'paid'
    ? { collect: false, label: 'مدفوع عبر PayPal — لا تجمع نقوداً', color: '#1e7e34', bg: '#eafaf0', icon: 'fa-brands fa-paypal' }
    : { collect: false, label: 'PayPal — تأكد من الدفع قبل التسليم', color: '#b7791f', bg: '#fff8e1', icon: 'fa-brands fa-paypal' };
  return { collect: false, label: 'مدفوع', color: '#1e7e34', bg: '#eafaf0', icon: 'fa-check' };
}

const ISSUE_REASONS = [
  'العميل لا يرد على الهاتف',
  'العنوان غير صحيح / لم أجد المكان',
  'العميل رفض الاستلام',
  'عنصر مفقود أو تالف في الطلب',
  'العميل طلب تأجيل الموعد',
  'مشكلة أخرى',
];

export default function CourierDashboard() {
  const router = useRouter();
  const { user, role, loading: authLoading, logout } = useAuth();
  const authorized = !!user && ALLOWED_ROLES.includes(role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courierTab, setCourierTab] = useState('to_deliver');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [depot, setDepot] = useState(DEFAULT_DEPOT);

  // Issue-report modal state
  const [reportFor, setReportFor] = useState(null);
  const [reportReason, setReportReason] = useState(ISSUE_REASONS[0]);
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authorized) { router.replace('/login'); return; }
    fetchData();
  }, [authLoading, authorized, router]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders || []);
      try {
        const s = await getStoreSettings();
        const lat = Number(s?.storeLat), lng = Number(s?.storeLng);
        if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng)) setDepot([lat, lng]);
      } catch { /* keep default depot */ }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (order, newStatus) => {
    // Confirm cash collection / handover before completing.
    if (newStatus === 'تم التوصيل') {
      const msg = order.paymentMethod === 'cash'
        ? `تأكيد: استلمت ${fmt(order.total)} نقداً وسلّمت الطلب #${order.id.slice(0, 8)}؟`
        : `تأكيد تسليم الطلب #${order.id.slice(0, 8)}؟ (مدفوع مسبقاً — لا تجمع نقوداً)`;
      if (!window.confirm(msg)) return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orders/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'فشل تحديث الحالة', 'error'); return; }
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      showToast(`تم تحديث الحالة إلى: ${newStatus}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const submitReport = async () => {
    if (!reportFor || reportBusy) return;
    setReportBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orders/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: reportFor.id, reason: reportReason, note: reportNote })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'فشل إرسال البلاغ', 'error'); setReportBusy(false); return; }
      setOrders(prev => prev.map(o => o.id === reportFor.id
        ? { ...o, hasDeliveryIssue: true, deliveryIssues: [...(o.deliveryIssues || []), { reason: reportReason, note: reportNote }] }
        : o));
      showToast('تم إبلاغ الإدارة بالمشكلة ✓', 'success');
      setReportFor(null); setReportReason(ISSUE_REASONS[0]); setReportNote('');
    } catch (err) {
      console.error(err); showToast('فشل إرسال البلاغ', 'error');
    } finally {
      setReportBusy(false);
    }
  };

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  if (!authorized) {
    return <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>جاري التحميل...</div>;
  }

  const filteredOrders = orders.filter(o => courierTab === 'to_deliver' ? o.status === 'جاري التوصيل' : o.status === 'تم التوصيل');
  const orderedOrders = courierTab === 'to_deliver'
    ? optimiseRoute(filteredOrders, depot)
    : [...filteredOrders].sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
  const fullRouteUrl = courierTab === 'to_deliver' ? routeUrl(orderedOrders, depot) : null;

  // Summary stats for the day.
  const toDeliver = orders.filter(o => o.status === 'جاري التوصيل');
  const cashToCollect = toDeliver.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
  let routeKm = 0; { let cur = depot; for (const o of orderedOrders) { if (o.geo && Number.isFinite(o.geo.lat)) { routeKm += distKm(cur, [o.geo.lat, o.geo.lng]); cur = [o.geo.lat, o.geo.lng]; } } }

  const stat = (label, value, icon, color) => (
    <div style={{ flex: '1 1 150px', background: 'var(--surface-color)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.9rem 1.1rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><i className={`fa-solid ${icon}`} style={{ color }}></i> {label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface-color)', backdropFilter: 'blur(12px)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>🚚 بوابة المندوبين</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>{role === 'courier' ? 'مندوب توصيل' : 'إدارة'} · متجر جلباب</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.6rem 1.3rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          تسجيل الخروج
        </button>
      </header>

      <main style={{ padding: '1.5rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Day summary */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {stat('توصيلات اليوم', toDeliver.length, 'fa-truck-fast', '#1976d2')}
          {stat('نقود للتحصيل', fmt(cashToCollect), 'fa-money-bill-wave', '#c0392b')}
          {stat('مسافة المسار', routeKm ? `~${routeKm.toFixed(1)} كم` : '—', 'fa-route', '#16a34a')}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setCourierTab('to_deliver')} style={{ flex: 1, padding: '1rem', borderRadius: '10px', border: 'none', background: courierTab === 'to_deliver' ? 'var(--accent-color)' : 'var(--surface-color)', color: courierTab === 'to_deliver' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem' }}>
            🚛 جاري التوصيل ({toDeliver.length})
          </button>
          <button onClick={() => setCourierTab('delivered')} style={{ flex: 1, padding: '1rem', borderRadius: '10px', border: 'none', background: courierTab === 'delivered' ? 'var(--accent-color)' : 'var(--surface-color)', color: courierTab === 'delivered' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem' }}>
            ✅ تم التوصيل ({orders.filter(o => o.status === 'تم التوصيل').length})
          </button>
        </div>

        {courierTab === 'to_deliver' && fullRouteUrl && (
          <a href={fullRouteUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '1rem', marginBottom: '1.5rem', background: '#1a73e8', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
            🧭 افتح المسار الكامل المُحسّن في خرائط Google
          </a>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}><p style={{ fontSize: '1.2rem' }}>جاري تحميل الطلبات...</p></div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
                <h3>لا توجد طلبات هنا حالياً</h3>
              </div>
            ) : (
              orderedOrders.map((order, idx) => {
                const addr = order.shipping || order.customerInfo || {};
                const fullAddress = [addr.city, addr.neighborhood, addr.street, addr.address].filter(Boolean).join('، ');
                const phone = addr.phone || addr.phone1 || '';
                const pay = payInfo(order);
                const stopUrl = order.geo && Number.isFinite(order.geo.lat)
                  ? `https://www.google.com/maps/dir/?api=1&destination=${order.geo.lat},${order.geo.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
                const waPhone = phone.replace(/[^\d]/g, '').replace(/^0/, '972');
                return (
                  <div key={order.id} style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '16px', border: order.hasDeliveryIssue ? '2px solid #e67e22' : '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {/* Header: stop number + order id + total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.7rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {courierTab === 'to_deliver' && (
                          <span style={{ background: '#1976d2', color: '#fff', width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{idx + 1}</span>
                        )}
                        #{order.id.slice(0, 8)}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem' }}>{fmt(order.total)}</span>
                    </div>

                    {/* PAYMENT BANNER — the critical collect/don't-collect cue */}
                    <div style={{ background: pay.bg, color: pay.color, padding: '0.7rem 0.9rem', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${pay.color}33` }}>
                      <i className={`fa-solid ${pay.icon}`} style={{ fontSize: '1.2rem' }}></i> {pay.label}
                    </div>

                    {/* Customer + address */}
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '1.05rem' }}>{addr.fullName || 'غير متوفر'}</div>
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.92rem' }}>
                        <i className="fa-solid fa-location-dot" style={{ marginTop: '3px' }}></i>
                        <span>{fullAddress || '—'} {addr.buildingFloor ? `(${addr.buildingFloor})` : ''}</span>
                      </div>
                      {(addr.notes || order.note) && (
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem 0.7rem', borderRadius: '6px', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                          <strong>ملاحظة العميل:</strong> {addr.notes || order.note}
                        </div>
                      )}
                    </div>

                    {/* Items with size/colour/qty + image */}
                    {order.items?.length > 0 && (
                      <div style={{ background: 'var(--bg-color)', padding: '0.7rem', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <strong style={{ fontSize: '0.85rem' }}>المنتجات ({order.items.reduce((s, it) => s + (it.quantity || 1), 0)} قطعة):</strong>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.image && <img src={item.image} alt="" style={{ width: '40px', height: '52px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                {[item.selectedSize && item.selectedSize !== 'عام' ? `مقاس ${item.selectedSize}` : null, item.selectedColor || null].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>×{item.quantity}</span>
                          </div>
                        ))}
                        {/* Amount breakdown so the courier can verify the cash */}
                        <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.3rem', paddingTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>المجموع الفرعي</span><span>{fmt(order.subtotal)}</span></div>
                          {Number(order.discount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>خصم</span><span>-{fmt(order.discount)}</span></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>الشحن</span><span>{Number(order.shipping) > 0 ? fmt(order.shipping) : 'مجاني'}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}><span>الإجمالي</span><span>{fmt(order.total)}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Existing reported issues */}
                    {order.hasDeliveryIssue && (order.deliveryIssues || []).length > 0 && (
                      <div style={{ background: '#fdecea', color: '#c0392b', padding: '0.5rem 0.7rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> بلاغ: {order.deliveryIssues[order.deliveryIssues.length - 1].reason}
                      </div>
                    )}

                    {/* Contact actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr 1fr 1fr' : '1fr', gap: '0.5rem' }}>
                      {phone && <a href={`tel:${phone}`} style={{ textAlign: 'center', padding: '0.7rem', background: '#e3f2fd', color: '#1976d2', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}><i className="fa-solid fa-phone"></i></a>}
                      {phone && <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" style={{ textAlign: 'center', padding: '0.7rem', background: '#e8f5e9', color: '#25D366', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}><i className="fa-brands fa-whatsapp"></i></a>}
                      <a href={stopUrl} target="_blank" rel="noreferrer" style={{ textAlign: 'center', padding: '0.7rem', background: '#f3e5f5', color: '#8e24aa', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}><i className="fa-solid fa-map-location-dot"></i></a>
                    </div>

                    {/* Primary + issue actions */}
                    {courierTab === 'to_deliver' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => updateOrderStatus(order, 'تم التوصيل')} style={{ flex: 2, padding: '0.9rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                          ✅ {order.paymentMethod === 'cash' ? `تم التسليم وحصّلت ${fmt(order.total)}` : 'تم التسليم'}
                        </button>
                        <button onClick={() => { setReportFor(order); setReportReason(ISSUE_REASONS[0]); setReportNote(''); }} style={{ flex: 1, padding: '0.9rem', background: 'transparent', color: '#e67e22', border: '1.5px solid #e67e22', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                          ⚠️ مشكلة
                        </button>
                      </div>
                    ) : (
                      <button disabled style={{ width: '100%', padding: '0.9rem', background: '#ecf0f1', color: '#95a5a6', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                        ✔️ تم التوصيل {order.paymentMethod === 'cash' ? `· حُصّل ${fmt(order.total)}` : '· مدفوع مسبقاً'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Report-issue modal */}
      {reportFor && (
        <div onClick={() => !reportBusy && setReportFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '1.5rem', width: 'min(440px, 100%)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginTop: 0 }}>⚠️ الإبلاغ عن مشكلة — #{reportFor.id.slice(0, 8)}</h3>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>نوع المشكلة</label>
            <select value={reportReason} onChange={e => setReportReason(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', marginBottom: '0.9rem' }}>
              {ISSUE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="تفاصيل إضافية (اختياري)…" rows={3} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={submitReport} disabled={reportBusy} style={{ flex: 1, padding: '0.8rem', background: '#e67e22', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                {reportBusy ? '...' : 'إرسال البلاغ للإدارة'}
              </button>
              <button onClick={() => setReportFor(null)} disabled={reportBusy} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#e74c3c' : '#27ae60', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 3000, fontWeight: 'bold' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
