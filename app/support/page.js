"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { createSupportTicket } from '@/lib/db'; // We need to add this
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

export default function SupportPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    subject: '',
    message: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submittedToken, setSubmittedToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Generate a random support token (e.g., TKT-123456)
      const token = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await createSupportTicket({
        ...formData,
        token,
        status: 'open',
        createdAt: new Date().toISOString()
      });
      
      setSubmittedToken(token);
      showToast('تم إرسال تذكرتك بنجاح!', 'success');
      
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الإرسال', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar cartCount={0} />
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingTop: '120px', paddingBottom: '4rem' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              خدمة العملاء
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              نحن هنا لمساعدتك. يرجى تعبئة النموذج أدناه وسيقوم فريق الدعم بالتواصل معك.
            </p>
          </div>

          {!submittedToken ? (
            <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الاسم الكامل *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>رقم الهاتف *</label>
                    <input 
                      type="tel" 
                      required 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      dir="ltr"
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>البريد الإلكتروني (اختياري)</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      dir="ltr"
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>رقم الطلب (إن وجد)</label>
                    <input 
                      type="text" 
                      value={formData.orderNumber}
                      onChange={e => setFormData({...formData, orderNumber: e.target.value})}
                      dir="ltr"
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الموضوع *</label>
                  <select 
                    required 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                  >
                    <option value="">-- اختر الموضوع --</option>
                    <option value="استفسار عن طلب">استفسار عن طلب</option>
                    <option value="تغيير مقاس أو إرجاع">تغيير مقاس أو إرجاع</option>
                    <option value="مشكلة في التوصيل">مشكلة في التوصيل</option>
                    <option value="شكوى">شكوى</option>
                    <option value="اقتراح">اقتراح</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>رسالتك بالتفصيل *</label>
                  <textarea 
                    required 
                    rows={5}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', resize: 'vertical' }}
                  ></textarea>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                  {loading ? 'جاري الإرسال...' : 'إرسال التذكرة'}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-color)', padding: '4rem 2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <i className="fa-solid fa-check-circle" style={{ fontSize: '5rem', color: '#27ae60', marginBottom: '1.5rem' }}></i>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>تم استلام رسالتك</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                سيقوم فريق الدعم الفني بمراجعة تذكرتك والرد عليك في أقرب وقت.
              </p>
              
              <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '2rem' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>رقم تذكرتك المرجعي:</span>
                <strong style={{ fontSize: '1.8rem', letterSpacing: '2px', color: 'var(--accent-color)' }}>{submittedToken}</strong>
              </div>

              <div>
                <Link href="/" className="btn-primary" style={{ padding: '1rem 2rem' }}>العودة للتسوق</Link>
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}
