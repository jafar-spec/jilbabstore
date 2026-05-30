"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, signOut } from 'firebase/auth';
import { getCustomerOrders } from '@/lib/db';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  
  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Phone Auth State
  const [countryCode, setCountryCode] = useState('+972');
  const [localPhone, setLocalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch their orders
        try {
          const userOrders = await getCustomerOrders(currentUser.uid); // Need to update db.js to search by uid
          setOrders(userOrders);
        } catch (err) {
          console.error("Could not fetch orders", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user && !loading && authMethod === 'phone' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-profile', {
        'size': 'invisible'
      });
    }
  }, [user, loading, authMethod]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);
        setVerificationSent(true);
        setError('تم إرسال رابط التفعيل إلى بريدك الإلكتروني. يرجى التفعيل ثم تسجيل الدخول.');
        await signOut(auth); // Sign out until verified
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          await sendEmailVerification(userCred.user);
          setError('يرجى التحقق من بريدك الإلكتروني (تم إرسال الرابط مجدداً).');
          await signOut(auth);
        }
      }
    } catch (err) {
      console.error(err);
      setError(isSignUp ? 'حدث خطأ أثناء إنشاء الحساب، ربما البريد مستخدم مسبقاً.' : 'البيانات غير صحيحة.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!localPhone) return setError('أدخل رقم الهاتف');
    
    // Format phone: remove leading zero from local phone if present
    const formattedLocal = localPhone.replace(/^0+/, '');
    const finalPhone = `${countryCode}${formattedLocal}`;
    
    setLoading(true);
    setError('');
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, finalPhone, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setError('');
    } catch (err) {
      console.error(err);
      setError(`حدث خطأ: ${err.message}`);
      if (window.recaptchaVerifier) window.recaptchaVerifier.render().then(wId => window.recaptchaVerifier.reset(wId));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    setLoading(true);
    setError('');
    
    try {
      await confirmationResult.confirm(otp);
    } catch (err) {
      console.error(err);
      setError('الرمز الذي أدخلته غير صحيح.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.refresh();
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>جاري التحميل...</div>;
  }

  return (
    <>
      <Navbar cartCount={0} />
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingTop: '100px', paddingBottom: '4rem' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {!user ? (
            <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div id="recaptcha-container-profile"></div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>تسجيل الدخول / إنشاء حساب</h1>
                <p style={{ color: 'var(--text-secondary)' }}>سجل دخولك لتتبع طلباتك وإدارة حسابك بسهولة</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
                <button 
                  onClick={() => { setAuthMethod('phone'); setError(''); }}
                  style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: authMethod === 'phone' ? 'var(--accent-color)' : 'var(--bg-color)', color: authMethod === 'phone' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  بواسطة رقم الهاتف
                </button>
                <button 
                  onClick={() => { setAuthMethod('email'); setError(''); }}
                  style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: authMethod === 'email' ? 'var(--accent-color)' : 'var(--bg-color)', color: authMethod === 'email' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  بواسطة البريد الإلكتروني
                </button>
              </div>

              {authMethod === 'phone' ? (
                <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {!showOtpInput ? (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>رقم الهاتف</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', outline: 'none', width: '110px' }}
                          dir="ltr"
                        >
                          <option value="+972">IL (+972)</option>
                          <option value="+970">PS (+970)</option>
                          <option value="+962">JO (+962)</option>
                          <option value="+20">EG (+20)</option>
                          <option value="+971">AE (+971)</option>
                          <option value="+966">SA (+966)</option>
                          <option value="+1">US (+1)</option>
                          <option value="+44">UK (+44)</option>
                        </select>
                        <input 
                          type="tel" 
                          placeholder="مثال: 0591234567" 
                          value={localPhone}
                          onChange={(e) => { setLocalPhone(e.target.value.replace(/\\D/g, '')); setError(''); }}
                          style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '1.1rem', letterSpacing: '1px' }}
                          dir="ltr"
                          required
                        />
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        يمكنك إدخال الرقم مع أو بدون الصفر في البداية.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>رمز التحقق المرسل لهاتفك</label>
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value); setError(''); }}
                        style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
                        dir="ltr"
                        maxLength={6}
                        required
                      />
                    </div>
                  )}
                  {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.9rem' }}>{error}</div>}
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                    {showOtpInput ? 'تأكيد الدخول' : 'إرسال الرمز'}
                  </button>
                  {showOtpInput && (
                    <button type="button" onClick={() => { setShowOtpInput(false); setOtp(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>تغيير رقم الهاتف</button>
                  )}
                </form>
              ) : (
                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>كلمة المرور</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
                      dir="ltr"
                      required
                    />
                  </div>
                  
                  {error && <div style={{ padding: '1rem', background: verificationSent ? '#f0fdf4' : '#fef2f2', color: verificationSent ? '#16a34a' : '#dc2626', borderRadius: '8px', border: `1px solid ${verificationSent ? '#bbf7d0' : '#fecaca'}`, fontSize: '0.9rem' }}>{error}</div>}
                  
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                    {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                  </button>
                  
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setVerificationSent(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                      {isSignUp ? 'لدي حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>مرحباً بك</h1>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {user.phoneNumber ? <><i className="fa-solid fa-phone"></i> <span dir="ltr">{user.phoneNumber}</span></> : <><i className="fa-solid fa-envelope"></i> <span>{user.email}</span></>}
                  </div>
                </div>
                <button onClick={handleLogout} style={{ padding: '0.8rem 1.5rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  تسجيل الخروج
                </button>
              </div>

              <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}><i className="fa-solid fa-box-open"></i> طلباتي السابقة</h2>
                
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', borderRadius: '12px' }}>
                    <i className="fa-solid fa-shopping-bag" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', display: 'block' }}></i>
                    لم تقم بأي طلبات بعد
                    <br/><br/>
                    <Link href="/" className="btn-primary" style={{ display: 'inline-block', padding: '0.8rem 1.5rem', marginTop: '1rem' }}>ابدأ التسوق</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orders.map((order, idx) => (
                      <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>طلب #{order.id.slice(0, 8)}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(order.date).toLocaleDateString('ar-SA')}</div>
                          </div>
                          <span style={{ padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 'bold', background: order.status === 'تم التوصيل' ? '#eafaf1' : '#fef2f2', color: order.status === 'تم التوصيل' ? '#27ae60' : '#dc2626' }}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {order.items?.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <img src={item.images?.[0] || item.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.title}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>المقاس: {item.selectedSize} × {item.quantity}</div>
                                </div>
                              </div>
                              <div style={{ fontWeight: 'bold' }}>₪{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>الإجمالي:</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>₪{order.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}
