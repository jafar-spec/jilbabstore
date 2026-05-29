"use client";
import { useState, useRef } from 'react';
import { createSupportTicket } from '@/lib/db';
import { useLanguage } from '@/context/LanguageContext';

const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX) { h = h * MAX / w; w = MAX; }
      if (h > MAX) { w = w * MAX / h; h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/webp', 0.65));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

export default function CustomerServiceWidget() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [submitting, setSubmitting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [previewImages, setPreviewImages] = useState([]);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    subject: '',
    message: '',
    images: []
  });

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    const compressed = await Promise.all(files.map(compressImage));
    setForm(f => ({ ...f, images: compressed }));
    setPreviewImages(compressed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.message) return;
    setSubmitting(true);
    try {
      const { token } = await createSupportTicket({
        name: form.name,
        email: form.email,
        phone: form.phone,
        orderNumber: form.orderNumber,
        subject: form.subject,
        message: form.message,
        images: form.images,
        lang
      });
      setGeneratedToken(token);
      setStep('success');
    } catch (err) {
      console.error(err);
      alert('Error submitting ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsOpen(false);
    setStep('form');
    setForm({ name: '', email: '', phone: '', orderNumber: '', subject: '', message: '', images: [] });
    setPreviewImages([]);
    setGeneratedToken('');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Customer Service"
        style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 1100,
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)',
          border: 'none', cursor: 'pointer', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', transition: 'transform 0.3s, box-shadow 0.3s'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; }}
        aria-label="Open Customer Service"
      >
        <i className="fa-solid fa-headset"></i>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) resetAndClose(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
        >
          <div style={{
            background: 'var(--bg-color)', borderRadius: '16px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)',
              padding: '1.5rem 2rem', borderRadius: '16px 16px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <i className="fa-solid fa-headset" style={{ fontSize: '1.4rem' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>خدمة العملاء</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Customer Support</div>
                </div>
              </div>
              <button onClick={resetAndClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.8 }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {step === 'form' ? (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    Fill in your details and we'll get back to you with a support token. أرسل لنا تفاصيل مشكلتك وسنتواصل معك.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        الاسم / Name *
                      </label>
                      <input
                        required value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full Name"
                        style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        الهاتف / Phone
                      </label>
                      <input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="05X-XXXXXXX"
                        style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        البريد / Email
                      </label>
                      <input
                        type="email" value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com"
                        style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        رقم الطلب / Order #
                      </label>
                      <input
                        value={form.orderNumber}
                        onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))}
                        placeholder="Optional"
                        style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      الموضوع / Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    >
                      <option value="">Select a topic...</option>
                      <option value="order_issue">مشكلة في الطلب / Order Issue</option>
                      <option value="return">استرداد / Return & Refund</option>
                      <option value="delivery">توصيل / Delivery</option>
                      <option value="product">سؤال عن منتج / Product Question</option>
                      <option value="payment">دفع / Payment</option>
                      <option value="other">أخرى / Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      الرسالة / Message *
                    </label>
                    <textarea
                      required value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      صور / Attach Images (max 3)
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '1rem',
                        textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)',
                        transition: 'border-color 0.3s', fontSize: '0.9rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <i className="fa-solid fa-camera" style={{ fontSize: '1.5rem', marginBottom: '6px', display: 'block' }}></i>
                      Click to upload photos
                      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                    {previewImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        {previewImages.map((src, i) => (
                          <img key={i} src={src} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-color)' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit" disabled={submitting}
                    style={{
                      padding: '0.9rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)',
                      color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em',
                      transition: 'opacity 0.3s', opacity: submitting ? 0.7 : 1
                    }}
                  >
                    {submitting ? '⏳ Submitting...' : '📩 Submit Ticket / إرسال'}
                  </button>
                </form>
              ) : (
                // Success State
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem', fontSize: '1.3rem' }}>
                    تم الإرسال! / Ticket Submitted!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Your support request has been received. Save your token to track your ticket status.
                  </p>
                  <div style={{
                    background: 'linear-gradient(135deg, var(--accent-color)22, #8b5cf622)',
                    border: '2px solid var(--accent-color)',
                    borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Your Support Token
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                      {generatedToken}
                    </div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(generatedToken); }}
                    style={{ padding: '0.7rem 1.5rem', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem' }}
                  >
                    <i className="fa-solid fa-copy"></i> Copy Token
                  </button>
                  <button
                    onClick={resetAndClose}
                    style={{
                      display: 'block', width: '100%', padding: '0.9rem', borderRadius: '10px', border: 'none',
                      background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer',
                      fontWeight: 600, fontSize: '1rem'
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
