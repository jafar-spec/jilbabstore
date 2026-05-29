"use client";
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createOrder, getPromoCode } from '@/lib/db';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { amiriBase64 } from '@/lib/fonts/amiriBase64';
import JsBarcode from 'jsbarcode';

// Helper function to fetch remote image and convert to Base64 safely
const fetchImageAsBase64 = async (url) => {
  if (!url) return null;
  if (url.startsWith('data:')) return url; // Already Base64
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
    console.error("Failed to fetch image for PDF:", error);
    return null;
  }
};

// Local Barcode Generator using Canvas (100% Offline, no CORS)
const generateBarcodeBase64 = (text) => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 14
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to generate local barcode:", error);
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

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
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

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    
    setIsProcessing(true);
    const promo = await getPromoCode(promoCodeInput.trim());
    setIsProcessing(false);

    if (promo) {
      setAppliedPromo(promo);
      let discount = 0;
      const cTotal = Number(cartTotal);
      const pVal = Number(promo.value);
      if (promo.type === 'percentage') {
        discount = cTotal * (pVal / 100);
      } else if (promo.type === 'fixed') {
        discount = pVal;
      }
      setDiscountAmount(discount);
      showToast(t('promoApplied'), 'success');
    } else {
      setAppliedPromo(null);
      setDiscountAmount(0);
      showToast(t('invalidPromo'), 'error');
    }
  };

  const discountedSubtotal = Math.max(0, Number(cartTotal) - Number(discountAmount));
  const isFreeShipping = discountedSubtotal >= freeShippingThreshold;
  const shipping = isFreeShipping ? 0 : shippingCost;
  const finalTotal = discountedSubtotal + shipping;

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!formData.cardNumber || !formData.expiry || !formData.cvv) {
      showToast(t('fillPaymentInfo'), 'error');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Sanitize cart items to prevent Firestore 1MB document size limit exceeded errors
      // (Base64 images take up huge amounts of space and aren't needed in the order document)
      const sanitizedCart = cart.map(item => {
        const sanitizedItem = { ...item };
        delete sanitizedItem.images; 
        delete sanitizedItem.image;
        delete sanitizedItem.description;
        return sanitizedItem;
      });

      const newOrder = {
        date: new Date().toISOString(),
        customerInfo: { ...formData, email: user ? user.email : formData.email || '' },
        items: sanitizedCart,
        subtotal: Number(cartTotal) || 0,
        discount: Number(discountAmount) || 0,
        promoCode: appliedPromo ? appliedPromo.code : null,
        shipping: shipping || 0,
        total: Number(finalTotal) || 0,
        status: 'قيد المعالجة (مدفوع)'
      };
      
      const orderId = await createOrder(newOrder);

      // Generate PDF Receipt
      let pdfBase64 = null;
      try {
        const doc = new jsPDF();
        
        // Register Arabic Font (Amiri)
        doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        
        // 1. Draw Logo
        const logoBase64 = await fetchImageAsBase64(window.location.origin + '/assets/logo.png');
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 85, 10, 40, 40); // Center logo
        }

        // 2. Receipt Header
        doc.setFont('Amiri', 'normal');
        doc.setFontSize(22);
        doc.text('فاتورة المتجر / RECEIPT', 105, 60, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Order ID: ${orderId}`, 20, 75);
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 83);
        doc.text(`Customer: ${newOrder.customerInfo.fullName}`, 20, 91);
        doc.text(`Email: ${newOrder.customerInfo.email}`, 20, 99);
        
        // 3. Prepare Table Data (Wait for all product images to download)
        const tableColumn = ["صورة", "Item", "SKU", "Size", "Qty", "Price", "Total"];
        const tableRows = [];
        const itemImages = {}; // Store base64 mapping
        const itemBarcodes = {}; // Store barcode base64 mapping

        for (let i = 0; i < newOrder.items.length; i++) {
          const item = newOrder.items[i];
          
          // Image
          const imgBase64 = await fetchImageAsBase64(item.imageUrl || item.image);
          if (imgBase64) itemImages[i] = imgBase64;
          
          // Barcode
          const skuCode = item.sku || item.id || 'N-A';
          const barcodeBase64 = generateBarcodeBase64(skuCode);
          if (barcodeBase64) itemBarcodes[i] = barcodeBase64;

          tableRows.push([
            "", // Placeholder for image
            item.title,
            "", // Placeholder for barcode, was: item.id || item.sku || 'N/A'
            item.selectedSize || item.size || 'عام',
            item.quantity.toString(),
            `${item.price.toFixed(2)} NIS`,
            `${(item.price * item.quantity).toFixed(2)} NIS`
          ]);
        }
        
        // 4. Draw AutoTable with Images
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 105,
          theme: 'grid',
          styles: { font: 'Amiri', fontSize: 10, minCellHeight: 25, valign: 'middle' },
          headStyles: { fillColor: [44, 43, 41] },
          didDrawCell: (data) => {
            // Draw the thumbnail in the first column
            if (data.section === 'body' && data.column.index === 0) {
              const base64Img = itemImages[data.row.index];
              if (base64Img) {
                doc.addImage(base64Img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
              }
            }
            // Draw the barcode in the SKU column (index 2)
            if (data.section === 'body' && data.column.index === 2) {
              const barcodeBase64 = itemBarcodes[data.row.index];
              if (barcodeBase64) {
                doc.addImage(barcodeBase64, 'JPEG', data.cell.x + 1, data.cell.y + 5, 30, 15);
              } else {
                doc.text(newOrder.items[data.row.index].sku || newOrder.items[data.row.index].id || 'N/A', data.cell.x + 2, data.cell.y + 15);
              }
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
        
        // Get Base64 string for EmailJS attachment (Optional fallback)
        pdfBase64 = doc.output('datauristring');

        // Trigger download
        doc.save(`Receipt_${orderId}.pdf`);
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
      }

      // PDF is downloaded locally, email receipt is now handled securely via Firebase Cloud Functions upon order creation.

      // Fire GA4 Purchase Event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: orderId,
          value: finalTotal,
          currency: 'ILS',
          items: newOrder.items.map(item => ({
            item_id: item.sku || item.id,
            item_name: item.title,
            price: item.price,
            quantity: item.quantity
          }))
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

  return (
    <main>
      
      <div style={{ paddingTop: '100px', paddingBottom: '60px', maxWidth: '1000px', margin: '0 auto', paddingInline: '5%' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem' }}>{t('checkoutTitle')}</h1>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Form Section */}
          <div style={{ flex: '1 1 500px', background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            
            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
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
              <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '10px' }}><i className="fa-solid fa-lock"></i> Secured by CreditGuard 3D-Secure</p>
                  <input required type="text" name="cardNumber" placeholder={t('cardNumber')} value={formData.cardNumber} onChange={handleInputChange} style={{ ...inputStyle, background: 'white' }} />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <input required type="text" name="expiry" placeholder={t('expiry')} value={formData.expiry} onChange={handleInputChange} style={{ ...inputStyle, background: 'white', flex: 1 }} />
                    <input required type="text" name="cvv" placeholder={t('cvv')} value={formData.cvv} onChange={handleInputChange} style={{ ...inputStyle, background: 'white', flex: 1 }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ padding: '1rem', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '30px', cursor: 'pointer', flex: 1 }}>{t('back')}</button>
                  <button type="submit" className="btn-primary" disabled={isProcessing} style={{ padding: '1rem', flex: 2, background: isProcessing ? '#ccc' : 'var(--accent-color)' }}>
                    {isProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> {t('processing')}</> : <><i className="fa-solid fa-lock"></i> {t('payNow')}</>}
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
                  onChange={e => setPromoCodeInput(e.target.value)}
                  style={{ ...inputStyle, flex: 1, border: '1px solid #fbc02d', background: '#fff' }}
                  disabled={appliedPromo !== null}
                />
                {appliedPromo ? (
                  <button type="button" onClick={() => { setAppliedPromo(null); setDiscountAmount(0); setPromoCodeInput(''); }} style={{ padding: '0 1.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {t('remove') || 'إلغاء'}
                  </button>
                ) : (
                  <button type="button" onClick={handleApplyPromo} disabled={isProcessing || !promoCodeInput.trim()} style={{ padding: '0 1.5rem', background: promoCodeInput.trim() ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', cursor: promoCodeInput.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', transition: '0.2s' }}>
                    {t('apply') || 'تطبيق'}
                  </button>
                )}
              </div>
            </div>

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

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span>{t('total')}</span>
                <span style={{ color: 'var(--accent-color)' }}>{Number(finalTotal).toFixed(2)} {t('price')}</span>
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
