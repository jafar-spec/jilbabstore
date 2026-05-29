import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'מדיניות פרטיות | متجر جلباب',
  description: 'מדיניות הפרטיות של החנות.',
}

export default function PrivacyPolicy() {
  return (
    <main>
      
      <div style={{ paddingTop: '100px', minHeight: '60vh', maxWidth: '800px', margin: '0 auto', padding: '120px 20px 40px', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold' }}>מדיניות פרטיות</h1>
        
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '15px', border: '1px solid var(--glass-border)' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. איסוף מידע</h2>
            <p>אנו אוספים מידע אישי בעת ביצוע רכישה באתר, כגון: שם, כתובת, מספר טלפון וכתובת דוא"ל. המידע משמש לצורך טיפול בהזמנה ומשלוח בלבד.</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. אבטחת מידע</h2>
            <p>האתר שלנו מאובטח ברמה הגבוהה ביותר. פרטי התשלום וכרטיסי האשראי אינם נשמרים בשרתים שלנו, אלא מעובדים ישירות ובאופן מוצפן על ידי חברת <strong>CreditGuard</strong>, העומדת בתקני האבטחה המחמירים ביותר (PCI DSS).</p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. שימוש במידע</h2>
            <p>המידע האישי שלך לא יועבר לשום צד שלישי, למעט חברת השליחויות לצורך אספקת ההזמנה. אם אישרת זאת בעת ההרשמה, ייתכן שניצור איתך קשר לעדכונים על קולקציות חדשות ומבצעים.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. זכויות המשתמש</h2>
            <p>הנך זכאי/ת לבקש לעיין במידע האישי שנאסף אודותיך, ולבקש לתקן או למחוק אותו מהמאגר שלנו בכל עת באמצעות פנייה לשירות הלקוחות.</p>
          </section>
        </div>
      </div>
      
    </main>
  );
}
