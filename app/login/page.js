"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Legacy courier login
    if (password === 'courier123') {
      sessionStorage.setItem('store_auth_role', 'courier');
      window.location.href = '/courier';
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await login(email, password);
      router.push('/admin');
    } catch (err) {
      console.error(err);
      const code = err.code || '';
      if (code === 'auth/user-not-found') {
        setError('هذا البريد الإلكتروني غير مسجل.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('كلمة المرور غير صحيحة.');
      } else if (code === 'auth/invalid-email') {
        setError('صيغة البريد الإلكتروني غير صحيحة.');
      } else if (code === 'auth/too-many-requests') {
        setError('محاولات كثيرة. حاول لاحقاً أو أعد تعيين كلمة المرور.');
      } else {
        setError(`خطأ: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('أدخل بريدك الإلكتروني أولاً ثم اضغط "نسيت كلمة المرور"');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('');
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('هذا البريد الإلكتروني غير مسجل.');
      } else {
        setError(`خطأ: ${err.message}`);
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>متجر <span>جلباب</span></div>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>بوابة الموظفين والمندوبين</h1>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <input 
              type="text" 
              placeholder="البريد الإلكتروني" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
              dir="ltr"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); setSuccess(''); }}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
              dir="ltr"
              required
            />
            {error && <p style={{ color: '#e74c3c', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</p>}
            {success && <p style={{ color: '#27ae60', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{success}</p>}
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={handleResetPassword}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', fontSize: '0.9rem' }}>العودة للمتجر الرئيسي</Link>
        </div>
      </div>
    </div>
  );
}
