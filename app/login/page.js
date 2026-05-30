"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, sendEmailVerification } from 'firebase/auth';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone state
  const [countryCode, setCountryCode] = useState('+972');
  const [localPhone, setLocalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  // Recaptcha initialization is now handled dynamically on submit

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        if (!verificationSent) {
          await sendEmailVerification(user);
          setVerificationSent(true);
        }
        setError('يرجى التحقق من بريدك الإلكتروني (تم إرسال رابط التفعيل).');
        setLoading(false);
        return;
      }
      
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
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
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, `recaptcha-${recaptchaKey}`, {
          'size': 'invisible'
        });
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, finalPhone, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setError('');
    } catch (err) {
      if (err.message && err.message.includes('reCAPTCHA client element has been removed')) {
        console.log('Recaptcha element removed, recreating and retrying...');
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch(e){}
          window.recaptchaVerifier = null;
        }
        // Force React to recreate the DOM node
        setRecaptchaKey(prev => prev + 1);
        setError('جاري إعادة التهيئة، يرجى النقر على إرسال مرة أخرى.');
        setLoading(false);
        return; // User needs to click again after React re-renders
      }

      console.error(err);
      setError(`حدث خطأ: ${err.message}`);
      // Clear recaptcha on error to fix 'client element has been removed' issues
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e){}
        window.recaptchaVerifier = null;
        setRecaptchaKey(prev => prev + 1);
      }
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
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setError('الرمز الذي أدخلته غير صحيح.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div key={recaptchaKey} id={`recaptcha-${recaptchaKey}`}></div>
      
      <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>متجر <span>جلباب</span></div>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>بوابة الموظفين والمندوبين</h1>
        </div>

        {/* Auth Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => { setAuthMethod('email'); setError(''); }}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: authMethod === 'email' ? 'var(--accent-color)' : 'var(--bg-color)', color: authMethod === 'email' ? '#fff' : 'var(--text-secondary)' }}
          >
            البريد الإلكتروني
          </button>
          <button 
            onClick={() => { setAuthMethod('phone'); setError(''); }}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: authMethod === 'phone' ? 'var(--accent-color)' : 'var(--bg-color)', color: authMethod === 'phone' ? '#fff' : 'var(--text-secondary)' }}
          >
            رقم الهاتف
          </button>
        </div>

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
                dir="ltr"
                required
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="كلمة المرور" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
                dir="ltr"
                required
              />
              {error && <p style={{ color: '#e74c3c', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</p>}
              {verificationSent && <p style={{ color: '#27ae60', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>تم إرسال رابط التفعيل، يرجى التحقق من صندوق الوارد.</p>}
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {!showOtpInput ? (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--surface-color)', color: 'var(--text-primary)', outline: 'none', width: '110px' }}
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
                    placeholder="رقم الهاتف (مثال: 0591234567)" 
                    value={localPhone}
                    onChange={(e) => { setLocalPhone(e.target.value.replace(/\\D/g, '')); setError(''); }}
                    style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', letterSpacing: '1px' }}
                    dir="ltr"
                    required
                  />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  يمكنك إدخال الرقم مع أو بدون الصفر في البداية. سيتم التحقق عبر رسالة SMS.
                </p>
                {error && <p style={{ color: '#e74c3c', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
              </div>
            ) : (
              <div>
                <input 
                  type="text" 
                  placeholder="رمز التحقق (6 أرقام)" 
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(''); }}
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', letterSpacing: '5px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                  dir="ltr"
                  maxLength={6}
                  required
                />
                {error && <p style={{ color: '#e74c3c', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
              </div>
            )}
            
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'جاري التحقق...' : (showOtpInput ? 'تأكيد الرمز' : 'إرسال رمز التحقق')}
            </button>
            
            {showOtpInput && (
              <button 
                type="button" 
                onClick={() => { setShowOtpInput(false); setConfirmationResult(null); setOtp(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                تغيير رقم الهاتف
              </button>
            )}
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', fontSize: '0.9rem' }}>العودة للمتجر الرئيسي</Link>
        </div>
      </div>
    </div>
  );
}
