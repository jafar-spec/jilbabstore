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
  signOut,
  deleteUser
} from 'firebase/auth';
import { getCustomerOrders, getMyReturnRequests, requestReturn, getCustomerProfile, requestAccountDeletion, saveCustomerAddresses } from '@/lib/db';

// An order can be cancelled by the customer only while it is still processing
// and its stock is merely reserved (server re-checks this authoritatively).
const isCancellable = (o) => (o.status || '').startsWith('قيد المعالجة') && (o.stockState || 'reserved') === 'reserved';
const EMPTY_ADDR = { label: '', fullName: '', phone1: '', phone2: '', city: '', neighborhood: '', street: '', notes: '' };

// ─── Style helpers ───────────────────────────────────────────────────────────

const getStatusStyle = (status) => {
  const s = status || '';
  if (s === 'تم التوصيل') return { bg: '#ecfdf5', color: '#059669', icon: 'fa-circle-check' };
  if (s === 'جاري التوصيل') return { bg: '#fff7ed', color: '#ea580c', icon: 'fa-truck-fast' };
  if (s === 'تم التجهيز') return { bg: '#eef2ff', color: '#4f46e5', icon: 'fa-box-open' };
  if (s.includes('قيد المعالجة')) return { bg: '#eff6ff', color: '#2563eb', icon: 'fa-spinner' };
  if (s === 'ملغي') return { bg: '#fef2f2', color: '#dc2626', icon: 'fa-circle-xmark' };
  if (s === 'مرتجع') return { bg: '#fdf4ff', color: '#a21caf', icon: 'fa-rotate-left' };
  return { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-circle-question' };
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

  // Returns self-service: my requests by orderId + the inline form state.
  const [returnsByOrder, setReturnsByOrder] = useState({});
  const [returnFor, setReturnFor] = useState(null);   // orderId with form open
  const [returnReason, setReturnReason] = useState('');
  const [returnBusy, setReturnBusy] = useState(false);

  // Order cancellation (self-service, before fulfilment).
  const [cancelBusy, setCancelBusy] = useState(null); // orderId in flight

  // Address book (saved delivery addresses, prefilled at checkout).
  const [addresses, setAddresses] = useState([]);
  const [defaultIdx, setDefaultIdx] = useState(0);
  const [addrForm, setAddrForm] = useState(null);     // index | 'new' | null
  const [addrDraft, setAddrDraft] = useState(EMPTY_ADDR);
  const [addrBusy, setAddrBusy] = useState(false);

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
          const userOrders = await getCustomerOrders(currentUser.uid, currentUser.email);
          setOrders(userOrders);
          const myReturns = await getMyReturnRequests(currentUser.uid);
          const map = {};
          myReturns.forEach(r => { map[r.orderId] = r; });
          setReturnsByOrder(map);
          const profile = await getCustomerProfile(currentUser.uid).catch(() => null);
          if (profile?.addresses?.length) {
            setAddresses(profile.addresses);
            setDefaultIdx(Number(profile.defaultAddressIndex) || 0);
          }
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

  // ── Return request ─────────────────────────────────────────────────────────
  const submitReturn = async (order) => {
    if (returnBusy) return;
    setReturnBusy(true);
    try {
      await requestReturn({
        orderId: order.id,
        uid: user?.uid,
        reason: returnReason,
        items: (order.items || []).map(i => ({ title: i.title, quantity: i.quantity, sku: i.sku || null, selectedSize: i.selectedSize || '' })),
      });
      setReturnsByOrder(prev => ({ ...prev, [order.id]: { orderId: order.id, status: 'pending', reason: returnReason } }));
      setReturnFor(null);
      setReturnReason('');
    } catch (err) {
      console.error('return request failed', err);
      alert('تعذّر إرسال طلب الإرجاع، حاول مرة أخرى');
    } finally {
      setReturnBusy(false);
    }
  };

  const RETURN_STATUS_AR = { pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض', done: 'تم الاسترداد' };

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

  // ── Privacy: export + delete my data ─────────────────────────────────────
  const exportMyData = useCallback(async () => {
    try {
      const profile = await getCustomerProfile(user?.uid).catch(() => null);
      const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const origin = window.location.origin;
      const name = user?.displayName || profile?.fullName || '—';

      const orderRows = (orders || []).map(o => {
        const items = (o.items || []).map(it => `${esc(it.title)}${it.selectedSize && it.selectedSize !== 'عام' ? ` (${esc(it.selectedSize)})` : ''} ×${it.quantity}`).join('، ');
        const d = o.date?.toDate ? o.date.toDate() : (o.date || o.createdAt);
        return `<tr>
          <td>#${esc(String(o.id).slice(0, 8).toUpperCase())}</td>
          <td>${d ? new Date(d).toLocaleDateString('ar-EG') : '—'}</td>
          <td>${esc(o.status || '—')}</td>
          <td>${esc(items)}</td>
          <td style="white-space:nowrap;">₪${(Number(o.total) || 0).toFixed(2)}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;">لا توجد طلبات</td></tr>';

      const returns = Object.values(returnsByOrder);
      const returnRows = returns.length
        ? returns.map(r => `<tr><td>#${esc(String(r.orderId || '').slice(0, 8).toUpperCase())}</td><td>${esc(r.status || '')}</td><td>${esc(r.reason || '')}</td></tr>`).join('')
        : '';

      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
        <title>بياناتي — متجر جلباب</title>
        <style>
          *{box-sizing:border-box} body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1c1a19;max-width:820px;margin:0 auto;padding:28px;line-height:1.7;}
          .hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:18px;}
          .hd img{width:54px;height:54px;object-fit:contain;}
          .hd h1{font-size:1.5rem;margin:0;} .muted{color:#777;font-size:.85rem;}
          h2{font-size:1.05rem;margin:22px 0 8px;border-bottom:1px solid #e5e5e5;padding-bottom:4px;}
          .box{background:#f7f5f2;border:1px solid #eee;border-radius:10px;padding:12px 14px;font-size:.92rem;line-height:1.9;}
          table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:6px;}
          th,td{border-bottom:1px solid #eee;padding:8px 6px;text-align:right;vertical-align:top;}
          th{background:#f3f0ec;}
          .print{margin:22px 0;text-align:center;} .print button{background:#141414;color:#fff;border:none;border-radius:999px;padding:10px 28px;font-size:1rem;cursor:pointer;}
          .ftr{margin-top:24px;border-top:1px solid #eee;padding-top:12px;color:#999;font-size:.78rem;text-align:center;}
          @media print{.print{display:none}body{padding:0}}
        </style></head><body>
        <div class="hd">
          <img src="${origin}/assets/logo.png" alt=""/>
          <div><h1>بياناتي الشخصية</h1><div class="muted">JILBABSTORE — My personal data · ${new Date().toLocaleDateString('ar-EG')}</div></div>
        </div>
        <h2>معلومات الحساب</h2>
        <div class="box">
          <strong>الاسم:</strong> ${esc(name)}<br/>
          <strong>البريد:</strong> ${esc(user?.email || profile?.email || '—')}<br/>
          <strong>الهاتف:</strong> ${esc(user?.phoneNumber || profile?.phone1 || profile?.phone || '—')}<br/>
          <strong>المدينة:</strong> ${esc(profile?.city || '—')}<br/>
          <strong>العنوان:</strong> ${esc(profile?.street || profile?.address || '—')}<br/>
          <strong>معرّف المستخدم:</strong> <span class="muted">${esc(user?.uid || '')}</span>
        </div>
        <h2>الطلبات (${(orders || []).length})</h2>
        <table><thead><tr><th>الطلب</th><th>التاريخ</th><th>الحالة</th><th>المنتجات</th><th>الإجمالي</th></tr></thead><tbody>${orderRows}</tbody></table>
        ${returnRows ? `<h2>طلبات الإرجاع (${returns.length})</h2><table><thead><tr><th>الطلب</th><th>الحالة</th><th>السبب</th></tr></thead><tbody>${returnRows}</tbody></table>` : ''}
        <div class="print"><button onclick="window.print()">🖨️ حفظ كـ PDF / طباعة</button></div>
        <div class="ftr">هذا المستند يحتوي على البيانات الشخصية المحفوظة لديك في متجر جلباب. صُدر بتاريخ ${new Date().toLocaleString('ar-EG')}.</div>
        <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
        </body></html>`;

      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else alert('يرجى السماح بالنوافذ المنبثقة لحفظ ملف PDF');
    } catch (err) { console.error('export failed', err); alert('تعذّر تنزيل البيانات'); }
  }, [user, orders, returnsByOrder]);

  const deleteMyAccount = useCallback(async () => {
    if (!user) return;
    if (!window.confirm('سيتم تقديم طلب حذف حسابك وبياناتك الشخصية. الطلبات تُحفظ كما يقتضي القانون الضريبي. متابعة؟')) return;
    try {
      await requestAccountDeletion(user.uid, user.email || '');
      try { await deleteUser(user); } catch (e) { /* may need recent login; request is filed regardless */ }
      await signOut(auth).catch(() => {});
      alert('تم استلام طلب الحذف. سنكمل المعالجة قريباً.');
      router.refresh();
    } catch (err) { console.error('deletion failed', err); alert('تعذّر تقديم الطلب، حاول لاحقاً'); }
  }, [user, router]);

  // ── Cancel an order (self-service) ───────────────────────────────────────
  const cancelOrder = async (order) => {
    if (cancelBusy) return;
    if (!window.confirm('سيتم إلغاء هذا الطلب وتحرير المخزون. هل أنت متأكد؟')) return;
    setCancelBusy(order.id);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر إلغاء الطلب');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'ملغي', stockState: 'released' } : o));
    } catch (err) {
      alert(err.message || 'تعذّر إلغاء الطلب، حاول لاحقاً');
    } finally {
      setCancelBusy(null);
    }
  };

  // ── Address book ─────────────────────────────────────────────────────────
  const persistAddresses = async (list, idx) => {
    setAddrBusy(true);
    try {
      await saveCustomerAddresses(user.uid, list, idx);
      setAddresses(list);
      setDefaultIdx(idx);
    } catch (e) {
      console.error('save addresses failed', e);
      alert('تعذّر حفظ العنوان، حاول لاحقاً');
      throw e;
    } finally {
      setAddrBusy(false);
    }
  };

  const saveAddress = async () => {
    if (!addrDraft.fullName?.trim() || !addrDraft.city?.trim() || !addrDraft.street?.trim() || !addrDraft.phone1?.trim()) {
      alert('يرجى تعبئة الاسم والهاتف والمدينة والعنوان');
      return;
    }
    const list = [...addresses];
    let idx = defaultIdx;
    if (addrForm === 'new') { list.push(addrDraft); if (list.length === 1) idx = 0; }
    else list[addrForm] = addrDraft;
    try { await persistAddresses(list, idx); setAddrForm(null); setAddrDraft(EMPTY_ADDR); } catch {}
  };

  const deleteAddress = async (i) => {
    if (!window.confirm('حذف هذا العنوان؟')) return;
    const list = addresses.filter((_, j) => j !== i);
    let idx = defaultIdx;
    if (i === defaultIdx) idx = 0;
    else if (i < defaultIdx) idx = Math.max(0, defaultIdx - 1);
    try { await persistAddresses(list, idx); } catch {}
  };

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
              background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
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

          {/* ── Privacy: data export + deletion ─────────────────── */}
          <div style={{ ...styles.card, marginTop: '1.5rem' }}>
            <div style={{ padding: '1.5rem 2rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>الخصوصية وبياناتي</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>نزّلي نسخة من بياناتك أو اطلبي حذف حسابك.</div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={exportMyData} style={{ padding: '0.6rem 1.1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-pdf" /> تنزيل بياناتي (PDF)
                </button>
                <button onClick={deleteMyAccount} style={{ padding: '0.6rem 1.1rem', borderRadius: '10px', border: '1px solid #e0b4b4', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-trash-can" /> حذف الحساب
                </button>
              </div>
            </div>
          </div>

          {/* ── Address Book ────────────────────────────────────── */}
          <div style={{ ...styles.card, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent-color)' }} />
                عناويني
              </h2>
              {addrForm === null && (
                <button onClick={() => { setAddrForm('new'); setAddrDraft(EMPTY_ADDR); }}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', border: '1px solid var(--accent-color)', background: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-plus" /> إضافة عنوان
                </button>
              )}
            </div>

            <div style={{ padding: '1.5rem 2.5rem' }}>
              {/* Add/Edit form */}
              {addrForm !== null && (
                <div style={{ background: 'var(--bg-color)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1.2rem', marginBottom: addresses.length ? '1.2rem' : 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                    <input style={styles.input} placeholder="تسمية (المنزل، العمل…)" value={addrDraft.label} onChange={e => setAddrDraft(d => ({ ...d, label: e.target.value }))} />
                    <input style={styles.input} placeholder="الاسم الكامل *" value={addrDraft.fullName} onChange={e => setAddrDraft(d => ({ ...d, fullName: e.target.value }))} />
                    <input style={styles.input} placeholder="هاتف *" dir="ltr" value={addrDraft.phone1} onChange={e => setAddrDraft(d => ({ ...d, phone1: e.target.value }))} />
                    <input style={styles.input} placeholder="هاتف إضافي" dir="ltr" value={addrDraft.phone2} onChange={e => setAddrDraft(d => ({ ...d, phone2: e.target.value }))} />
                    <input style={styles.input} placeholder="المدينة *" value={addrDraft.city} onChange={e => setAddrDraft(d => ({ ...d, city: e.target.value }))} />
                    <input style={styles.input} placeholder="الحي / المنطقة" value={addrDraft.neighborhood} onChange={e => setAddrDraft(d => ({ ...d, neighborhood: e.target.value }))} />
                  </div>
                  <input style={styles.input} placeholder="الشارع ورقم المنزل *" value={addrDraft.street} onChange={e => setAddrDraft(d => ({ ...d, street: e.target.value }))} />
                  <input style={styles.input} placeholder="ملاحظات للمندوب (اختياري)" value={addrDraft.notes} onChange={e => setAddrDraft(d => ({ ...d, notes: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button onClick={saveAddress} disabled={addrBusy} className="btn-primary" style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', fontSize: '0.9rem', opacity: addrBusy ? 0.6 : 1 }}>
                      {addrBusy ? '...' : 'حفظ العنوان'}
                    </button>
                    <button onClick={() => { setAddrForm(null); setAddrDraft(EMPTY_ADDR); }} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', fontSize: '0.9rem', background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Saved list */}
              {addresses.length === 0 && addrForm === null ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-regular fa-map" style={{ fontSize: '1.8rem', color: 'var(--border-color)', marginBottom: '0.6rem', display: 'block' }} />
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>لا توجد عناوين محفوظة. أضيفي عنواناً ليُملأ تلقائياً عند الدفع.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {addresses.map((a, i) => (
                    <div key={i} style={{ border: `1.5px solid ${i === defaultIdx ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: '14px', padding: '1rem 1.2rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {a.label || a.fullName || 'عنوان'}
                          {i === defaultIdx && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-color)', background: 'var(--accent-soft, rgba(0,0,0,0.05))', border: '1px solid var(--accent-color)', borderRadius: '99px', padding: '1px 8px' }}>افتراضي</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
                          {a.fullName} · <span dir="ltr">{a.phone1}</span><br />
                          {[a.city, a.neighborhood, a.street].filter(Boolean).join('، ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        {i !== defaultIdx && (
                          <button onClick={() => persistAddresses(addresses, i)} disabled={addrBusy} title="تعيين كافتراضي" style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}>
                            <i className="fa-regular fa-star" />
                          </button>
                        )}
                        <button onClick={() => { setAddrForm(i); setAddrDraft({ ...EMPTY_ADDR, ...a }); }} disabled={addrBusy} title="تعديل" style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}>
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button onClick={() => deleteAddress(i)} disabled={addrBusy} title="حذف" style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid #e0b4b4', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '0.78rem' }}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                              {new Date(order.date?.toDate ? order.date.toDate() : (order.date || order.createdAt)).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                              ₪{(Number(order.total) || 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Cancel — only while still processing (stock reserved) */}
                          {isCancellable(order) && (
                            <div style={{ marginTop: '0.9rem' }}>
                              <button onClick={() => cancelOrder(order)} disabled={cancelBusy === order.id}
                                style={{ padding: '0.45rem 1rem', borderRadius: '99px', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: '1px solid #e0b4b4', color: '#c0392b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: cancelBusy === order.id ? 0.6 : 1 }}>
                                <i className={`fa-solid ${cancelBusy === order.id ? 'fa-circle-notch fa-spin' : 'fa-circle-xmark'}`} />
                                {cancelBusy === order.id ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                              </button>
                            </div>
                          )}

                          {/* Tax invoice / receipt — available once issued (paid or delivered) */}
                          {(order.invoiceNumber || order.paymentStatus === 'paid' || order.status === 'تم التوصيل') && (
                            <div style={{ marginTop: '0.9rem' }}>
                              <a href={`/invoice/${order.id}`} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '0.45rem 1rem', borderRadius: '99px', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                                <i className="fa-solid fa-file-invoice" /> חשבונית / קبלة (فاتورة)
                              </a>
                            </div>
                          )}

                          {/* Returns self-service — only for delivered orders */}
                          {order.status === 'تم التوصيل' && (
                            <div style={{ marginTop: '0.9rem' }}>
                              {returnsByOrder[order.id] ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa-solid fa-rotate-left" style={{ color: '#a21caf' }} />
                                  طلب إرجاع: <strong style={{ color: 'var(--text-primary)' }}>{RETURN_STATUS_AR[returnsByOrder[order.id].status] || returnsByOrder[order.id].status}</strong>
                                </div>
                              ) : returnFor === order.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--surface-color)', padding: '0.9rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>سبب الإرجاع</label>
                                  <textarea
                                    value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
                                    placeholder="مثال: المقاس غير مناسب / المنتج به عيب…" rows={3}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.88rem', resize: 'vertical' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => submitReturn(order)} disabled={returnBusy || !returnReason.trim()} className="btn-primary" style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', opacity: (returnBusy || !returnReason.trim()) ? 0.6 : 1 }}>
                                      {returnBusy ? '...' : 'إرسال طلب الإرجاع'}
                                    </button>
                                    <button onClick={() => { setReturnFor(null); setReturnReason(''); }} style={{ padding: '0.5rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                      إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => { setReturnFor(order.id); setReturnReason(''); }}
                                  style={{ padding: '0.45rem 1rem', borderRadius: '99px', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa-solid fa-rotate-left" /> طلب إرجاع / استرداد
                                </button>
                              )}
                            </div>
                          )}
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
                background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
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
