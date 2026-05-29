"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getCustomerOrders } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading, login, register, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authProcessing, setAuthProcessing] = useState(false);
  
  const [orders, setOrders] = useState([]);
  const [fetchingOrders, setFetchingOrders] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setFetchingOrders(true);
    try {
      const data = await getCustomerOrders(user.email);
      setOrders(data);
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء جلب الطلبات", "error");
    } finally {
      setFetchingOrders(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthProcessing(true);
    try {
      if (isLoginMode) {
        await login(email, password);
        showToast("تم تسجيل الدخول بنجاح!", "success");
      } else {
        await register(email, password);
        showToast("تم إنشاء الحساب بنجاح!", "success");
      }
    } catch (error) {
      console.error(error);
      const msg = error.code === 'auth/email-already-in-use' ? 'البريد الإلكتروني مستخدم مسبقاً' : 
                  error.code === 'auth/wrong-password' ? 'كلمة المرور غير صحيحة' : 
                  error.code === 'auth/user-not-found' ? 'المستخدم غير موجود' : 'بيانات الدخول غير صحيحة';
      showToast(msg, "error");
    } finally {
      setAuthProcessing(false);
    }
  };

  if (loading) {
    return (
      <main>
        
        <div style={{ textAlign: 'center', padding: '10rem 0' }}>جاري التحميل...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
      
      
      <div style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '4rem 2rem' }}>
        
        {!user ? (
          <div style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--surface-color)', padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '2rem', textAlign: 'center', fontFamily: 'var(--font-serif)' }}>
              {isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </h1>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>كلمة المرور</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <button type="submit" disabled={authProcessing} className="btn-primary" style={{ padding: '1rem', marginTop: '1rem' }}>
                {authProcessing ? 'جاري المعالجة...' : isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
              <button onClick={() => setIsLoginMode(!isLoginMode)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}>
                {isLoginMode ? 'لا تملك حساباً؟ أنشئ حساباً جديداً' : 'لديك حساب بالفعل؟ سجل دخولك'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>حسابي</h1>
                <p style={{ color: 'var(--text-secondary)' }}>مرحباً بك، {user.email}</p>
              </div>
              <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                تسجيل الخروج
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)' }}>طلباتي السابقة</h2>
              
              {fetchingOrders ? (
                <div>جاري جلب الطلبات...</div>
              ) : orders.length === 0 ? (
                <div style={{ background: 'var(--surface-color)', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                  <p>لم تقم بأي طلبات بعد.</p>
                  <button onClick={() => router.push('/')} className="btn-primary" style={{ marginTop: '1.5rem', padding: '0.8rem 2rem' }}>تصفح المتجر</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map(order => (
                    <div key={order.id} style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>طلب رقم: #{order.id.slice(0,8).toUpperCase()}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>التاريخ: {new Date(order.date).toLocaleDateString('ar-EG')}</div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>الحالة:</span>
                          <span style={{ 
                            padding: '0.2rem 0.8rem', 
                            borderRadius: '20px', 
                            fontSize: '0.8rem', 
                            background: order.status.includes('مدفوع') ? '#e8f5e9' : 'var(--bg-color)',
                            color: order.status.includes('مدفوع') ? '#2e7d32' : 'var(--text-primary)',
                            border: '1px solid var(--glass-border)'
                          }}>
                            {order.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>الإجمالي: ₪{order.total}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      
    </main>
  );
}
