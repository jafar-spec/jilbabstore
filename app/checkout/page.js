"use client";
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createOrder } from '@/lib/db';
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { amiriBase64 } from '@/lib/fonts/amiriBase64';
import JsBarcode from 'jsbarcode';

const fetchImageAsBase64 = async (url) => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

const generateBarcodeBase64 = (text) => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, { format: "CODE128", width: 2, height: 40, displayValue: true, fontSize: 14 });
    return canvas.toDataURL("image/png");
  } catch (error) {
    return null;
  }
};

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { showToast } = useToast();
  const { t, lang, storeSettings } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  
  const freeShippingThreshold = Number(storeSettings?.freeShippingThreshold) || 250;
  const shippingCost = Number(storeSettings?.shippingCost) || 30;
  
  const [step, setStep] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment Method: 'cash' | 'paypal' (card removed; PayPal billing to be wired up)
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: ''
  });

  useEffect(() => {
    setIsClient(true);
    if (user) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      showToast(t('fillShippingInfo'), 'error');
      return;
    }
    setStep(2);
  };

  // --- Fixed Promo Code Logic (client-side validation) ---
  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim();
    if (!code) return;
    
    setPromoLoading(true);
    try {
      // Query Firestore directly for the promo code
      const promoQuery = query(
        collection(db, 'promocodes'),
        where('code', '==', code.toUpperCase()),
        limit(1)
      );
      const snapshot = await getDocs(promoQuery);

      if (snapshot.empty) {
        setAppliedPromo(null);
        setDiscountAmount(0);
        showToast(t('invalidPromo') || 'كود الخصم غير صالح', 'error');
        setPromoLoading(false);
        return;
      }

      const promoData = snapshot.docs[0].data();

      // Check if expired
      if (promoData.expiresAt && new Date(promoData.expiresAt) < new Date()) {
        setAppliedPromo(null);
        setDiscountAmount(0);
        showToast('كود الخصم منتهي الصلاحية', 'error');
        setPromoLoading(false);
        return;
      }

      // Check if disabled
      if (promoData.active === false) {
        setAppliedPromo(null);
        setDiscountAmount(0);
        showToast('كود الخصم غير مفعّل', 'error');
        setPromoLoading(false);
        return;
      }

      // Normalize field names
      const discountValue = Number(promoData.discountValue || promoData.value || 0);
      const type = (promoData.type === 'percentage' ? 'percent' : promoData.type) || 'fixed';

      const promo = {
        valid: true,
        code: promoData.code,
        type: type,
        discountValue: discountValue
      };

      setAppliedPromo(promo);
      const cTotal = Number(cartTotal);
      let discount = 0;
      if (promo.type === 'percent') {
        discount = cTotal * (promo.discountValue / 100);
      } else if (promo.type === 'fixed') {
        discount = promo.discountValue;
      }
      // Cap discount at cart total
      discount = Math.min(discount, cTotal);
      setDiscountAmount(discount);
      showToast(t('promoApplied') || 'تم تطبيق كود الخصم!', 'success');
    } catch (error) {
      console.error('Promo validation error:', error);
      setAppliedPromo(null);
      setDiscountAmount(0);
      showToast(t('invalidPromo') || 'كود الخصم غير صالح', 'error');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setPromoCodeInput('');
  };

  const discountedSubtotal = Math.max(0, Number(cartTotal) - Number(discountAmount));
  const isFreeShipping = discountedSubtotal >= freeShippingThreshold;
  const shipping = isFreeShipping ? 0 : shippingCost;
  const finalTotal = discountedSubtotal + shipping;

  // --- Generate PDF Receipt ---
  const generateReceipt = async (orderId, newOrder) => {
    try {
      const doc = new jsPDF();
      doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      
      const logoBase64 = await fetchImageAsBase64(window.location.origin + '/assets/logo.png');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 85, 10, 40, 40);

      doc.setFont('Amiri', 'normal');
      doc.setFontSize(22);
      doc.text('فاتورة المتجر / RECEIPT', 105, 60, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Order ID: ${orderId}`, 20, 75);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 83);
      doc.text(`Customer: ${newOrder.customerInfo.fullName}`, 20, 91);
      doc.text(`Payment: ${newOrder.paymentMethod === 'cash' ? 'Cash on Delivery' : newOrder.paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card'}`, 20, 99);
      
      const tableColumn = ["صورة", "Item", "SKU", "Size", "Qty", "Price", "Total"];
      const tableRows = [];
      const itemImages = {};
      const itemBarcodes = {};

      for (let i = 0; i < newOrder.items.length; i++) {
        const item = newOrder.items[i];
        const imgBase64 = await fetchImageAsBase64(item.imageUrl || item.image);
        if (imgBase64) itemImages[i] = imgBase64;
        const skuCode = item.sku || item.id || 'N-A';
        const barcodeBase64 = generateBarcodeBase64(skuCode);
        if (barcodeBase64) itemBarcodes[i] = barcodeBase64;

        tableRows.push([
          "", item.title, "", item.selectedSize || item.size || 'عام',
          item.quantity.toString(), `${item.price.toFixed(2)} NIS`, `${(item.price * item.quantity).toFixed(2)} NIS`
        ]);
      }
      
      autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: 105, theme: 'grid',
        styles: { font: 'Amiri', fontSize: 10, minCellHeight: 25, valign: 'middle' },
        headStyles: { fillColor: [44, 43, 41] },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const base64Img = itemImages[data.row.index];
            if (base64Img) doc.addImage(base64Img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
          }
          if (data.section === 'body' && data.column.index === 2) {
            const barcodeBase64 = itemBarcodes[data.row.index];
            if (barcodeBase64) doc.addImage(barcodeBase64, 'JPEG', data.cell.x + 1, data.cell.y + 5, 30, 15);
            else doc.text(newOrder.items[data.row.index].sku || newOrder.items[data.row.index].id || 'N/A', data.cell.x + 2, data.cell.y + 15);
          }
        }
      });
      
      const finalY = doc.lastAutoTable.finalY || 100;
      doc.setFontSize(12);
      if (discountAmount > 0) {
        doc.text(`المجموع الفرعي / Subtotal: ${cartTotal.toFixed(2)} NIS`, 190, finalY + 15, { align: 'right' });
        doc.text(`الخصم / Discount (${appliedPromo.code}): -${discountAmount.toFixed(2)} NIS`, 190, finalY + 25, { align: 'right' });
      }
      doc.setFontSize(14);
      doc.text(`المبلغ الإجمالي / Total Amount: ${finalTotal.toFixed(2)} NIS`, 190, finalY + (discountAmount > 0 ? 40 : 20), { align: 'right' });
      doc.setFontSize(10);
      doc.text('شكراً لتسوقكم معنا! Thank you for shopping with Jilbab Store!', 105, finalY + (discountAmount > 0 ? 60 : 40), { align: 'center' });
      doc.save(`Receipt_${orderId}.pdf`);
    } catch (pdfError) {
      console.error("Failed to generate PDF:", pdfError);
    }
  };

  // --- Place Order ---
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    setIsProcessing(true);

    try {
      const sanitizedCart = cart.map(item => {
        const sanitizedItem = { ...item };
        delete sanitizedItem.images;
        delete sanitizedItem.image;
        delete sanitizedItem.description;
        return sanitizedItem;
      });

      // PayPal billing is not yet wired to a confirmation webhook, so an order is
      // never marked "paid" here — it stays pending until payment is confirmed.
      const orderStatus = paymentMethod === 'cash'
        ? 'قيد المعالجة (الدفع عند الاستلام)'
        : 'قيد المعالجة (بانتظار الدفع عبر PayPal)';

      const newOrder = {
        date: new Date().toISOString(),
        uid: user ? user.uid : null,
        customerInfo: { ...formData, email: user ? user.email : formData.email || '' },
        items: sanitizedCart,
        subtotal: Number(cartTotal) || 0,
        discount: Number(discountAmount) || 0,
        promoCode: appliedPromo ? appliedPromo.code : null,
        shipping: shipping || 0,
        total: Number(finalTotal) || 0,
        paymentMethod: paymentMethod,
        status: orderStatus
      };

      // Save/update customer profile in Firestore
      const saveCustomerProfile = async (orderId) => {
        try {
          if (!user) return; // Only save for logged-in users
          const customerRef = doc(db, 'customers', user.uid);
          await setDoc(customerRef, {
            uid: user.uid,
            fullName: formData.fullName || '',
            email: user.email || formData.email || '',
            phone1: formData.phone1 || '',
            phone2: formData.phone2 || '',
            city: formData.city || '',
            neighborhood: formData.neighborhood || '',
            street: formData.street || '',
            buildingFloor: formData.buildingFloor || '',
            lastOrderId: orderId,
            lastOrderDate: new Date().toISOString(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error('Error saving customer profile:', err);
        }
      };

      // For PayPal, redirect to PayPal
      if (paymentMethod === 'paypal') {
        // Create order first
        const orderId = await createOrder(newOrder);
        await saveCustomerProfile(orderId);
        
        // Build PayPal payment link
        const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        if (paypalClientId) {
          // Use PayPal checkout SDK
          showToast('جاري التحويل إلى PayPal...', 'info');
          // For now, create the order and redirect to PayPal.me or use PayPal buttons
          window.open(`https://www.paypal.com/paypalme/jilbabstore/${finalTotal.toFixed(2)}ILS`, '_blank');
        }
        
        await generateReceipt(orderId, newOrder);
        
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: orderId, value: finalTotal, currency: 'ILS',
            items: newOrder.items.map(item => ({ item_id: item.sku || item.id, item_name: item.title, price: item.price, quantity: item.quantity }))
          });
        }

        clearCart();
        showToast(`تم إنشاء الطلب بنجاح! ${orderId}`, 'success');
        router.push('/profile');
        return;
      }
      
      const orderId = await createOrder(newOrder);
      await saveCustomerProfile(orderId);
      await generateReceipt(orderId, newOrder);

      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: orderId, value: finalTotal, currency: 'ILS',
          items: newOrder.items.map(item => ({ item_id: item.sku || item.id, item_name: item.title, price: item.price, quantity: item.quantity }))
        });
      }

      clearCart();
      showToast(t('orderSuccess') + ` ${orderId}`, 'success');
      router.push('/profile');
    } catch (error) {
      console.error("Checkout error:", error);
      showToast(error.message || t('checkoutError'), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isClient) return null;

  if (cart.length === 0) {
    return (
      <main>
        <div style={{ paddingTop: '120px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>{t('emptyCart')}</h2>
          <Link href="/" className="btn-primary" style={{ marginTop: '20px' }}>{t('home')}</Link>
        </div>
      </main>
    );
  }

  const pmStyle = (method) => ({
    flex: 1,
    padding: '1rem',
    borderRadius: '12px',
    border: paymentMethod === method ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
    background: paymentMethod === method ? 'rgba(124,58,237,0.08)' : 'var(--surface-color)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  });

  return (
    <main>
      <div style={{ paddingTop: '100px', paddingBottom: '60px', maxWidth: '1000px', margin: '0 auto', paddingInline: '5%' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem' }}>{t('checkoutTitle')}</h1>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Form Section */}
          <div style={{ flex: '1 1 500px', background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            
            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => step > 1 && setStep(1)}>
                1. {t('shippingInfo')}
              </div>
              <div style={{ fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                2. {t('paymentInfo')}
              </div>
            </div>

            {step === 1 && (
              <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!user && (
                  <input required type="email" name="email" placeholder={t('email')} value={formData.email || ''} onChange={handleInputChange} style={inputStyle} />
                )}
                <input required type="text" name="fullName" placeholder={t('fullName')} value={formData.fullName} onChange={handleInputChange} style={inputStyle} />
                <input required type="tel" name="phone" placeholder={t('phone')} value={formData.phone} onChange={handleInputChange} style={inputStyle} />
                <input required type="text" name="city" placeholder={t('city')} value={formData.city} onChange={handleInputChange} style={inputStyle} />
                <textarea required name="address" placeholder={t('address')} value={formData.address} onChange={handleInputChange} style={{ ...inputStyle, minHeight: '100px' }}></textarea>
                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>{t('next')}</button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Payment Method Selection */}
                <div>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-wallet" style={{ marginLeft: '8px' }}></i>
                    اختر طريقة الدفع
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

                    {/* Cash on Delivery */}
                    <button type="button" onClick={() => setPaymentMethod('cash')} style={pmStyle('cash')}>
                      <i className="fa-solid fa-money-bill-wave" style={{ fontSize: '1.5rem', color: paymentMethod === 'cash' ? '#28a745' : 'var(--text-secondary)' }}></i>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: paymentMethod === 'cash' ? '#28a745' : 'var(--text-primary)' }}>الدفع عند الاستلام</span>
                    </button>

                    {/* PayPal */}
                    <button type="button" onClick={() => setPaymentMethod('paypal')} style={pmStyle('paypal')}>
                      <i className="fa-brands fa-paypal" style={{ fontSize: '1.5rem', color: paymentMethod === 'paypal' ? '#003087' : 'var(--text-secondary)' }}></i>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: paymentMethod === 'paypal' ? '#003087' : 'var(--text-primary)' }}>PayPal</span>
                    </button>
                  </div>
                </div>

                {/* Cash on Delivery Info */}
                {paymentMethod === 'cash' && (
                  <div style={{ background: 'linear-gradient(135deg, #f0fff4, #e8f5e9)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #c8e6c9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <i className="fa-solid fa-truck" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                      <strong style={{ color: '#2e7d32' }}>الدفع عند الاستلام</strong>
                    </div>
                    <p style={{ color: '#558b2f', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                      سيتم الدفع نقداً عند استلام الطلب من المندوب. يرجى التأكد من توفر المبلغ المطلوب.
                    </p>
                    <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #c8e6c9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#2e7d32' }}>المبلغ المطلوب:</span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1b5e20' }}>₪{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* PayPal Info */}
                {paymentMethod === 'paypal' && (
                  <div style={{ background: 'linear-gradient(135deg, #e3f2fd, #e8eaf6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bbdefb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <i className="fa-brands fa-paypal" style={{ color: '#003087', fontSize: '1.2rem' }}></i>
                      <strong style={{ color: '#003087' }}>الدفع عبر PayPal</strong>
                    </div>
                    <p style={{ color: '#1565c0', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                      سيتم تحويلك إلى PayPal لإتمام عملية الدفع بشكل آمن. يمكنك الدفع باستخدام رصيد PayPal أو بطاقتك الائتمانية.
                    </p>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ padding: '1rem', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '30px', cursor: 'pointer', flex: 1 }}>{t('back')}</button>
                  <button type="submit" className="btn-primary" disabled={isProcessing} style={{ padding: '1rem', flex: 2, opacity: isProcessing ? 0.7 : 1 }}>
                    {isProcessing ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> {t('processing')}</>
                    ) : paymentMethod === 'paypal' ? (
                      <><i className="fa-brands fa-paypal"></i> ادفع عبر PayPal</>
                    ) : (
                      <><i className="fa-solid fa-check"></i> تأكيد الطلب (الدفع عند الاستلام)</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Order Summary */}
          <div style={{ flex: '1 1 350px', background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t('cartTitle')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {cart.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', position: 'relative' }}>
                      <Image 
                        src={item.image || '/assets/black_jilbab_1779926556174.png'} 
                        fill 
                        alt={item.title}
                        style={{ objectFit: 'cover', borderRadius: '6px' }} 
                      />
                    </div>
                    <div>
                      <div>{item.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.selectedSize !== 'عام' && item.selectedSize}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>{item.price * item.quantity} {t('price')}</div>
                </div>
              ))}
            </div>
            
            {/* Promo Code Input */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 235, 59, 0.1)', borderRadius: '12px', border: '1px dashed #fbc02d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#f57f17', fontWeight: 'bold' }}>
                <i className="fa-solid fa-ticket"></i> {t('promoCode') || 'هل لديك كود خصم؟'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder={t('promoCode') || 'أدخل الكود هنا'} 
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                  style={{ ...inputStyle, flex: 1, border: '1px solid #fbc02d', background: '#fff' }}
                  disabled={appliedPromo !== null || promoLoading}
                />
                {appliedPromo ? (
                  <button type="button" onClick={removePromo} style={{ padding: '0 1.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {t('remove') || 'إلغاء'}
                  </button>
                ) : (
                  <button type="button" onClick={handleApplyPromo} disabled={promoLoading || !promoCodeInput.trim()} style={{ padding: '0 1.5rem', background: promoCodeInput.trim() ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', cursor: promoCodeInput.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', transition: '0.2s', minWidth: '80px' }}>
                    {promoLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : (t('apply') || 'تطبيق')}
                  </button>
                )}
              </div>
              {appliedPromo && (
                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-check-circle"></i>
                  <span>خصم {appliedPromo.type === 'percent' ? `${appliedPromo.discountValue}%` : `₪${appliedPromo.discountValue}`} — {appliedPromo.code}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'normal', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                <span>{t('subtotal')}</span>
                <span>{Number(cartTotal).toFixed(2)} {t('price')}</span>
              </div>
              
              {appliedPromo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'normal', fontSize: '1rem', color: '#28a745' }}>
                  <span>{t('discount')} ({appliedPromo.code})</span>
                  <span>-{Number(discountAmount).toFixed(2)} {t('price')}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'normal', fontSize: '0.9rem', color: isFreeShipping ? '#28a745' : 'var(--text-secondary)' }}>
                <span>{t('shipping') || 'الشحن'}</span>
                <span>{isFreeShipping ? (t('freeShipping') || 'مجاني ✓') : `${shipping.toFixed(2)} ${t('price')}`}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <span>{t('total')}</span>
                <span style={{ color: 'var(--accent-color)', fontSize: '1.3rem' }}>{Number(finalTotal).toFixed(2)} {t('price')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 15px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: '1rem'
};
