"use client";
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { geocodeAddress } from '@/lib/geocoding';

// Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

// Dynamically import react-leaflet components (disabling SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

const isActive = (s) => !!s && (s.includes('قيد المعالجة') || s === 'جاري التوصيل');
const isDelivering = (s) => s === 'جاري التوصيل';

// Haversine distance (km) — good enough to order stops geographically.
function distKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Nearest-neighbour ordering of stops starting from `origin`.
function orderRoute(origin, stops) {
  const remaining = [...stops];
  const route = [];
  let cur = origin;
  while (remaining.length) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distKm(cur, remaining[i].coords);
      if (d < bestD) { bestD = d; best = i; }
    }
    const next = remaining.splice(best, 1)[0];
    route.push(next);
    cur = next.coords;
  }
  return route;
}

export default function AdminMap({ orders, origin = [31.5, 34.75], storeName = 'المتجر' }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [L, setL] = useState(null);

  useEffect(() => { import('leaflet').then((m) => setL(m.default || m)); }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMarkers = async () => {
      if (!orders || orders.length === 0) { setLoading(false); return; }
      setLoading(true);

      const activeOrders = orders.filter(o => isActive(o.status));
      const newMarkers = [];
      let count = 0;

      for (const order of activeOrders) {
        const addrObj = order.shipping || order.customerInfo || {};
        let coords = null;
        let precise = false;

        // 1) Precise coordinates stored on the order at creation time.
        if (order.geo && Number.isFinite(order.geo.lat) && Number.isFinite(order.geo.lng)) {
          coords = { lat: order.geo.lat, lng: order.geo.lng };
          precise = true;
        } else if (addrObj.city) {
          // 2) Fallback for legacy orders: geocode the city client-side.
          coords = await geocodeAddress(addrObj.city);
        }

        if (coords) {
          // Only jitter the imprecise (city-level) fallback pins so identical
          // cities don't stack. Precise pins are placed exactly.
          const jitter = precise ? 0 : (Math.random() - 0.5) * 0.0004;
          newMarkers.push({
            id: order.id,
            coords: [coords.lat + jitter, coords.lng + jitter],
            customerName: addrObj.fullName || 'غير متوفر',
            phone: addrObj.phone || '',
            address: [addrObj.city, addrObj.neighborhood, addrObj.street, addrObj.address].filter(Boolean).join('، '),
            total: order.total,
            status: order.status,
            city: addrObj.city || '',
            precise
          });
        }
        count++;
        if (!cancelled) setProgress(Math.round((count / activeOrders.length) * 100));
      }

      if (!cancelled) { setMarkers(newMarkers); setLoading(false); }
    };

    loadMarkers();
    return () => { cancelled = true; };
  }, [orders]);

  // Build the optimised delivery route over the "out for delivery" stops.
  const route = useMemo(() => {
    const stops = markers.filter(m => isDelivering(m.status));
    return orderRoute(origin, stops);
  }, [markers, origin]);

  const routeIndex = useMemo(() => {
    const map = new Map();
    route.forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [route]);

  const polyline = useMemo(() => [origin, ...route.map(m => m.coords)], [origin, route]);

  // Google Maps multi-stop directions link (origin → stops in optimised order).
  const gmapsUrl = useMemo(() => {
    if (!route.length) return null;
    const pts = [origin, ...route.map(m => m.coords)].map(c => `${c[0]},${c[1]}`);
    return `https://www.google.com/maps/dir/${pts.join('/')}`;
  }, [origin, route]);

  // Numbered (delivery) / coloured-dot (processing) marker icons.
  const iconFor = (marker) => {
    if (!L) return undefined;
    const seq = routeIndex.get(marker.id);
    if (seq) {
      return L.divIcon({
        className: 'js-route-pin',
        html: `<div style="background:#1976d2;color:#fff;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff;"><span style="transform:rotate(45deg);font-weight:700;font-size:13px;">${seq}</span></div>`,
        iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28]
      });
    }
    return L.divIcon({
      className: 'js-proc-pin',
      html: `<div style="background:#e74c3c;width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10]
    });
  };

  const totalKm = useMemo(() => {
    let d = 0;
    for (let i = 1; i < polyline.length; i++) d += distKm(polyline[i - 1], polyline[i]);
    return d;
  }, [polyline]);

  const activeCount = orders?.filter(o => isActive(o.status)).length || 0;

  return (
    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}><i className="fa-solid fa-map-location-dot"></i> خريطة التوزيع الجغرافي للطلبات</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {gmapsUrl && (
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a73e8', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
              <i className="fa-solid fa-route"></i> فتح المسار في خرائط Google ({route.length} محطة · {totalKm.toFixed(1)} كم)
            </a>
          )}
          <button
            onClick={() => { localStorage.removeItem('jilbabstore_geocache'); window.location.reload(); }}
            style={{ background: 'none', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-rotate-right"></i> تحديث الخرائط
          </button>
          {loading && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-circle-notch fa-spin"></i> جاري تحميل الإحداثيات... {progress}%</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e74c3c', borderRadius: '50%' }}></span> قيد المعالجة
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#1976d2', borderRadius: '50%', marginLeft: '10px' }}></span> جاري التوصيل (مُرقّم بترتيب المسار)
            <span style={{ marginLeft: '15px', color: 'var(--text-secondary)' }}>
              (النشطة: {activeCount} | الدبابيس: {markers.length})
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
        {typeof window !== 'undefined' && (
          <MapContainer center={origin} zoom={8} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Optimised delivery route */}
            {route.length > 0 && <Polyline positions={polyline} pathOptions={{ color: '#1976d2', weight: 3, opacity: 0.7, dashArray: '6 8' }} />}

            {/* Store origin marker */}
            {L && (
              <Marker position={origin} icon={L.divIcon({
                className: 'js-store-pin',
                html: `<div style="background:#16a34a;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);"><span style="font-size:12px;">🏪</span></div>`,
                iconSize: [26, 26], iconAnchor: [13, 13]
              })}>
                <Popup><div style={{ direction: 'rtl', textAlign: 'right' }}><strong>{storeName}</strong><br />نقطة انطلاق المسار</div></Popup>
              </Marker>
            )}

            {markers.map(marker => (
              <Marker key={marker.id} position={marker.coords} icon={iconFor(marker)}>
                <Popup>
                  <div style={{ textAlign: 'right', direction: 'rtl', fontFamily: 'var(--font-sans)', padding: '5px', minWidth: '180px' }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                      {routeIndex.get(marker.id) ? `محطة ${routeIndex.get(marker.id)} · ` : ''}{marker.customerName}
                    </strong>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                      الطلب: #{marker.id.slice(0, 8)}<br />
                      {marker.address || marker.city}
                      {!marker.precise && <span style={{ color: '#e67e22' }}><br />(موقع تقريبي — مستوى المدينة)</span>}
                    </div>
                    {marker.phone && (
                      <a href={`tel:${marker.phone}`} style={{ color: '#1976d2', textDecoration: 'none', display: 'block', marginBottom: '6px' }}>
                        <i className="fa-solid fa-phone"></i> {marker.phone}
                      </a>
                    )}
                    <div style={{
                      background: marker.status.includes('قيد المعالجة') ? '#fdecea' : '#e3f2fd',
                      color: marker.status.includes('قيد المعالجة') ? '#e74c3c' : '#1976d2',
                      padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px'
                    }}>
                      {marker.status}
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '6px' }}>
                      ₪{marker.total?.toFixed(2)}
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${marker.coords[0]},${marker.coords[1]}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#1a73e8', textDecoration: 'none' }}>
                      <i className="fa-solid fa-location-arrow"></i> التوجّه إلى هنا
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
