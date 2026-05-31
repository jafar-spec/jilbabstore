"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getCustomerOrders } from '@/lib/db';

// ─── Style helpers ───────────────────────────────────────────────────────────

const getStatusStyle = (status) => {
  switch (status) {
    case 'تم التوصيل':
      return { bg: '#ecfdf5', color: '#059669', icon: 'fa-circle-check' };
    case 'جاري التوصيل':
      return { bg: '#fff7ed', color: '#ea580c', icon: 'fa-truck-fast' };
    case 'قيد المعالجة':
      return { bg: '#eff6ff', color: '#2563eb', icon: 'fa-spinner' };
    case 'ملغي':
      return { bg: '#fef2f2', color: '#dc2626', icon: 'fa-circle-xmark' };
    default:
      return { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-circle-question' };
  }
};

const getUserInitials = (user) => {
  if (user.displayName) {
    return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (user.email) return user.email[0].toUpperCase();
  if (user.phoneNumber) return user.phoneNumber.slice(-2);
  return '؟';
};

// ─── Shared inline styles ────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    paddingTop: '100px',
    paddingBottom: '4rem',
  },
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '0 1rem',
  },
  card: {
    background: 'var(--surface-color)',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardBody: {
    padding: '2.5rem',
  },
  input: {
    width: '100%',
    padding: '0.9rem 1rem',
    borderRadius: '12px',
    border: '1.5px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  },
  submitBtn: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.05rem',
    fontWeight: '700',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    background: 'var(--accent-color)',
    color: '#fff',
    transition: 'opacity 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    padding: '0.3rem 0',
    transition: 'opacity 0.2s',
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.25s ease',
    background: active ? 'var(--accent-color)' : 'var(--bg-color)',
    color: active ? '#fff' : 'var(--text-secondary)',
    boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
  }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [authMethod, setAuthMethod] = useState('phone');

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
  const [recaptchaKey, setRecaptchaKey] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const router = useRouter();

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userOrders = await getCustomerOrders(currentUser.uid);
          setOrders(userOrders);
        } catch (err) {
          console.error('Could not fetch orders', err);
        }
      } else {
        setUser(null);
        setOrders([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Email auth ───────────────────────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);
        setVerificationSent(true);
        setSuccess('تم إنشاء حسابك بنجاح! تحقق من بريدك الإلكتروني لتفعيل الحساب ثم سجّل الدخول.');
        await signOut(auth);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          await sendEmailVerification(userCred.user);
          setError('حسابك غير مفعّل بعد. تم إرسال رابط التفعيل مجدداً إلى بريدك الإلكتروني.');
          await signOut(auth);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل.');
      } else if (err.code === 'auth/user-not-found') {
        setError('لا يوجد حساب بهذا البريد الإلكتروني.');
      } else {
        setError(isSignUp ? 'حدث خطأ أثناء إنشاء الحساب.' : 'البيانات غير صحيحة.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('لا يوجد حساب مرتبط بهذا البريد الإلكتروني.');
      } else {
        setError('حدث خطأ. تأكد من صحة البريد الإلكتروني.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Phone auth (OTP) ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!localPhone) return setError('أدخل رقم الهاتف');

    const formattedLocal = localPhone.replace(/^0+/, '');
    const finalPhone = `${countryCode}${formattedLocal}`;

    setAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      const appVerifier = new RecaptchaVerifier(auth, `recaptcha-profile-${recaptchaKey}`, {
        size: 'invisible',
      });

      const result = await signInWithPhoneNumber(auth, finalPhone, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      setSuccess('تم إرسال رمز التحقق بنجاح.');
    } catch (err) {
      if (err.message && err.message.includes('reCAPTCHA client element has been removed')) {
        setRecaptchaKey((prev) => prev + 1);
        setError('جاري إعادة التهيئة، يرجى النقر على إرسال مرة أخرى.');
        setAuthLoading(false);
        return;
      }
      console.error(err);
      setError('حدث خطأ في إرسال الرمز. تأكد من صحة الرقم.');
      setRecaptchaKey((prev) => prev + 1);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    setAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      await confirmationResult.confirm(otp);
    } catch (err) {
      console.error(err);
      setError('الرمز الذي أدخلته غير صحيح. حاول مرة أخرى.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setOrders([]);
    router.refresh();
  }, [router]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, ...styles.cardBody }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center', padding: '4rem 0' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--accent-color)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>جاري التحميل...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-IN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {/* ── Welcome Banner ──────────────────────────────────── */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%)',
              borderRadius: '20px',
              padding: '2.5rem',
              marginBottom: '1.5rem',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-40px', right: '-20px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {/* Avatar */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  border: '2px solid rgba(255,255,255,0.35)',
                  flexShrink: 0,
                }}
              >
                {getUserInitials(user)}
              </div>

              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.3rem 0' }}>
                  مرحباً بك! 👋
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9, fontSize: '0.95rem', flexWrap: 'wrap' }}>
                  {user.phoneNumber ? (
                    <>
                      <i className="fa-solid fa-phone" style={{ fontSize: '0.85rem' }} />
                      <span dir="ltr">{user.phoneNumber}</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-envelope" style={{ fontSize: '0.85rem' }} />
                      <span>{user.email}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  padding: '0.65rem 1.4rem',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
              >
                <i className="fa-solid fa-right-from-bracket" />
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* ── Orders Section ──────────────────────────────────── */}
          <div style={styles.card}>
            <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-bag-shopping" style={{ color: 'var(--accent-color)' }} />
                طلباتي
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '0.3rem 0.8rem', borderRadius: '99px', fontWeight: '600' }}>
                {orders.length} {orders.length === 1 ? 'طلب' : 'طلبات'}
              </span>
            </div>

            <div style={{ padding: '1.5rem 2.5rem' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem' }}>
                    <i className="fa-solid fa-basket-shopping" style={{ fontSize: '2rem', color: 'var(--border-color)' }} />
                  </div>
                  <p style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    لا توجد طلبات بعد
                  </p>
                  <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    ابدأ التسوق واكتشف أحدث التصاميم
                  </p>
                  <Link
                    href="/"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.8rem 2rem',
                      background: 'var(--accent-color)',
                      color: '#fff',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <i className="fa-solid fa-store" />
                    تصفح المتجر
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map((order) => {
                    const statusInfo = getStatusStyle(order.status);
                    return (
                      <div
                        key={order.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '16px',
                          background: 'var(--bg-color)',
                          overflow: 'hidden',
                          transition: 'box-shadow 0.2s',
                        }}
                      >
                        {/* Order header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1.2rem 1.5rem',
                            borderBottom: '1px solid var(--glass-border)',
                            flexWrap: 'wrap',
                            gap: '0.8rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-hashtag" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
                              {order.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-regular fa-calendar" style={{ fontSize: '0.75rem' }} />
                              {new Date(order.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '0.35rem 1rem',
                              borderRadius: '99px',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              background: statusInfo.bg,
                              color: statusInfo.color,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <i className={`fa-solid ${statusInfo.icon}`} style={{ fontSize: '0.75rem' }} />
                            {order.status}
                          </span>
                        </div>

                        {/* Order items */}
                        <div style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {order.items?.map((item, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '0.8rem',
                                }}
                              >
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                  <img
                                    src={item.images?.[0] || item.image}
                                    alt=""
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      borderRadius: '10px',
                                      objectFit: 'cover',
                                      border: '1px solid var(--border-color)',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {item.title}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                      {item.selectedSize && <span>المقاس: {item.selectedSize}</span>}
                                      <span>×{item.quantity}</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                  ₪{(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order total */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '1rem',
                              paddingTop: '1rem',
                              borderTop: '1px dashed var(--border-color)',
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>الإجمالي</span>
                            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                              ₪{order.total?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-OUT VIEW (Auth forms)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Hidden recaptcha anchor */}
        <div key={recaptchaKey} id={`recaptcha-profile-${recaptchaKey}`} />

        <div style={styles.card}>
          {/* ── Header ─────────────────────────────────────────── */}
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 2.5rem 0',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <i className="fa-solid fa-user" style={{ fontSize: '1.6rem', color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>
              {showForgotPassword ? 'استعادة كلمة المرور' : 'مرحباً بك'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              {showForgotPassword
                ? 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور'
                : 'سجّل دخولك لتتبع طلباتك وإدارة حسابك'
              }
            </p>
          </div>

          <div style={styles.cardBody}>
            {/* ── Forgot Password Form ─────────────────────────── */}
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={styles.label}>البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setError(''); setSuccess(''); }}
                    placeholder="example@email.com"
                    style={styles.input}
                    dir="ltr"
                    required
                  />
                </div>

                {/* Messages */}
                {error && (
                  <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ padding: '0.85rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-circle-check" style={{ flexShrink: 0 }} />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{ ...styles.submitBtn, opacity: authLoading ? 0.7 : 1 }}
                >
                  {authLoading ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" /> جاري الإرسال...</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> إرسال رابط الاستعادة</>
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setError(''); setSuccess(''); }}
                    style={{ ...styles.linkBtn, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.8rem' }} />
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* ── Auth Method Tabs ──────────────────────────── */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', background: 'var(--bg-color)', padding: '5px', borderRadius: '14px' }}>
                  <button
                    onClick={() => { setAuthMethod('phone'); setError(''); setSuccess(''); }}
                    style={styles.tabBtn(authMethod === 'phone')}
                  >
                    <i className="fa-solid fa-mobile-screen-button" />
                    رقم الهاتف
                  </button>
                  <button
                    onClick={() => { setAuthMethod('email'); setError(''); setSuccess(''); }}
                    style={styles.tabBtn(authMethod === 'email')}
                  >
                    <i className="fa-solid fa-envelope" />
                    البريد الإلكتروني
                  </button>
                </div>

                {/* ── Phone Auth ────────────────────────────────── */}
                {authMethod === 'phone' ? (
                  <form
                    onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
                  >
                    {!showOtpInput ? (
                      <div>
                        <label style={styles.label}>
                          <i className="fa-solid fa-phone" style={{ marginLeft: '6px', color: 'var(--accent-color)', fontSize: '0.85rem' }} />
                          رقم الهاتف
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            style={{
                              ...styles.input,
                              width: '115px',
                              flex: 'none',
                              cursor: 'pointer',
                              appearance: 'none',
                              textAlign: 'center',
                              fontWeight: '600',
                            }}
                            dir="ltr"
                          >
                            <option value="+972">IL +972</option>
                            <option value="+970">PS +970</option>
                            <option value="+962">JO +962</option>
                            <option value="+20">EG +20</option>
                            <option value="+971">AE +971</option>
                            <option value="+966">SA +966</option>
                            <option value="+1">US +1</option>
                            <option value="+44">UK +44</option>
                          </select>
                          <input
                            type="tel"
                            placeholder="مثال: 0591234567"
                            value={localPhone}
                            onChange={(e) => { setLocalPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                            style={{ ...styles.input, flex: 1, letterSpacing: '1px', fontWeight: '500' }}
                            dir="ltr"
                            required
                          />
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-circle-info" style={{ fontSize: '0.75rem' }} />
                          يمكنك إدخال الرقم مع أو بدون الصفر في البداية
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label style={styles.label}>
                          <i className="fa-solid fa-shield-halved" style={{ marginLeft: '6px', color: 'var(--accent-color)', fontSize: '0.85rem' }} />
                          رمز التحقق
                        </label>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                          placeholder="••••••"
                          style={{
                            ...styles.input,
                            textAlign: 'center',
                            fontSize: '1.6rem',
                            letterSpacing: '10px',
                            fontWeight: '800',
                            padding: '1rem',
                          }}
                          dir="ltr"
                          maxLength={6}
                          autoFocus
                          required
                        />
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                          تم إرسال الرمز إلى <span dir="ltr" style={{ fontWeight: '600' }}>{countryCode}{localPhone.replace(/^0+/, '')}</span>
                        </p>
                      </div>
                    )}

                    {/* Messages */}
                    {error && (
                      <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0 }} />
                        {error}
                      </div>
                    )}
                    {success && (
                      <div style={{ padding: '0.85rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-check" style={{ flexShrink: 0 }} />
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      style={{ ...styles.submitBtn, opacity: authLoading ? 0.7 : 1 }}
                    >
                      {authLoading ? (
                        <><i className="fa-solid fa-circle-notch fa-spin" /> جاري التحميل...</>
                      ) : showOtpInput ? (
                        <><i className="fa-solid fa-arrow-right-to-bracket" /> تأكيد الدخول</>
                      ) : (
                        <><i className="fa-solid fa-paper-plane" /> إرسال رمز التحقق</>
                      )}
                    </button>

                    {showOtpInput && (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => { setShowOtpInput(false); setOtp(''); setError(''); setSuccess(''); }}
                          style={{ ...styles.linkBtn, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.8rem' }} />
                          تغيير رقم الهاتف
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  /* ── Email Auth ──────────────────────────────── */
                  <form
                    onSubmit={handleEmailAuth}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
                  >
                    <div>
                      <label style={styles.label}>
                        <i className="fa-solid fa-at" style={{ marginLeft: '6px', color: 'var(--accent-color)', fontSize: '0.85rem' }} />
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
                        placeholder="example@email.com"
                        style={styles.input}
                        dir="ltr"
                        required
                      />
                    </div>
                    <div>
                      <label style={styles.label}>
                        <i className="fa-solid fa-lock" style={{ marginLeft: '6px', color: 'var(--accent-color)', fontSize: '0.85rem' }} />
                        كلمة المرور
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); setSuccess(''); }}
                        placeholder={isSignUp ? '6 أحرف على الأقل' : '••••••••'}
                        style={styles.input}
                        dir="ltr"
                        required
                      />
                    </div>

                    {/* Messages */}
                    {error && (
                      <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0 }} />
                        {error}
                      </div>
                    )}
                    {success && (
                      <div style={{ padding: '0.85rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-check" style={{ flexShrink: 0 }} />
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      style={{ ...styles.submitBtn, opacity: authLoading ? 0.7 : 1 }}
                    >
                      {authLoading ? (
                        <><i className="fa-solid fa-circle-notch fa-spin" /> جاري التحميل...</>
                      ) : isSignUp ? (
                        <><i className="fa-solid fa-user-plus" /> إنشاء حساب جديد</>
                      ) : (
                        <><i className="fa-solid fa-arrow-right-to-bracket" /> تسجيل الدخول</>
                      )}
                    </button>

                    {/* Secondary actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); setVerificationSent(false); }}
                        style={styles.linkBtn}
                      >
                        {isSignUp ? 'لدي حساب بالفعل — تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                      </button>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setError(''); setSuccess(''); }}
                          style={{ ...styles.linkBtn, color: 'var(--text-secondary)', fontWeight: '500' }}
                        >
                          <i className="fa-solid fa-key" style={{ marginLeft: '4px', fontSize: '0.8rem' }} />
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
