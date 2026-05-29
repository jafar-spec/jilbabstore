"use client";
import { useEffect, useState } from 'react';
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

export default function AdminMap({ orders }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadMarkers = async () => {
      if (!orders || orders.length === 0) {
        setLoading(false);
        return;
      }

      // Only show orders that are pending or in delivery
      const activeOrders = orders.filter(o => ['قيد المعالجة', 'قيد المعالجة (مدفوع)', 'جاري التوصيل'].includes(o.status));
      const newMarkers = [];
      
      let count = 0;
      for (const order of activeOrders) {
        const addrObj = order.shipping || order.customerInfo;
        if (!addrObj) continue;
        
        const parts = [addrObj.city, addrObj.neighborhood, addrObj.street].filter(Boolean);
        if (parts.length === 0) continue;
        
        // strictly use ONLY the City name. Fuzzy matching on streets causes it to plot in the wrong city if the street isn't found.
        if (!addrObj.city) continue;
        
        let coords = await geocodeAddress(addrObj.city);
        
        if (coords) {
          // Add a tiny microscopic random offset so if 3 orders are from the exact same city, the pins don't stack invisibly on top of each other!
          // 0.0002 is roughly 20 meters.
          const offsetLat = (Math.random() - 0.5) * 0.0004;
          const offsetLng = (Math.random() - 0.5) * 0.0004;
          
          newMarkers.push({
            id: order.id,
            coords: [coords.lat + offsetLat, coords.lng + offsetLng],
            customerName: addrObj.fullName || 'غير متوفر',
            total: order.total,
            status: order.status,
            city: addrObj.city
          });
        }
        
        count++;
        setProgress(Math.round((count / activeOrders.length) * 100));
      }
      
      setMarkers(newMarkers);
      setLoading(false);
    };

    loadMarkers();
  }, [orders]);

  // Center on Israel/Palestine region by default
  const defaultCenter = [31.5, 34.75];

  return (
    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}><i className="fa-solid fa-map-location-dot"></i> خريطة التوزيع الجغرافي للطلبات</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              localStorage.removeItem('jilbabstore_geocache');
              window.location.reload();
            }}
            style={{ background: 'none', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <i className="fa-solid fa-rotate-right"></i> تحديث الخرائط
          </button>
          {loading && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-circle-notch fa-spin"></i> جاري تحميل الإحداثيات... {progress}%</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e74c3c', borderRadius: '50%' }}></span> قيد المعالجة
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3498db', borderRadius: '50%', marginLeft: '10px' }}></span> جاري التوصيل
            <span style={{ marginLeft: '15px', color: 'var(--text-secondary)' }}>
              (الطلبات النشطة: {orders?.filter(o => ['قيد المعالجة', 'قيد المعالجة (مدفوع)', 'جاري التوصيل'].includes(o.status)).length || 0} | الدبابيس: {markers.length})
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
        {typeof window !== 'undefined' && (
          <MapContainer center={defaultCenter} zoom={8} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map(marker => (
              <Marker key={marker.id} position={marker.coords}>
                <Popup>
                  <div style={{ textAlign: 'right', direction: 'rtl', fontFamily: 'var(--font-sans)', padding: '5px' }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{marker.customerName}</strong>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                      الطلب: #{marker.id.slice(0,8)}<br/>
                      المدينة: {marker.city}
                    </div>
                    <div style={{ 
                      background: marker.status.includes('قيد المعالجة') ? '#fdecea' : '#e3f2fd', 
                      color: marker.status.includes('قيد المعالجة') ? '#e74c3c' : '#1976d2', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      display: 'inline-block', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                      marginBottom: '8px'
                    }}>
                      {marker.status}
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                      ₪{marker.total?.toFixed(2)}
                    </div>
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
