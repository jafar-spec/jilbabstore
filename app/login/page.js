"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      sessionStorage.setItem('store_auth_role', 'operator');
      router.push('/admin');
    } else if (password === 'courier123') {
      sessionStorage.setItem('store_auth_role', 'courier');
      router.push('/admin');
    } else {
      setError('كلمة المرور غير صحيحة');
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
              type="password" 
              placeholder="كلمة المرور" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}
              dir="ltr"
            />
            {error && <p style={{ color: '#e74c3c', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>تسجيل الدخول</button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', fontSize: '0.9rem' }}>العودة للمتجر الرئيسي</Link>
        </div>
      </div>
    </div>
  );
}
